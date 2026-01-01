import { requestInternal, decodeHtml, parseCliArgs } from './utils'

const { args, get } = parseCliArgs()
const page = parseInt(get('--page', '1')) || 1
const query = args.join(' ')

if (!query) process.exit(1)

const html = await requestInternal(`/search?q=${encodeURIComponent(query)}&type=code&p=${page}`)

const jsonMatch = html.match(/data-target="react-app\.embeddedData">(\{.+?\})<\/script>/s)
const data = jsonMatch ? JSON.parse(jsonMatch[1]) : {}
const results = data.payload?.results || []
const pageCount = data.payload?.page_count || 1

console.log('<search-results>')
for (const r of results) {
  const repo = r.repo_nwo
  const path = r.path
  const url = `https://github.com/${repo}/blob/${r.commit_sha}/${path}`

  console.log(`[${repo}](${url})`)
  console.log(`${path}`)

  const lines: { num: number; code: string; mark: string }[] = []

  for (const s of r.snippets || []) {
    s.lines.forEach((l: string, i: number) => {
      const num = s.starting_line_number + i
      const clean = decodeHtml(l.replace(/<[^>]+>/g, ''))
      const mark = l.includes('<mark>') ? '>' : ' '
      // Avoid duplicates
      if (!lines.find(x => x.num === num)) {
        lines.push({ num, code: clean, mark })
      }
    })
  }

  lines.sort((a, b) => a.num - b.num)

  if (lines.length) {
    console.log('```')
    let prevNum = lines[0].num - 1

    // Take only first 15 lines to avoid huge output, but keep context
    const displayLines = lines.slice(0, 15)

    for (const l of displayLines) {
      if (l.num > prevNum + 1) {
        console.log('...')
      }
      console.log(`${l.mark}${l.num} | ${l.code}`)
      prevNum = l.num
    }

    if (lines.length > 15) console.log('...')
    console.log('```')
  }

  console.log('')
}

if (!results.length) console.log('No results')
console.log(`Page ${page} | ${page < pageCount ? `Next: --page ${page + 1}` : 'End reached'}`)
console.log('</search-results>')
