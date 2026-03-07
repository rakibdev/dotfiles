import { requestInternal, formatDate, parseCliArgs } from './utils'

const { args, get } = parseCliArgs()

const page = parseInt(get('--page', '1')) || 1
const sort = get('--sort', 'updated')
const stars = get('--stars', '100')
const query = args.join(' ')

let finalQuery = query
if (!finalQuery.includes('stars:') && !finalQuery.includes('repo:') && stars !== '0') {
  finalQuery += ` stars:>${stars}`
}

if (!finalQuery.trim()) process.exit(1)

const sortParam = sort === 'updated' ? '&s=updated&o=desc' : ''
const html = await requestInternal(
  `/search?q=${encodeURIComponent(finalQuery)}&type=repositories${sortParam}&p=${page}`
)

const jsonMatch = html.match(/data-target="react-app\.embeddedData">(\{.+?\})<\/script>/s)
if (!jsonMatch) {
  console.log('<search-results>\nNo results\nPage 1 | End\n</search-results>')
  process.exit(0)
}

const data = JSON.parse(jsonMatch[1])
const results = data.payload?.results || []
const pageCount = data.payload?.page_count || 1

console.log('<search-results>')
for (const r of results) {
  const name = r.hl_name.replace(/<\/?em>/g, '')
  const desc = r.hl_trunc_description?.replace(/<\/?em>/g, '').replace(/&amp;/g, '&') || ''
  const updated = r.repo?.repository?.updated_at ? formatDate(r.repo.repository.updated_at) : ''
  const starsCount = r.followers ?? 0

  console.log(`[${name}](https://github.com/${name})`)
  if (desc) console.log(desc)
  const meta = [r.language, `Stars: ${starsCount}`, updated].filter(Boolean).join(' | ')
  if (meta) console.log(meta)
  console.log('')
}

if (!results.length) console.log('No results')
console.log(`Page ${page} | ${page < pageCount ? `Next: --page ${page + 1}` : 'End'}`)
console.log('</search-results>')
