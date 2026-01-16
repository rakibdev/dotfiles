import { join } from 'path'
import * as vscode from 'vscode'

const SEVERITY_MAP = ['error', 'warning', 'info', 'hint'] as const

type Severity = (typeof SEVERITY_MAP)[number]
type Range = { start: { line: number; character: number }; end: { line: number; character: number } }
type Diagnostic = { range: Range; message: string; severity: Severity; source?: string; code?: string | number }
type FileDiagnostic = { uri: string; diagnostics: Diagnostic[] }

export type GetDiagnosticsParams = { filePaths?: string[]; sources?: string[]; severities?: Severity[] }

const waitForDiagnostics = (uri: vscode.Uri, timeout = 5000): Promise<void> => {
  return new Promise(resolve => {
    const timer = setTimeout(() => { sub.dispose(); resolve() }, timeout)
    const sub = vscode.languages.onDidChangeDiagnostics(e => {
      if (e.uris.some(u => u.fsPath == uri.fsPath)) {
        clearTimeout(timer)
        sub.dispose()
        resolve()
      }
    })
  })
}

const ensureOpenWithDiagnostics = async (uri: vscode.Uri) => {
  const existing = vscode.workspace.textDocuments.find(d => d.uri.fsPath == uri.fsPath)
  if (existing) return

  try {
    const doc = await vscode.workspace.openTextDocument(uri)
    const diagnosticPromise = waitForDiagnostics(uri)
    await vscode.window.showTextDocument(doc, { preserveFocus: true, preview: true })
    await diagnosticPromise
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
  } catch {}
}

export const getDiagnostics = async (params: GetDiagnosticsParams): Promise<{ files: FileDiagnostic[] }> => {
  const { filePaths = [], sources = [], severities = [] } = params
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

  let uris: vscode.Uri[]
  if (filePaths.length) {
    uris = filePaths.map(p => vscode.Uri.file(p.startsWith('/') ? p : join(root || '', p)))
  } else {
    uris = vscode.languages.getDiagnostics().map(([uri]) => uri)
  }

  await Promise.all(uris.map(ensureOpenWithDiagnostics))

  const files: FileDiagnostic[] = []
  for (const uri of uris) {
    const all = vscode.languages.getDiagnostics(uri)
    const filtered = all.filter(d => {
      const sev = SEVERITY_MAP[d.severity]
      if (severities.length && !severities.includes(sev)) return false
      if (sources.length && (!d.source || !sources.some(s => d.source!.toLowerCase().includes(s.toLowerCase())))) return false
      return true
    })
    if (!filtered.length) continue
    files.push({
      uri: uri.fsPath,
      diagnostics: filtered.map(d => ({
        range: { start: { line: d.range.start.line, character: d.range.start.character }, end: { line: d.range.end.line, character: d.range.end.character } },
        message: d.message, severity: SEVERITY_MAP[d.severity], source: d.source,
        code: typeof d.code == 'object' ? d.code.value : d.code
      }))
    })
  }
  return { files }
}
