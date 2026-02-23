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
    ? patternMatch
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
    : []

  return { name, description, patterns }
}

let skillsCache: SkillInfo[] | undefined

const loadSkills = async (): Promise<SkillInfo[]> => {
  if (skillsCache) return skillsCache
  if (!existsSync(SKILLS_DIR)) return (skillsCache = [])

  const skills: SkillInfo[] = []
  const glob = new Bun.Glob('*/SKILL.md')
  for await (const path of glob.scan(SKILLS_DIR)) {
    const content = await Bun.file(join(SKILLS_DIR, path)).text()
    const meta = parseSkillMeta(content)
    if (meta) skills.push(meta)
  }
  return (skillsCache = skills)
}

const matchSkill = (text: string, skill: SkillInfo) => {
  if (new RegExp(`\\b${skill.name}\\b`, 'i').test(text)) return true

  for (const pattern of skill.patterns) {
    try {
      if (new RegExp(pattern, 'i').test(text)) return true
    } catch {}
  }

  const keywords = [...new Set(`${skill.name} ${skill.description}`.toLowerCase().match(/\b[a-z]{3,}\b/g) || [])]
  const threshold = Math.max(2, Math.ceil(keywords.length * 0.4))
  const lower = text.toLowerCase()
  return keywords.filter(kw => lower.includes(kw)).length >= threshold
}

const userText = (messages: AgentMessage[]) => {
  const last = [...messages].reverse().find(m => m.role == 'user') as any
  return last?.content?.find?.((p: any) => p.type == 'text')?.text ?? ''
}

const suggested = new Set<string>()
let callId = 0

export default defineExtension(() => ({
  onInput: async messages => {
    const skills = await loadSkills()
    if (!skills.length) return

    const text = userText(messages)
    if (!text) return

    const matched = skills.filter(s => !suggested.has(s.name) && matchSkill(text, s))
    if (!matched.length) return

    matched.forEach(s => suggested.add(s.name))

    const now = Date.now()
    const id = `skill-suggest-${++callId}`
    // Weak models (Minimax 2.1) ignores "- {name}: {description}" format but fully XML works
    // For testing message "https://github.com/anomalyco/opencode read this" - should pick github
    const list = matched.map(s => `<name>${s.name}</name>\n<description>${s.description}</description>`).join('\n')
    const xmlContent = [
      { type: 'text' as const, text: `<skill-suggestions>\nRead if relevant:\n${list}\n</skill-suggestions>` }
    ]

    const aiContext = {
      role: 'user' as const,
      content: xmlContent,
      visibility: 'ai',
      timestamp: now
    } as unknown as AgentMessage

    const call = {
      role: 'assistant' as const,
      content: [
        {
          type: 'text' as const,
          text: `Using ${matched.map(s => s.name).join(', ')} skill${matched.length > 1 ? 's' : ''}`
        },
        { type: 'toolCall' as const, id, name: 'skill', arguments: { name: matched[0].name } }
      ],
      visibility: 'ui',
      timestamp: now + 1
    } as unknown as AgentMessage

    const result = {
      role: 'toolResult' as const,
      toolCallId: id,
      toolName: 'skill',
      content: xmlContent,
      details: { skills: matched.map(s => s.name) },
      isError: false,
      visibility: 'ui',
      timestamp: now + 2
    } as unknown as AgentMessage

    return [...messages, aiContext, call, result]
  }
}))
