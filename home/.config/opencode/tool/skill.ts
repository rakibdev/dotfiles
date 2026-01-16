import { tool } from '@opencode-ai/plugin'
import { dirname } from 'path'
import { getSkill, parseSkillContent } from '../plugin/utils/skill'

const DESCRIPTION = [
  "Skill contains docs and scripts. Auto-read system's <skill-suggestions> only if relevent to user task.",
  "Note:",
  "- A skill can be read one-time just to learn",
  "- If calling script of skill, assume path exist. No need to Read or `ls`",
].join('\n')

export default tool({
  description: DESCRIPTION,

  args: {
    name: tool.schema.string().describe('Skill name to read')
  },

  async execute(args) {
    const skill = await getSkill(args.name)
    if (!skill) throw new Error('Not found')

    const raw = await Bun.file(skill.location).text()
    const content = parseSkillContent(raw)
    const dir = dirname(skill.location)

    return `Base Dir: ${dir}\n\n${content}`
  }
})
