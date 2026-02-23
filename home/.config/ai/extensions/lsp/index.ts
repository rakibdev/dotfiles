import { defineExtension } from 'coder/api'
import type { AgentTool, AgentToolResult } from 'coder/api'
import { vscode } from '../utils/vscode-socket'

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

const resolvePath = (p: string, cwd: string) => (p.startsWith('/') ? p : `${cwd}/${p}`)

const getWindow = async (cwd: string) => {
  const win = (await vscode.find(w => cwd.startsWith(w.path))) ?? (await vscode.windows())[0]
  if (!win) throw new Error('No VSCode window')
  return win
}

const readLines = async (path: string, start: number, end: number) => {
  try {
    const text = await Bun.file(path).text()
    return text.split('\n').slice(start, end + 1)
  } catch {
    return []
  }
}

const formatSnippet = async (loc: Location, fullBody = false) => {
  const start = loc.range.start.line
  const end = loc.range.end.line
  const from = fullBody ? start : Math.max(0, start - 1)
  const to = fullBody ? end : start + 1
  const lines = await readLines(loc.path, from, to)
  const rangeText = start == end ? `:${start + 1}` : `:${start + 1}-${end + 1}`
  if (!lines.length) return `File: ${loc.path}${rangeText}`
  return `File: ${loc.path}${rangeText}\n\`\`\`\n${lines.map((l, i) => `${from + i + 1}| ${l}`).join('\n')}\n\`\`\``
}

const dedup = (locs: Location[]) => {
  const seen = new Set<string>()
  return locs.filter(l => {
    const key = `${l.path}:${l.range.start.line}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const formatSearch = async (result: SearchResult) => {
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

const schema = {
  type: 'object' as const,
  properties: {
    action: { type: 'string' as const, enum: ['search', 'rename'], description: 'LSP action' },
    symbol: { type: 'string' as const, description: 'Symbol name from code' },
    file: { type: 'string' as const, description: 'File path where symbol appears' },
    line: { type: 'number' as const, description: 'Line number to disambiguate' },
    newName: { type: 'string' as const, description: 'New name (rename only)' }
  },
  required: ['action', 'symbol'] as const
}

const lspTool: AgentTool<any> = {
  name: 'lsp',
  label: 'lsp',
  description: `LSP-powered code intelligence via VSCode. Use after Read tool to explore symbols you see in code.

**search**: Pass a symbol name you see in code → get type info, jump to definition, find all references.
**rename**: Safely rename symbol across entire codebase.

Params:
- \`symbol\`: Symbol name from code (e.g. "useState", "MyComponent")
- \`file\`: File where you saw the symbol. If omitted, searches workspace.
- \`line\`: Line number (from Read output). Only needed if symbol appears multiple times in file.

**Prefer over Grep**: When you need semantic understanding, type info, or symbol is too common for string matching.`,
  parameters: schema,
  execute: async (_id, args): Promise<AgentToolResult<any>> => {
    const cwd = process.env.PWD || process.cwd()
    const { action, symbol, line, newName } = args
    const win = await getWindow(cwd)

    let file = args.file ? resolvePath(args.file, cwd) : undefined

    if (!file) {
      const result = await win.rpc<{ symbols: SymbolInfo[] }>('workspaceSymbols', { query: symbol })
      const match = result.symbols?.find(s => s.name == symbol) ?? result.symbols?.[0]
      if (!match) throw new Error(`Symbol "${symbol}" not found in workspace`)
      file = match.path
    }

    if (action == 'search') {
      const result = await win.rpc<SearchResult>('search', { path: file, symbol, line })
      const text = await formatSearch(result)
      return { content: [{ type: 'text', text }], details: { symbol, file } }
    }

    if (action == 'rename') {
      if (!newName) throw new Error('rename requires newName')
      const result = await win.rpc<RenameResult>('rename', { path: file, symbol, line, newName })
      if (!result.success) throw new Error(result.error || 'Rename failed')
      const text = `Renamed in ${result.files?.length} files:\n${result.files?.map(f => `  ${f.path} (${f.changes})`).join('\n')}`
      return { content: [{ type: 'text', text }], details: result }
    }

    throw new Error('Unknown action')
  }
}

export default defineExtension(() => ({
  tools: [lspTool]
}))
