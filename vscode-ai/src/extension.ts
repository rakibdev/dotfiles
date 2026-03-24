import * as vscode from 'vscode'

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

const fixFile = (document: vscode.TextDocument, diagnostics: readonly vscode.Diagnostic[]) => {
  const relativePath = getRelativePath(document.uri)
  if (!relativePath) return

  const startLine = diagnostics[0].range.start.line + 1
  const endLine = diagnostics[diagnostics.length - 1].range.end.line + 1
  const lineRef = startLine === endLine ? `#L${startLine}` : `#L${startLine}-${endLine}`

  const messages = diagnostics
    .map(d => d.message.replace(/^(error|warning|info|hint):\s*/i, '').trim())
    .join(', ')

  const term = vscode.window.activeTerminal || vscode.window.createTerminal()
  term.sendText(`@${relativePath}${lineRef}: ${messages}`, false)
  term.show()
}

export async function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('vscode-ai.mentionFile', mentionFile))

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('*', {
      provideCodeActions(document, _range, ctx) {
        if (ctx.diagnostics.length === 0) return []
        const fixAction = new vscode.CodeAction('Fix', vscode.CodeActionKind.QuickFix)
        fixAction.isPreferred = true
        ;(fixAction as any).isAI = true
        fixAction.command = {
          command: 'vscode-ai.fixFile',
          title: 'Fix',
          arguments: [document, ctx.diagnostics],
        }
        return [fixAction]
      },
    }, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-ai.fixFile', fixFile)
  )
}

export function deactivate() {}
