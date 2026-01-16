import * as vscode from 'vscode'

export type TerminalInfo = {
  id: string
  command: string
  exitCode: number | null
}

type ReadResult = {
  lines: string[]
  exitCode: number | null
}

const AI_PREFIX = 'AI: '
const MAX_NAME_LEN = 30
const DEFAULT_LIMIT = 100
const DEFAULT_TAIL = 5

const buffers = new Map<string, string[]>()

const findTerminal = (id: string): vscode.Terminal | undefined =>
  vscode.window.terminals.find(t => t.name == id || t.name == `${AI_PREFIX}${id}`)

export const list = (): TerminalInfo[] =>
  vscode.window.terminals.map(t => ({
    id: t.name,
    command: t.name.startsWith(AI_PREFIX) ? t.name.slice(AI_PREFIX.length) : t.name,
    exitCode: t.exitStatus?.code ?? null
  }))

export const start = async (params: { command: string; cwd?: string }): Promise<string> => {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd()
  const cwd = params.cwd || root
  const name = `${AI_PREFIX}${params.command.slice(0, MAX_NAME_LEN)}`

  const terminal = vscode.window.createTerminal({ name, cwd })
  terminal.show()
  terminal.sendText(params.command)

  buffers.set(name, [])

  if (terminal.shellIntegration) {
    const disposable = vscode.window.onDidStartTerminalShellExecution(event => {
      if (event.terminal.name !== name) return
      ;(async () => {
        const stream = event.execution.read()
        for await (const chunk of stream) {
          const buf = buffers.get(name) || []
          buf.push(chunk)
          buffers.set(name, buf)
        }
      })()
      disposable.dispose()
    })
  }

  return name
}

export const read = async (params: { id: string; offset?: number; limit?: number }): Promise<ReadResult> => {
  const terminal = findTerminal(params.id)
  if (!terminal) throw new Error(`Terminal "${params.id}" not found`)

  let allLines: string[]
  const buf = buffers.get(terminal.name)
  
  if (buf) {
    allLines = buf.join('').split('\n')
  } else {
    terminal.show()
    await vscode.commands.executeCommand('workbench.action.terminal.selectAll')
    await vscode.commands.executeCommand('workbench.action.terminal.copySelection')
    await vscode.commands.executeCommand('workbench.action.terminal.clearSelection')
    const text = await vscode.env.clipboard.readText()
    allLines = text.split('\n')
  }

  const limit = params.limit ?? DEFAULT_LIMIT
  const offset = params.offset ?? Math.max(0, allLines.length - DEFAULT_TAIL)
  const lines = allLines.slice(offset, offset + limit)

  return { lines, exitCode: terminal.exitStatus?.code ?? null }
}

export const write = (params: { id: string; command: string }) => {
  const terminal = findTerminal(params.id)
  if (!terminal) throw new Error(`Terminal "${params.id}" not found`)
  terminal.sendText(params.command, false)
}

export const stop = (params: { id: string }) => {
  const terminal = findTerminal(params.id)
  if (!terminal) throw new Error(`Terminal "${params.id}" not found`)
  buffers.delete(terminal.name)
  terminal.dispose()
}
