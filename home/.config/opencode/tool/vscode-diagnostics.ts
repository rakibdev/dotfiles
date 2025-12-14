import { tool } from '@opencode-ai/plugin'

const SOCKET_PATH = '/tmp/vscode-mcp.sock'
const TIMEOUT_MS = 3000

type RpcResponse = {
  id: string
  result?: {
    files: {
      uri: string
      diagnostics: {
        range: { start: { line: number; character: number } }
        message: string
        severity: string
        source?: string
      }[]
    }[]
  }
  error?: { code: number; message: string }
}

async function rpc<T>(method: string, params?: Record<string, unknown>): Promise<T> {
  const id = crypto.randomUUID()
  const request = JSON.stringify({ id, method, params }) + '\n'

  return new Promise((resolve, reject) => {
    let buffer = ''
    let settled = false
    let socketRef: ReturnType<typeof Bun.connect> extends Promise<infer T> ? T : never

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      socketRef?.end()
      reject(new Error('VSCode socket timeout'))
    }, TIMEOUT_MS)

    Bun.connect({
      unix: SOCKET_PATH,
      socket: {
        open(socket) {
          socketRef = socket as any
          socket.write(request)
        },
        data(socket, data) {
          buffer += data.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const response: RpcResponse = JSON.parse(line)
              if (response.id !== id) continue

              clearTimeout(timeout)
              settled = true
              socket.end()

              if (response.error) {
                reject(new Error(response.error.message))
              } else {
                resolve(response.result as T)
              }
            } catch {}
          }
        },
        error(_socket, error) {
          if (settled) return
          clearTimeout(timeout)
          settled = true
          reject(error)
        },
        close() {
          if (settled) return
          clearTimeout(timeout)
          settled = true
          reject(new Error('VSCode socket closed'))
        },
        connectError(_socket, error) {
          if (settled) return
          clearTimeout(timeout)
          settled = true
          reject(error)
        }
      }
    }).catch(error => {
      if (settled) return
      clearTimeout(timeout)
      settled = true
      reject(error)
    })
  })
}

export default tool({
  description: [
    "Get real-time diagnostics from VSCode's running LSP servers.",
    'Requires the OpenCode VSCode extension to be running. Returns TypeScript, and other language errors instantly without compilation.',
    'Always call as final step when changed imports/exports/function params/types.'
  ].join('\n'),
  args: {
    filePaths: tool.schema.array(tool.schema.string()).optional().describe('Relative or absolute path'),
    severities: tool.schema.array(tool.schema.enum(['error', 'warning', 'info', 'hint'])).optional()
  },
  async execute(args) {
    try {
      const result = await rpc<RpcResponse['result']>('getDiagnostics', {
        filePaths: args.filePaths,
        severities: args.severities
      })

      if (!result?.files?.length) {
        return 'No errors'
      }

      return result.files
        .map(f => {
          const diags = f.diagnostics
            .map(d => {
              const line = d.range.start.line + 1
              const col = d.range.start.character + 1
              const sev = d.severity.toUpperCase()
              const source = d.source ? ` (${d.source})` : ''
              return `  ${sev} [${line}:${col}]${source} ${d.message}`
            })
            .join('\n')
          return `${f.uri}:\n${diags}`
        })
        .join('\n\n')
    } catch (error: any) {
      return `VSCode extension not running: ${error.message}`
    }
  }
})
