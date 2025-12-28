import type { Plugin } from '@opencode-ai/plugin'
import { join } from 'path'

type SkillMeta = {
  name: string
  description: string
  patterns: string[]
}

const SKILL_DIR = join(import.meta.dirname, '..', 'skill')

let counter = 0
/**
 * Generates time-based IDs compatible with OpenCode's Identifier.ascending (prt_ prefix).
 * Using random UUIDs causes parts to sort incorrectly (sometimes prepending instead of appending).
 * @see ~/Downloads/opencode/opencode/packages/opencode/src/id/id.ts
 */
const partId = () => {
  const now = BigInt(Date.now()) * BigInt(0x1000) + BigInt(++counter)
  const bytes = Buffer.alloc(6)
  for (let i = 0; i < 6; i++) bytes[i] = Number((now >> BigInt(40 - 8 * i)) & BigInt(0xff))
  return 'prt_' + bytes.toString('hex') + Math.random().toString(36).slice(2, 16)
}

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
      const matched: string[] = []

      for (const skill of skills) {
        if (alreadySuggested.has(skill.name)) continue

        if (skill.patterns.length && matchPatterns(msg, skill.patterns)) {
          matched.push(skill.name)
          continue
        }

        if (matchKeywords(msg, skill)) {
          matched.push(skill.name)
        }
      }

      if (matched.length) {
        const skillList = matched.join(', ')
        output.parts.push({
          id: partId(),
          sessionID: input.sessionID,
          messageID: input.messageID!,
          type: 'text' as const,
          text: `\n\nUse ${skillList} skill${matched.length > 1 ? 's' : ''} if relevant.`,
          synthetic: true
        })
        matched.forEach(name => alreadySuggested.add(name))
      }
    }
  }
}
