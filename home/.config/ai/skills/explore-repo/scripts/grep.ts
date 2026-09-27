import { parseUrl } from './github'

const [input, pattern] = process.argv.slice(2)
const limit = 30
const { owner, repo, branch, subdir } = parseUrl(input)

const filters = [
  `repo:^github\\.com/${owner}/${repo}$${branch ? `@${branch}` : ''}`,
  subdir && `file:^${subdir}/`,
  `count:${limit + 1}`,
  'case:yes',
  'patternType:regexp',
  pattern
].filter(Boolean)

const url = new URL('https://sourcegraph.com/.api/search/stream')
url.searchParams.set('q', filters.join(' '))

const body = await (await fetch(url)).text()
const events = [...body.matchAll(/^event: (\w+)\ndata: (.+)$/gm)].map(([, event, data]) => ({
  event,
  data: JSON.parse(data)
}))

for (const { event, data } of events) {
  if (event === 'error') throw new Error(data.message)
  if (event === 'alert' && data.title) console.error(data.title)
}

const lines = events
  .filter(({ event }) => event === 'matches')
  .flatMap(({ data }) => data)
  .filter(({ type }) => type === 'content')
  .flatMap(({ path, lineMatches }) => lineMatches.map(({ lineNumber, line }) => ({ path, lineNumber, line })))
  .sort((a, b) => a.path.localeCompare(b.path) || a.lineNumber - b.lineNumber)

const shown = lines.slice(0, limit)
const output = shown
  .map(({ path, lineNumber, line }, i) => {
    const header = shown[i - 1]?.path !== path ? `${path}\n` : ''
    return `${header}${lineNumber + 1}\t${line.trim()}`
  })
  .join('\n')

const hasMore = events.some(({ data }) => data?.matchCount > limit)

console.log(output || 'No matches')
if (hasMore) console.log('...more matches exist, scope with subdir URL')
