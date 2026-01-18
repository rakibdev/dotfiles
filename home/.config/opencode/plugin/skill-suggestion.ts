import type { Plugin } from '@opencode-ai/plugin'
import { partId } from './utils/id'
import { loadSkills, type SkillInfo } from './utils/skill'

const matchPatterns = (message: string, skill: SkillInfo): boolean => {
  const { patterns } = skill
  if (!patterns.length) return false
  for (const pattern of patterns) {
    try {
      if (new RegExp(pattern, 'i').test(message)) return true
    } catch {}
  }
  return false
}

const matchKeywords = (message: string, skill: SkillInfo): boolean => {
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
      const matched: SkillInfo[] = []

      for (const skill of skills) {
        if (alreadySuggested.has(skill.name)) continue

        const nameMatch = new RegExp(`\\b${skill.name}\\b`, 'i').test(msg)
        const patternMatch = matchPatterns(msg, skill)

        if (nameMatch || patternMatch || matchKeywords(msg, skill)) {
          matched.push(skill)
        }
      }

      if (matched.length) {
        // AI (Minmax 2.1) ignores "- {name}: {description}" format but fully XML works
        // For testing message "https://github.com/anomalyco/opencode read this" - should pick github
        const list = matched.map(s => `<name>${s.name}</name>\n<description>${s.description}</description>`).join('\n')
        output.parts.push({
          id: partId(),
          sessionID: input.sessionID,
          messageID: input.messageID!,
          type: 'text' as const,
          text: ['<skill-suggestions>', 'Read if related to user intent:', list, '</skill-suggestions>'].join('\n'),
          synthetic: true
        })
        matched.forEach(s => alreadySuggested.add(s.name))
      }
    }
  }
}
