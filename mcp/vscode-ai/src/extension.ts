import { existsSync, unlinkSync } from "fs"
import { createServer, Server, Socket } from "net"
import { join } from "path"
import * as vscode from "vscode"

const SOCKET_PATH = "/tmp/vscode-ai.sock"
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

type Position = {
  path: string
  line: number
  character: number
}

type Location = {
  path: string
  line: number
  character: number
}

type SymbolInfo = {
  name: string
  kind: string
  path: string
  line: number
  character: number
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

const SYMBOL_KINDS: Record<number, string> = {
  1: "File",
  2: "Module",
  3: "Namespace",
  4: "Package",
  5: "Class",
  6: "Method",
  7: "Property",
  8: "Field",
  9: "Constructor",
  10: "Enum",
  11: "Interface",
  12: "Function",
  13: "Variable",
  14: "Constant",
  15: "String",
  16: "Number",
  17: "Boolean",
  18: "Array",
  19: "Object",
  20: "Key",
  21: "Null",
  22: "EnumMember",
  23: "Struct",
  24: "Event",
  25: "Operator",
  26: "TypeParameter",
}

const resolvePath = (p: string): string => {
  if (p.startsWith("/")) return p
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ""
  return join(root, p)
}

const withPosition = async <T>(
  params: Position,
  fn: (uri: vscode.Uri, pos: vscode.Position) => Promise<T>
): Promise<T> => {
  const uri = vscode.Uri.file(resolvePath(params.path))
  const doc = await vscode.workspace.openTextDocument(uri)
  const pos = new vscode.Position(Math.min(params.line, doc.lineCount - 1), params.character)
  return fn(uri, pos)
}

const normalizeLocations = (results: (vscode.Location | vscode.LocationLink)[] | null): Location[] =>
  (results || []).map((r) =>
    "targetUri" in r
      ? { path: r.targetUri.fsPath, line: r.targetRange.start.line + 1, character: r.targetRange.start.character + 1 }
      : { path: r.uri.fsPath, line: r.range.start.line + 1, character: r.range.start.character + 1 }
  )

const getDefinition = (params: Position) =>
  withPosition(params, async (uri, pos) => ({
    locations: normalizeLocations(
      await vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>("vscode.executeDefinitionProvider", uri, pos)
    ),
  }))

const getImplementation = (params: Position) =>
  withPosition(params, async (uri, pos) => ({
    locations: normalizeLocations(
      await vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>("vscode.executeImplementationProvider", uri, pos)
    ),
  }))

const getReferences = (params: Position) =>
  withPosition(params, async (uri, pos) => ({
    locations: normalizeLocations(
      await vscode.commands.executeCommand<vscode.Location[]>("vscode.executeReferenceProvider", uri, pos)
    ),
  }))

const getHover = (params: Position) =>
  withPosition(params, async (uri, pos) => {
    const results = await vscode.commands.executeCommand<vscode.Hover[]>("vscode.executeHoverProvider", uri, pos)
    const contents = (results || [])
      .flatMap((h) => h.contents)
      .map((c) => (typeof c == "string" ? c : c.value))
      .join("\n\n")
    return { hover: { contents } }
  })

const flattenSymbols = (symbols: vscode.DocumentSymbol[], path: string): SymbolInfo[] => {
  const result: SymbolInfo[] = []
  const walk = (syms: vscode.DocumentSymbol[]) => {
    for (const s of syms) {
      result.push({
        name: s.name,
        kind: SYMBOL_KINDS[s.kind] || "Unknown",
        path,
        line: s.range.start.line + 1,
        character: s.range.start.character + 1,
      })
      if (s.children) walk(s.children)
    }
  }
  walk(symbols)
  return result
}

const getDocumentSymbols = async (params: { path: string }): Promise<{ symbols: SymbolInfo[] }> => {
  const uri = vscode.Uri.file(resolvePath(params.path))
  await vscode.workspace.openTextDocument(uri)
  const results = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>("vscode.executeDocumentSymbolProvider", uri)
  return { symbols: flattenSymbols(results || [], uri.fsPath) }
}

const getWorkspaceSymbols = async (params: { query: string }): Promise<{ symbols: SymbolInfo[] }> => {
  const results = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
    "vscode.executeWorkspaceSymbolProvider",
    params.query
  )
  return {
    symbols: (results || []).map((s) => ({
      name: s.name,
      kind: SYMBOL_KINDS[s.kind] || "Unknown",
      path: s.location.uri.fsPath,
      line: s.location.range.start.line + 1,
      character: s.location.range.start.character + 1,
    })),
  }
}

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
          this.handle(req).then((res) => socket.write(JSON.stringify(res) + "\n"))
        } catch (e: any) {
          socket.write(JSON.stringify({ id: "unknown", error: { code: 500, message: e.message } }) + "\n")
        }
      }
    })
  }

  private async handle(req: Request): Promise<Response> {
    const { id, method, params } = req
    try {
      if (method == "getDiagnostics") return { id, result: getDiagnostics(params as GetDiagnosticsParams) }
      if (method == "definition") return { id, result: await getDefinition(params as Position) }
      if (method == "implementation") return { id, result: await getImplementation(params as Position) }
      if (method == "references") return { id, result: await getReferences(params as Position) }
      if (method == "hover") return { id, result: await getHover(params as Position) }
      if (method == "documentSymbols") return { id, result: await getDocumentSymbols(params as { path: string }) }
      if (method == "workspaceSymbols") return { id, result: await getWorkspaceSymbols(params as { query: string }) }
      return { id, error: { code: 404, message: `Unknown method: ${method}` } }
    } catch (e: any) {
      return { id, error: { code: 500, message: e.message } }
    }
  }

  cleanup() {
    this.server?.close()
    if (existsSync(SOCKET_PATH)) unlinkSync(SOCKET_PATH)
  }
}

const getRelativePath = (uri: vscode.Uri): string | undefined => {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
  if (workspaceFolder) return vscode.workspace.asRelativePath(uri)

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (workspaceRoot && uri.fsPath.startsWith(workspaceRoot)) {
    return uri.fsPath.slice(workspaceRoot.length + 1)
  }

  if (uri.scheme == "git") {
    const match = uri.query.match(/path=([^&]+)/)
    if (match) return decodeURIComponent(match[1])
  }

  return undefined
}

const mentionFile = () => {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  const { document, selection } = editor
  const relativePath = getRelativePath(document.uri)
  if (!relativePath) return

  const startLine = selection.start.line + 1
  const endLine = selection.end.line + 1
  const lineRef = selection.isEmpty ? "" : startLine == endLine ? `#L${startLine}` : `#L${startLine}-${endLine}`

  const terminal = vscode.window.activeTerminal || vscode.window.createTerminal()
  terminal.sendText(`@${relativePath}${lineRef}`, false)
  terminal.show()
}

let server: SocketServer | null = null
const output = vscode.window.createOutputChannel("VSCode AI")

export async function activate(context: vscode.ExtensionContext) {
  server = new SocketServer()
  try {
    await server.start()
    output.appendLine(`vscode-ai: ${SOCKET_PATH}`)
  } catch (e: any) {
    output.appendLine(`Socket failed: ${e.message}`)
  }

  context.subscriptions.push(
    { dispose: () => server?.cleanup() },
    vscode.commands.registerCommand("vscode-ai.mentionFile", mentionFile)
  )
}

export function deactivate() {
  server?.cleanup()
}
