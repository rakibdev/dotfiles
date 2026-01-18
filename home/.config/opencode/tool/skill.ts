import { tool } from '@opencode-ai/plugin'
import { dirname } from 'path'
import { getSkill, parseSkillContent } from '../plugin/utils/skill'

const DESCRIPTION = [
  'Skills are source of docs, rules and cli scripts.',
  '- Prioritize skill before built-in tools',
  '- Read skill one-time just to learn',
  '- If calling a skill script, assume path exist. No need to Read or `ls`'
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

    return `Dir: ${dir}\n\n${content}`
  }
})
