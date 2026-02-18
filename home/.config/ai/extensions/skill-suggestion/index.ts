import { join } from 'path'
import { existsSync } from 'fs'
import { defineExtension, SKILLS_DIR } from 'coder/api'
import type { AgentMessage } from 'coder/api'

type SkillInfo = {
  name: string
  description: string
  patterns: string[]
}

const parseSkillMeta = (content: string): SkillInfo | undefined => {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return

  const fm = match[1]
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim()
  const description = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim()
  const patternMatch = fm.match(/^pattern:\s*(.+)$/m)?.[1]?.trim()
  if (!name || !description) return

  const patterns = patternMatch
    ? patternMatch.split(',').map(p => p.trim()).filter(Boolean)
    : []

  return { name, description, patterns }
}

let skillsCache: SkillInfo[] | undefined

const loadSkills = async (): Promise<SkillInfo[]> => {
  if (skillsCache) return skillsCache
  if (!existsSync(SKILLS_DIR)) return skillsCache = []

  const skills: SkillInfo[] = []
  const glob = new Bun.Glob('*/SKILL.md')
  for await (const path of glob.scan(SKILLS_DIR)) {
    const content = await Bun.file(join(SKILLS_DIR, path)).text()
    const meta = parseSkillMeta(content)
    if (meta) skills.push(meta)
  }
  return skillsCache = skills
}

const matchSkill = (text: string, skill: SkillInfo) => {
  if (new RegExp(`\\b${skill.name}\\b`, 'i').test(text)) return true

  for (const pattern of skill.patterns) {
    try { if (new RegExp(pattern, 'i').test(text)) return true } catch {}
  }

  const keywords = [...new Set(`${skill.name} ${skill.description}`.toLowerCase().match(/\b[a-z]{3,}\b/g) || [])]
  const threshold = Math.max(2, Math.ceil(keywords.length * 0.4))
  const lower = text.toLowerCase()
  return keywords.filter(kw => lower.includes(kw)).length >= threshold
}

const suggested = new Set<string>()
let callId = 0

const getUserText = (msg: AgentMessage): string => {
  const content = (msg as any).content
  if (typeof content == 'string') return content
  return content?.find?.((p: any) => p.type == 'text')?.text ?? ''
}

export default defineExtension(ctx => ({
  onAgentTurn: async () => {
    const messages = ctx.getMessages?.() ?? []
    const skills = await loadSkills()
    if (!skills.length) return

    const lastUser = [...messages].reverse().find(m => m.role == 'user')
    if (!lastUser) return

    const text = getUserText(lastUser)
    if (!text) return

    const matched = skills.filter(s => !suggested.has(s.name) && matchSkill(text, s))
    if (!matched.length) return

    matched.forEach(s => suggested.add(s.name))

    const id = `skill-suggest-${++callId}`
    const list = matched.map(s => `<name>${s.name}</name>\n<description>${s.description}</description>`).join('\n')

    return [...messages, {
      role: 'assistant' as const,
      content: [
        { type: 'text' as const, text: `Using ${matched.map(s => s.name).join(', ')} skill${matched.length > 1 ? 's' : ''}` },
        {
          type: 'toolCall' as const,
          id,
          name: 'skill',
          arguments: { name: matched[0].name }
        }
      ],
      api: 'messages' as any,
      provider: '' as any,
      model: '',
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      stopReason: 'toolCall' as any,
      timestamp: Date.now()
    }, {
      role: 'toolResult' as const,
      toolCallId: id,
      toolName: 'skill',
      content: [{ type: 'text' as const, text: `<skill-suggestions>\nRead if related to user intent:\n${list}\n</skill-suggestions>` }],
      isError: false,
      timestamp: Date.now()
    }]
  }
}))
