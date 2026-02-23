import { defineExtension } from 'coder/api'
import type { AgentMessage, ToolRendererProps } from 'coder/api'
import { vscode } from '../utils/vscode-socket'

type Diagnostic = {
  range: { start: { line: number; character: number } }
  message: string
  severity: string
  source?: string
}

type DiagnosticFile = { uri: string; diagnostics: Diagnostic[] }
type RpcResult = { files?: DiagnosticFile[] }

const EDIT_TOOLS = new Set(['write', 'edit'])

const format = (files: DiagnosticFile[]) =>
  files
    .map(f => {
      const diags = f.diagnostics
        .map(d => {
          const l = d.range.start.line + 1
          const c = d.range.start.character + 1
          const src = d.source ? ` (${d.source})` : ''
          return `  ${d.severity.toUpperCase()} [${l}:${c}]${src} ${d.message}`
        })
        .join('\n')
      return `${f.uri}:\n${diags}`
    })
    .join('\n\n')

const fetchDiagnostics = async (files: Set<string>): Promise<AgentMessage[]> => {
  if (!files.size) return []

  try {
    const results = await vscode.all<RpcResult>('getDiagnostics', {
      filePaths: [...files],
      severities: ['error', 'warning']
    })
    const allDiags = results.flatMap(r => r.result.files || [])
    if (!allDiags.length) return []

    const output = `<diagnostics>\n${format(allDiags)}\n</diagnostics>`
    const id = Math.random().toString(36).slice(2)
    const now = Date.now()

    return [
      {
        role: 'user',
        content: [{ type: 'text', text: output }],
        visibility: 'ai',
        timestamp: now
      } as unknown as AgentMessage,
      {
        role: 'assistant',
        content: [{ type: 'toolCall', id, name: 'diagnostics', arguments: {} }],
        visibility: 'ui',
        timestamp: now + 1
      } as unknown as AgentMessage,
      {
        role: 'toolResult',
        toolCallId: id,
        toolName: 'diagnostics',
        content: [{ type: 'text', text: output }],
        visibility: 'ui',
        timestamp: now + 2
      } as unknown as AgentMessage
    ]
  } catch {
    return []
  }
}

const DiagnosticsRenderer = (props: ToolRendererProps) => {
  const onClick = () => props.onToolClick?.({ tool: 'diagnostics', output: props.output })
  return (
    <box flexDirection="row" gap={1} onMouseUp={onClick}>
      <text>⚠</text>
      <text>diagnostics</text>
    </box>
  )
}

export default defineExtension(() => {
  const editedFiles = new Set<string>()
  let pending: Promise<AgentMessage[]> | undefined

  return {
    onToolCall: (name, args) => {
      if (!EDIT_TOOLS.has(name)) return
      const file = args.filePath || args.path || args.target
      if (file && typeof file == 'string') {
        editedFiles.add(file)
        pending = fetchDiagnostics(new Set(editedFiles))
      }
    },

    getQueueMessages: async () => {
      if (!pending) return []
      const msgs = await pending
      pending = undefined
      return msgs
    },

    ui: { diagnostics: DiagnosticsRenderer }
  }
})
