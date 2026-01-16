import { tool } from '@opencode-ai/plugin'
import { vscode, Window } from '../utils/vscode-socket'

type Range = { start: { line: number; character: number }; end: { line: number; character: number } }
type Location = { path: string; range: Range }
type SymbolInfo = { name: string; kind: string; path: string; line: number; character: number }

type SearchResult = {
  definition: Location[]
  implementation: Location[]
  references: Location[]
  hover: string
}

type RenameResult = { success: boolean; error?: string; files?: { path: string; changes: number }[] }

const resolvePath = (p: string): string => (p.startsWith('/') ? p : `${process.cwd()}/${p}`)

const getWindow = async (): Promise<Window> => {
  const cwd = process.env.PWD || process.cwd()
  const win = (await vscode.find(w => cwd.startsWith(w.path))) ?? (await vscode.windows())[0]
  if (!win) throw new Error('No VSCode window')
  return win
}

const readLines = async (path: string, start: number, end: number): Promise<string[]> => {
  try {
    const text = await Bun.file(path).text()
    return text.split('\n').slice(start, end + 1)
  } catch {
    return []
  }
}

const formatSnippet = async (loc: Location, fullBody = false): Promise<string> => {
  const start = loc.range.start.line
  const end = loc.range.end.line

  // For definitions (fullBody), use the actual range from LSP if it spans multiple lines.
  // Otherwise default to context of 3 lines.
  const from = fullBody ? start : Math.max(0, start - 1)
  const to = fullBody ? end : start + 1

  const lines = await readLines(loc.path, from, to)
  const rangeText = start == end ? `:${start + 1}` : `:${start + 1}-${end + 1}`

  if (!lines.length) return `File: ${loc.path}${rangeText}`
  return `File: ${loc.path}${rangeText}\n\`\`\`\n${lines.map((l, i) => `${from + i + 1}| ${l}`).join('\n')}\n\`\`\``
}

const dedup = (locs: Location[]): Location[] => {
  const seen = new Set<string>()
  return locs.filter(l => {
    const key = `${l.path}:${l.range.start.line}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const formatSearch = async (result: SearchResult): Promise<string> => {
  const parts: string[] = []

  if (result.hover) parts.push(`## Hover Info\n${result.hover}`)

  const defs = dedup([...result.definition, ...result.implementation])
  if (defs.length) {
    const snippets = await Promise.all(defs.map(l => formatSnippet(l, true)))
    parts.push(`## Definition${defs.length > 1 ? 's' : ''}\n${snippets.join('\n\n')}`)
  }

  const defKeys = new Set(defs.map(l => `${l.path}:${l.range.start.line}`))
  const refs = dedup(result.references).filter(l => !defKeys.has(`${l.path}:${l.range.start.line}`))
  if (refs.length) {
    const snippets = await Promise.all(refs.map(l => formatSnippet(l)))
    parts.push(`## References (${refs.length})\n${snippets.join('\n\n')}`)
  }

  return parts.length ? parts.join('\n\n') : 'No results'
}

export default tool({
  description: `LSP-powered code intelligence via VSCode. Use after Read tool to explore symbols you see in code.

**search**: Pass a symbol name you see in code → get type info, jump to definition, find all references.
**rename**: Safely rename symbol across entire codebase.

Params:
- \`symbol\`: Symbol name from code (e.g. "useState", "MyComponent")
- \`file\`: File where you saw the symbol. If omitted, searches workspace.
- \`line\`: Line number (from Read output). Only needed if symbol appears multiple times in file.

**Prefer over Grep**: When you need semantic understanding, type info, or symbol is too common for string matching.`,
  args: {
    action: tool.schema.enum(['search', 'rename']).describe('LSP action'),
    symbol: tool.schema.string().describe('Symbol name from code'),
    file: tool.schema.string().optional().describe('File path where symbol appears'),
    line: tool.schema.number().optional().describe('Line number to disambiguate'),
    newName: tool.schema.string().optional().describe('New name (rename only)')
  },
  async execute(args) {
    const { action, symbol, line, newName } = args
    const win = await getWindow()

    let file = args.file ? resolvePath(args.file) : undefined

    if (!file) {
      const result = await win.rpc<{ symbols: SymbolInfo[] }>('workspaceSymbols', { query: symbol })
      const match = result.symbols?.find(s => s.name == symbol) ?? result.symbols?.[0]
      if (!match) throw new Error(`Symbol "${symbol}" not found in workspace`)
      file = match.path
    }

    if (action == 'search') {
      const result = await win.rpc<SearchResult>('search', { path: file, symbol, line })
      return formatSearch(result)
    }

    if (action == 'rename') {
      if (!newName) throw new Error('rename requires newName')
      const result = await win.rpc<RenameResult>('rename', { path: file, symbol, line, newName })
      if (!result.success) throw new Error(result.error || 'Rename failed')
      return `Renamed in ${result.files?.length} files:\n${result.files
        ?.map(f => `  ${f.path} (${f.changes})`)
        .join('\n')}`
    }

    throw new Error('Unknown action')
  }
})
