import { tool } from '@opencode-ai/plugin'

const SOCKET_PATH = '/tmp/vscode-ai.sock'
const TIMEOUT_MS = 5000

type Location = { path: string; line: number; character: number }
type SymbolInfo = { name: string; kind: string; path: string; line: number; character: number }
type HoverResult = { contents: string }
type DiagnosticFile = {
  uri: string
  diagnostics: {
    range: { start: { line: number; character: number } }
    message: string
    severity: string
    source?: string
  }[]
}

type RpcResult = {
  locations?: Location[]
  symbols?: SymbolInfo[]
  hover?: HoverResult
  files?: DiagnosticFile[]
}

type RpcResponse = {
  id: string
  result?: RpcResult
  error?: { code: number; message: string }
}

async function rpc(method: string, params?: Record<string, unknown>): Promise<RpcResult> {
  const id = crypto.randomUUID()
  const request = JSON.stringify({ id, method, params }) + '\n'

  return new Promise((resolve, reject) => {
    let buffer = ''
    let settled = false
    let socket: Awaited<ReturnType<typeof Bun.connect>> | null = null

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      socket?.end()
      reject(new Error('VSCode socket timeout'))
    }, TIMEOUT_MS)

    const settle = (fn: () => void) => {
      if (settled) return
      clearTimeout(timeout)
      settled = true
      socket?.end()
      fn()
    }

    Bun.connect({
      unix: SOCKET_PATH,
      socket: {
        open(s) {
          socket = s
          s.write(request)
        },
        data(s, data) {
          buffer += data.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const response: RpcResponse = JSON.parse(line)
              if (response.id !== id) continue

              settle(() => {
                if (response.error) reject(new Error(response.error.message))
                else resolve(response.result || {})
              })
            } catch {}
          }
        },
        error(_, error) {
          settle(() => reject(error))
        },
        close() {
          settle(() => reject(new Error('VSCode socket closed')))
        },
        connectError(_, error) {
          settle(() => reject(error))
        }
      }
    }).catch(error => settle(() => reject(error)))
  })
}

const resolvePath = (p: string): string => (p.startsWith('/') ? p : `${process.cwd()}/${p}`)

const formatLocation = (loc: Location): string => `${loc.path}:${loc.line}:${loc.character}`

const formatSymbol = (sym: SymbolInfo): string =>
  `${sym.kind.padEnd(12)} ${sym.name.padEnd(30)} ${sym.path}:${sym.line}`

export default tool({
  description: `Unified LSP interface via VSCode.

Actions:
- definition: Find where a symbol is defined (also includes references)
- hover: Get type info and documentation
- symbols: Search symbols (query=workspace, path=document)
- diagnostics: Real-time errors and warnings. Run this after all file edits done.

Navigation (definition/hover) requires: path, line, character
Symbols: use query for workspace search, path for document symbols
Diagnostics: optionally filter by path and severities`,
  args: {
    action: tool.schema.enum(['definition', 'hover', 'symbols', 'diagnostics']).describe('LSP action to perform'),
    path: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe('File path(s) - required for navigation, optional for symbols/diagnostics'),
    query: tool.schema.string().optional().describe('Symbol name for workspace search'),
    line: tool.schema.number().optional().describe('1-based line number'),
    character: tool.schema.number().optional().describe('1-based character position'),
    severities: tool.schema
      .array(tool.schema.enum(['error', 'warning', 'info', 'hint']))
      .optional()
      .describe('Filter diagnostics by severity')
  },
  async execute(args) {
    const { action, query, line, character, severities } = args

    const paths = args.path?.map(resolvePath)

    try {
      if (action == 'diagnostics') {
        const result = await rpc('getDiagnostics', { filePaths: paths, severities })
        if (!result.files?.length) return 'No diagnostics'

        return result.files
          .map(f => {
            const diags = f.diagnostics
              .map(d => {
                const l = d.range.start.line + 1
                const c = d.range.start.character + 1
                const sev = d.severity.toUpperCase()
                const src = d.source ? ` (${d.source})` : ''
                return `  ${sev} [${l}:${c}]${src} ${d.message}`
              })
              .join('\n')
            return `${f.uri}:\n${diags}`
          })
          .join('\n\n')
      }

      if (action == 'symbols') {
        if (query) {
          const result = await rpc('workspaceSymbols', { query })
          if (!result.symbols?.length) return 'No symbols found'
          return result.symbols.map(formatSymbol).join('\n')
        }
        if (paths?.length) {
          const result = await rpc('documentSymbols', { path: paths[0] })
          if (!result.symbols?.length) return 'No symbols found'
          return result.symbols.map(formatSymbol).join('\n')
        }
        return 'symbols requires either query or path'
      }

      if (!paths?.length || !line || !character) {
        return `${action} requires path, line, and character`
      }

      const position = { path: paths[0], line: line - 1, character: character - 1 }

      if (action == 'hover') {
        const result = await rpc('hover', position)
        return result.hover?.contents || 'No hover info'
      }

      if (action == 'definition') {
        let result = await rpc('definition', position)

        // fallback to implementation if no definition
        if (!result.locations?.length) {
          result = await rpc('implementation', position)
        }
        if (!result.locations?.length) return 'No definition found'

        const definitions = result.locations.map(formatLocation).join('\n')

        // also get references
        const refs = await rpc('references', position)
        if (!refs.locations?.length) return `Definition:\n${definitions}`

        const references = refs.locations.map(formatLocation).join('\n')
        return `Definition:\n${definitions}\n\nReferences:\n${references}`
      }

      return 'Unknown action'
    } catch (error: any) {
      return `VSCode extension error: ${error.message}`
    }
  }
})
