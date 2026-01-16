import type { Plugin } from '@opencode-ai/plugin'
import { vscode } from '../utils/vscode-socket'
import { partId } from './utils/id'
import { $ } from 'bun'

type Diagnostic = {
  range: { start: { line: number; character: number } }
  message: string
  severity: string
  source?: string
}

type DiagnosticFile = { uri: string; diagnostics: Diagnostic[] }
type RpcResult = { files?: DiagnosticFile[] }

const sessionFiles = new Map<string, Set<string>>()
const pendingDiagnostics = new Map<string, Promise<string | null>>()

const EDIT_TOOLS = ['write', 'multiedit', 'edit', 'apply_diff']

const getGitModifiedFiles = async (cwd: string): Promise<string[]> => {
  try {
    const unstaged = await $`git diff --name-only`.cwd(cwd).text()
    const staged = await $`git diff --cached --name-only`.cwd(cwd).text()
    const untracked = await $`git ls-files --others --exclude-standard`.cwd(cwd).text()

    const all = new Set<string>()
    for (const line of [...unstaged.split('\n'), ...staged.split('\n'), ...untracked.split('\n')]) {
      const trimmed = line.trim()
      if (trimmed && /\.(ts|tsx|js|jsx|vue|svelte)$/.test(trimmed)) {
        all.add(`${cwd}/${trimmed}`)
      }
    }
    return [...all]
  } catch {
    return []
  }
}

const formatDiagnostics = (files: DiagnosticFile[]): string => {
  return files
    .map(f => {
      const diags = f.diagnostics
        .map(d => {
          const l = d.range.start.line + 1
          const c = d.range.start.character + 1
          const sev = d.severity.toUpperCase()
          const src = d.source ? ` (${d.source})` : ''
          return `  ${sev} [${l}:${c}]${src} ${d.message}`
        })
        .join('\n')
      return `${f.uri}:\n${diags}`
    })
    .join('\n\n')
}

const fetchDiagnostics = async (sessionID: string, cwd: string): Promise<string | null> => {
  const edited = sessionFiles.get(sessionID) || new Set()
  const gitFiles = await getGitModifiedFiles(cwd)

  const allFiles = [...new Set([...edited, ...gitFiles])]
  if (!allFiles.length) return null

  try {
    const results = await vscode.all<RpcResult>('getDiagnostics', {
      filePaths: allFiles,
      severities: ['error', 'warning']
    })

    const allDiags = results.flatMap(r => r.result.files || [])
    if (!allDiags.length) return null
    return formatDiagnostics(allDiags)
  } catch {
    return null
  }
}

export const Diagnostics: Plugin = async ({ directory }) => {
  return {
    'tool.execute.after': async (input, _output) => {
      const { tool, sessionID } = input
      const args = (_output as any).args || {}

      if (EDIT_TOOLS.includes(tool) || tool.includes('edit')) {
        const filePath = args.filePath || args.path || args.target
        if (filePath && typeof filePath == 'string') {
          if (!sessionFiles.has(sessionID)) sessionFiles.set(sessionID, new Set())
          sessionFiles.get(sessionID)!.add(filePath)

          pendingDiagnostics.set(sessionID, fetchDiagnostics(sessionID, directory))
        }
      }
    },

    'chat.message': async (input, output) => {
      const { sessionID, messageID } = input
      const pending = pendingDiagnostics.get(sessionID)
      if (!pending) return

      pendingDiagnostics.delete(sessionID)
      const diagnostics = await pending
      if (!diagnostics) return

      output.parts.push({
        id: partId(),
        sessionID,
        messageID: messageID!,
        type: 'text' as const,
        text: `\n\n---\n**Diagnostics:**\n\`\`\`\n${diagnostics}\n\`\`\``,
        synthetic: true
      })
    }
  }
}
