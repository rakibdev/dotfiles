import { dirname, join } from 'path'

export type SkillInfo = {
  name: string
  description: string
  location: string
  patterns: string[]
}

const SKILL_DIR = join(dirname(import.meta.filename), '..', '..', 'skill')

const parseSkillMeta = (content: string, location: string): SkillInfo | null => {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  const fm = match[1]
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim()
  const description = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim()
  const patternMatch = fm.match(/^pattern:\s*(.+)$/m)?.[1]?.trim()

  if (!name || !description) return null

  const patterns = patternMatch
    ? patternMatch.split(',').map(p => p.trim()).filter(Boolean)
    : []

  return { name, description, location, patterns }
}

let cache: SkillInfo[] | null = null

export const loadSkills = async (): Promise<SkillInfo[]> => {
  if (cache) return cache

  const skills: SkillInfo[] = []
  const glob = new Bun.Glob('*/SKILL.md')

  for await (const path of glob.scan(SKILL_DIR)) {
    const location = join(SKILL_DIR, path)
    const content = await Bun.file(location).text()
    const meta = parseSkillMeta(content, location)
    if (meta) skills.push(meta)
  }

  cache = skills
  return skills
}

export const getSkill = async (name: string): Promise<SkillInfo | undefined> => {
  const skills = await loadSkills()
  return skills.find(s => s.name === name)
}

export const parseSkillContent = (raw: string): string => {
  const match = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
  return match?.[1]?.trim() || raw.trim()
}
