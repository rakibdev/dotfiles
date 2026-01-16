import { join } from 'path'
import * as vscode from 'vscode'

type Range = { start: { line: number; character: number }; end: { line: number; character: number } }
type Location = { path: string; range: Range }
type SymbolInfo = { name: string; kind: string; path: string; line: number; character: number }

export type SearchParams = { path: string; symbol: string; line?: number }
export type RenameParams = SearchParams & { newName: string }

const SYMBOL_KINDS: Record<number, string> = {
  1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package', 5: 'Class',
  6: 'Method', 7: 'Property', 8: 'Field', 9: 'Constructor', 10: 'Enum',
  11: 'Interface', 12: 'Function', 13: 'Variable', 14: 'Constant', 15: 'String',
  16: 'Number', 17: 'Boolean', 18: 'Array', 19: 'Object', 20: 'Key',
  21: 'Null', 22: 'EnumMember', 23: 'Struct', 24: 'Event', 25: 'Operator', 26: 'TypeParameter'
}

export const resolvePath = (p: string): string => {
  if (p.startsWith('/')) return p
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''
  return join(root, p)
}

const ensureOpen = async (uri: vscode.Uri) => {
  try { await vscode.workspace.openTextDocument(uri) } catch {}
}

const resolveSymbolPosition = async (uri: vscode.Uri, symbol: string, line?: number): Promise<vscode.Position> => {
  const doc = await vscode.workspace.openTextDocument(uri)
  const text = doc.getText()
  const escape = (s: string) => s.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`\\b${escape(symbol)}\\b`, 'g')

  const matches: vscode.Position[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(text))) matches.push(doc.positionAt(m.index))
  if (!matches.length) throw new Error(`Symbol "${symbol}" not found`)

  if (matches.length == 1) return matches[0]
  if (line == null) throw new Error(`Multiple "${symbol}" found, provide line`)

  const target = line - 1
  const match = matches.find(p => p.line == target)
  if (!match) throw new Error(`Symbol "${symbol}" not found on line ${line}`)
  return match
}

const toLocation = (r: vscode.Location | vscode.LocationLink): Location => {
  const [uri, range] = 'targetUri' in r ? [r.targetUri, r.targetRange] : [r.uri, r.range]
  return {
    path: uri.fsPath,
    range: { start: { line: range.start.line, character: range.start.character }, end: { line: range.end.line, character: range.end.character } }
  }
}

export const search = async (params: SearchParams) => {
  const uri = vscode.Uri.file(resolvePath(params.path))
  await ensureOpen(uri)
  const pos = await resolveSymbolPosition(uri, params.symbol, params.line)

  const [defs, impls, refs, hovers] = await Promise.all([
    vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>('vscode.executeDefinitionProvider', uri, pos),
    vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>('vscode.executeImplementationProvider', uri, pos),
    vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', uri, pos),
    vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, pos)
  ])

  const hover = (hovers || [])
    .flatMap(h => h.contents)
    .map(c => (typeof c == 'string' ? c : c.value))
    .filter(s => s.trim().length)
    .join('\n\n')

  return {
    definition: (defs || []).map(toLocation),
    implementation: (impls || []).map(toLocation),
    references: (refs || []).map(toLocation),
    hover
  }
}

export const rename = async (params: RenameParams) => {
  const uri = vscode.Uri.file(resolvePath(params.path))
  await ensureOpen(uri)
  const pos = await resolveSymbolPosition(uri, params.symbol, params.line)

  const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>('vscode.executeDocumentRenameProvider', uri, pos, params.newName)
  if (!edit) return { success: false, error: 'Symbol not renameable' }

  const ok = await vscode.workspace.applyEdit(edit)
  if (!ok) return { success: false, error: 'Apply failed' }

  const files: { path: string; changes: number }[] = []
  for (const [fileUri, edits] of edit.entries()) files.push({ path: fileUri.fsPath, changes: edits.length })
  await vscode.workspace.saveAll(false)

  return { success: true, files }
}

export const workspaceSymbols = async (params: { query: string }): Promise<{ symbols: SymbolInfo[] }> => {
  const results = await vscode.commands.executeCommand<vscode.SymbolInformation[]>('vscode.executeWorkspaceSymbolProvider', params.query)
  return {
    symbols: (results || []).map(s => ({
      name: s.name, kind: SYMBOL_KINDS[s.kind] || 'Unknown',
      path: s.location.uri.fsPath, line: s.location.range.start.line + 1, character: s.location.range.start.character + 1
    }))
  }
}

const flattenSymbols = (syms: vscode.DocumentSymbol[], path: string): SymbolInfo[] => {
  const result: SymbolInfo[] = []
  const walk = (list: vscode.DocumentSymbol[]) => {
    for (const s of list) {
      result.push({ name: s.name, kind: SYMBOL_KINDS[s.kind] || 'Unknown', path, line: s.range.start.line + 1, character: s.range.start.character + 1 })
      if (s.children) walk(s.children)
    }
  }
  walk(syms)
  return result
}

export const documentSymbols = async (params: { path: string }): Promise<{ symbols: SymbolInfo[] }> => {
  const uri = vscode.Uri.file(resolvePath(params.path))
  await ensureOpen(uri)
  const results = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', uri)
  return { symbols: flattenSymbols(results || [], uri.fsPath) }
}
