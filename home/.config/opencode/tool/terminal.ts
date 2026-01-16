import { tool } from '@opencode-ai/plugin'
import { vscode, Window } from '../utils/vscode-socket'

type Terminal = { id: string; command: string; exitCode: number | null }
type ReadResult = { lines: string[]; exitCode: number | null }

const DEFAULT_TAIL = 5

const findByTerminalId = async (id: string): Promise<Window | null> => {
  const results = await vscode.all<Terminal[]>('terminal/list')
  return results.find(r => r.result.some(t => t.id == id))?.window ?? null
}

const findByCwd = async (cwd?: string): Promise<Window | null> => {
  const target = cwd || process.env.PWD || process.cwd()
  return vscode.find(w => target.startsWith(w.path))
}

const formatLines = (lines: string[], start: number): string =>
  lines.map((line, i) => `${start + i}| ${line}`).join('\n')

const formatPreview = (lines: string[], tail = DEFAULT_TAIL): string => {
  if (!lines.length) return ''
  const first = `1| ${lines[0]}`
  if (lines.length <= tail + 1) return first
  const tailLines = lines.slice(-tail).map((l, i) => `${lines.length - tail + i + 1}| ${l}`)
  return `${first}\n...\n${tailLines.join('\n')}`
}

const statusText = (exitCode: number | null) => (exitCode == null ? 'running' : `exited (${exitCode})`)

const formatOutput = (
  id: string,
  lines: string[],
  exitCode: number | null,
  opts: { offset?: number; limit?: number }
): string => {
  const total = lines.length
  const formatted = opts.offset || opts.limit ? formatLines(lines, opts.offset || 1) : formatPreview(lines)

  const endReached = opts.offset && opts.limit && opts.offset - 1 + opts.limit >= total
  const suffix = endReached ? ' (end reached)' : ''

  let out = `ID: ${id}\nStatus: ${statusText(exitCode)}\nTotal lines: ${total}${suffix}\n\n${formatted}`
  if (exitCode != null) out += '\n\n(Process exited)'
  return out
}

const formatGroups = (results: { window: Window; result: Terminal[] }[]): string =>
  results
    .filter(r => r.result.length)
    .map(r => {
      const header = `## ${r.window.name || r.window.path}`
      const terms = r.result
        .map(t => `id: ${t.id}\nstatus: ${statusText(t.exitCode)}\ncommand: ${t.command.split('\n')[0]}`)
        .join('\n\n')
      return `${header}\n${terms}`
    })
    .join('\n\n')

async function getDescription(): Promise<string> {
  const base = `Async terminal for interactive/long-running commands (bun run dev, docker-compose, sudo, ssh).
User can interactively control it. Default cwd is current directory.

Actions:
- Launch: provide command (optionally cwd) → returns terminal id
- Read output: provide id (optionally offset/limit, 1-based)
- Send input: provide id + command → writes to stdin (\\x03 for Ctrl+C)
- List terminals: action='list' (shows all windows)
- Kill: action='kill' + id

Tips: Reuse existing terminal sessions when possible.`

  try {
    const results = await vscode.all<Terminal[]>('terminal/list')
    const groups = formatGroups(results)
    return groups ? `${base}\n\n<open-terminals>\n${groups}\n</open-terminals>` : base
  } catch {
    return base
  }
}

export default tool({
  description: getDescription,

  args: {
    id: tool.schema.string().optional().describe('Terminal ID'),
    command: tool.schema.string().optional().describe('Command to launch OR input to send'),
    action: tool.schema.enum(['list', 'kill', 'write', 'read']).optional(),
    offset: tool.schema.number().optional().describe('Line offset (1-based)'),
    limit: tool.schema.number().optional().describe('Max lines to read'),
    cwd: tool.schema.string().optional()
  },

  async execute(args) {
    const { id, command, action, offset, limit, cwd } = args

    try {
      if (action == 'list') {
        const results = await vscode.all<Terminal[]>('terminal/list')
        if (!results.length) return 'No VSCode windows'
        return formatGroups(results) || 'No terminals'
      }

      if (action == 'kill') {
        if (!id) return 'kill requires id'
        const win = await findByTerminalId(id)
        if (!win) return 'Terminal not found'
        await win.rpc('terminal/stop', { id })
        return `Closed ${id}`
      }

      if (id) {
        const win = await findByTerminalId(id)
        if (!win) return 'Terminal not found'

        if (command) {
          await win.rpc('terminal/write', { id, command })
          await Bun.sleep(100)
        }

        const zeroOffset = offset ? offset - 1 : undefined
        const result = await win.rpc<ReadResult>('terminal/read', { id, offset: zeroOffset, limit })
        return formatOutput(id, result.lines, result.exitCode, { offset, limit })
      }

      if (command) {
        const win = (await findByCwd(cwd)) ?? (await vscode.windows())[0]
        if (!win) return 'No VSCode window found'

        const newId = await win.rpc<string>('terminal/start', { command, cwd })
        await Bun.sleep(200)

        const result = await win.rpc<ReadResult>('terminal/read', { id: newId })
        return formatOutput(newId, result.lines, result.exitCode, {})
      }

      return 'Provide command to launch or id to read'
    } catch (err: any) {
      return err.message
    }
  }
})
