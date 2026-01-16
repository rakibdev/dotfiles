import type { Plugin } from '@opencode-ai/plugin'
import { join } from 'path'
import { partId } from './utils/id'

type SkillMeta = {
  name: string
  description: string
  patterns: string[]
}

const SKILL_DIR = join(import.meta.dirname, '..', 'skill')

const parseSkillMeta = (content: string): SkillMeta | null => {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  const frontmatter = match[1]
  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim()
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim()
  const patternMatch = frontmatter.match(/^pattern:\s*(.+)$/m)?.[1]?.trim()

  if (!name || !description) return null

  const patterns = patternMatch
    ? patternMatch
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
    : []

  return { name, description, patterns }
}

const loadSkills = async (): Promise<SkillMeta[]> => {
  const skills: SkillMeta[] = []
  const glob = new Bun.Glob('*/SKILL.md')

  for await (const path of glob.scan(SKILL_DIR)) {
    const content = await Bun.file(join(SKILL_DIR, path)).text()
    const meta = parseSkillMeta(content)
    if (meta) skills.push(meta)
  }

  return skills
}

const matchPatterns = (message: string, patterns: string[]): boolean => {
  for (const pattern of patterns) {
    try {
      if (new RegExp(pattern, 'i').test(message)) return true
    } catch {}
  }
  return false
}

const matchKeywords = (message: string, skill: SkillMeta): boolean => {
  const text = `${skill.name} ${skill.description}`.toLowerCase()
  const keywords = [...new Set(text.match(/\b[a-z]{3,}\b/g) || [])]
  const threshold = Math.max(2, Math.ceil(keywords.length * 0.4))

  const msgLower = message.toLowerCase()
  const score = keywords.filter(kw => msgLower.includes(kw)).length

  return score >= threshold
}

const suggested = new Map<string, Set<string>>()

export const SkillSuggestion: Plugin = async () => {
  const skills = await loadSkills()

  return {
    'chat.message': async (input, output) => {
      const textPart = output.parts.find(p => p.type === 'text')
      if (!textPart || textPart.type !== 'text') return

      if (!suggested.has(input.sessionID)) suggested.set(input.sessionID, new Set())
      const alreadySuggested = suggested.get(input.sessionID)!

      const msg = textPart.text
      const matched: SkillMeta[] = []

      for (const skill of skills) {
        if (alreadySuggested.has(skill.name)) continue

        const nameMatch = new RegExp(`\\b${skill.name}\\b`, 'i').test(msg)
        const patternMatch = skill.patterns.length && matchPatterns(msg, skill.patterns)

        if (nameMatch || patternMatch || matchKeywords(msg, skill)) {
          matched.push(skill)
        }
      }

      if (matched.length) {
        // AI (Minmax 2.1) ignores "- {name}: {description}" format but fully XML works
        // For testing add github skill, message "https://github.com/anomalyco/opencode read this" - should pick github
        const list = matched.map(s => `<name>${s.name}</name>\n<description>${s.description}</description>`).join('\n')
        output.parts.push({
          id: partId(),
          sessionID: input.sessionID,
          messageID: input.messageID!,
          type: 'text' as const,
          text: ['<skill-suggestions>', list, 'Read if relevant to user task', '</skill-suggestions>'].join('\n'),
          synthetic: true
        })
        matched.forEach(s => alreadySuggested.add(s.name))
      }
    }
  }
}
