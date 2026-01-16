import { createHash } from 'crypto'
import * as vscode from 'vscode'
import { type Request, type Response, SocketServer } from './server'
import * as terminal from './terminal'
import * as search from './search'
import { getDiagnostics, type GetDiagnosticsParams } from './diagnostics'

const SOCK_PREFIX = 'vscode-ai-'
const SOCK_SUFFIX = '.sock'

const getSocketPath = (root: string) => {
  const hash = createHash('sha256').update(root).digest('hex').slice(0, 8)
  return `/tmp/${SOCK_PREFIX}${hash}${SOCK_SUFFIX}`
}

const getRelativePath = (uri: vscode.Uri): string | undefined => {
  if (uri.scheme === 'git') {
    try {
      const { path } = JSON.parse(uri.query)
      if (path) return vscode.workspace.asRelativePath(path)
    } catch {}
    const match = uri.query.match(/path=([^&]+)/)
    if (match) return vscode.workspace.asRelativePath(decodeURIComponent(match[1]))
    return vscode.workspace.asRelativePath(uri.path)
  }
  return vscode.workspace.asRelativePath(uri)
}

const mentionFile = () => {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  const { document, selection } = editor
  const relativePath = getRelativePath(document.uri)
  if (!relativePath) return

  const startLine = selection.start.line + 1
  const endLine = selection.end.line + 1
  const lineRef = selection.isEmpty ? '' : startLine == endLine ? `#L${startLine}` : `#L${startLine}-${endLine}`

  const term = vscode.window.activeTerminal || vscode.window.createTerminal()
  term.sendText(`@${relativePath}${lineRef}`, false)
  term.show()
}

const handle = async (req: Request): Promise<Response> => {
  const { id, method, params } = req
  try {
    if (method == 'search') return { id, result: await search.search(params as search.SearchParams) }
    if (method == 'rename') return { id, result: await search.rename(params as search.RenameParams) }
    if (method == 'workspaceSymbols') return { id, result: await search.workspaceSymbols(params as { query: string }) }
    if (method == 'documentSymbols') return { id, result: await search.documentSymbols(params as { path: string }) }
    if (method == 'getDiagnostics') return { id, result: await getDiagnostics(params as GetDiagnosticsParams) }

    if (method == 'workspace/info') {
      const root = vscode.workspace.workspaceFolders?.[0]
      return { id, result: { path: root?.uri.fsPath || '', name: root?.name || '' } }
    }

    if (method == 'terminal/start') return { id, result: await terminal.start(params as any) }
    if (method == 'terminal/read') return { id, result: await terminal.read(params as any) }
    if (method == 'terminal/write') return { id, result: terminal.write(params as any) }
    if (method == 'terminal/stop') return { id, result: terminal.stop(params as any) }
    if (method == 'terminal/list') return { id, result: terminal.list() }

    return { id, error: { code: 404, message: `Unknown method: ${method}` } }
  } catch (e: any) {
    return { id, error: { code: 500, message: e.message } }
  }
}

let server: SocketServer | null = null

const updateServer = async (output: vscode.OutputChannel) => {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!root) {
    if (server) {
      output.appendLine('Workspace closed, stopping server')
      server.cleanup()
      server = null
    }
    return
  }

  const socketPath = getSocketPath(root)
  if (server?.getPath() == socketPath) return

  if (server) {
    output.appendLine('Workspace changed, restarting server')
    server.cleanup()
  }

  server = new SocketServer(handle)
  try {
    await server.start(socketPath)
    output.appendLine(`vscode-ai: ${server.getPath()}`)
    output.appendLine(`Root: ${root}`)
  } catch (e: any) {
    output.appendLine(`Socket failed: ${e.message}`)
    server = null
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('VSCode AI')
  context.subscriptions.push(vscode.commands.registerCommand('vscode-ai.mentionFile', mentionFile))

  await updateServer(output)

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => updateServer(output)),
    { dispose: () => server?.cleanup() }
  )
}

export function deactivate() {
  server?.cleanup()
}
