import { existsSync, unlinkSync } from "fs"
import { createServer, Server, Socket } from "net"
import { join } from "path"
import * as vscode from "vscode"

const SOCKET_PATH = "/tmp/opencode-mcp.sock"
const SEVERITY_MAP = ["error", "warning", "info", "hint"] as const

type Severity = (typeof SEVERITY_MAP)[number]

type Diagnostic = {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  message: string
  severity: Severity
  source?: string
  code?: string | number
}

type FileDiagnostic = {
  uri: string
  diagnostics: Diagnostic[]
}

type GetDiagnosticsParams = {
  filePaths?: string[]
  sources?: string[]
  severities?: Severity[]
}

type Request = {
  id: string
  method: string
  params?: Record<string, unknown>
}

type Response = {
  id: string
  result?: unknown
  error?: { code: number; message: string }
}

const getDiagnostics = (params: GetDiagnosticsParams): { files: FileDiagnostic[] } => {
  const { filePaths = [], sources = [], severities = [] } = params
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

  let targetUris: vscode.Uri[]
  if (filePaths.length) {
    targetUris = filePaths.map((p) =>
      p.startsWith("/") ? vscode.Uri.file(p) : vscode.Uri.file(join(workspaceRoot || "", p))
    )
  } else {
    targetUris = vscode.languages.getDiagnostics().map(([uri]) => uri)
  }

  const files: FileDiagnostic[] = []
  for (const uri of targetUris) {
    const allDiags = vscode.languages.getDiagnostics(uri)
    const filtered = allDiags.filter((d) => {
      const sevStr = SEVERITY_MAP[d.severity]
      if (severities.length && !severities.includes(sevStr)) return false
      if (sources.length && (!d.source || !sources.some((s) => d.source!.toLowerCase().includes(s.toLowerCase()))))
        return false
      return true
    })
    if (!filtered.length) continue
    files.push({
      uri: uri.fsPath,
      diagnostics: filtered.map((d) => ({
        range: {
          start: { line: d.range.start.line, character: d.range.start.character },
          end: { line: d.range.end.line, character: d.range.end.character },
        },
        message: d.message,
        severity: SEVERITY_MAP[d.severity],
        source: d.source,
        code: typeof d.code == "object" ? d.code.value : d.code,
      })),
    })
  }
  return { files }
}

const healthCheck = () => ({
  status: "ok",
  workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
})

class SocketServer {
  private server: Server | null = null

  start() {
    if (existsSync(SOCKET_PATH)) unlinkSync(SOCKET_PATH)

    return new Promise<void>((resolve, reject) => {
      this.server = createServer((socket) => this.onConnection(socket))
      this.server.on("error", reject)
      this.server.listen(SOCKET_PATH, resolve)
    })
  }

  private onConnection(socket: Socket) {
    let buffer = ""
    socket.on("data", (data) => {
      buffer += data.toString()
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const req: Request = JSON.parse(line)
          const res = this.handle(req)
          socket.write(JSON.stringify(res) + "\n")
        } catch (e: any) {
          socket.write(JSON.stringify({ id: "unknown", error: { code: 500, message: e.message } }) + "\n")
        }
      }
    })
  }

  private handle(req: Request): Response {
    const { id, method, params } = req
    try {
      switch (method) {
        case "health":
          return { id, result: healthCheck() }
        case "getDiagnostics":
          return { id, result: getDiagnostics(params as GetDiagnosticsParams) }
        default:
          return { id, error: { code: 404, message: `Unknown method: ${method}` } }
      }
    } catch (e: any) {
      return { id, error: { code: 500, message: e.message } }
    }
  }

  cleanup() {
    this.server?.close()
    if (existsSync(SOCKET_PATH)) unlinkSync(SOCKET_PATH)
  }
}

let server: SocketServer | null = null
const output = vscode.window.createOutputChannel("OpenCode MCP")

export async function activate(context: vscode.ExtensionContext) {
  server = new SocketServer()
  try {
    await server.start()
    output.appendLine(`MCP: ${SOCKET_PATH}`)
  } catch (e: any) {
    output.appendLine(`MCP failed: ${e.message}`)
  }

  context.subscriptions.push({ dispose: () => server?.cleanup() })
}

export function deactivate() {
  server?.cleanup()
}
