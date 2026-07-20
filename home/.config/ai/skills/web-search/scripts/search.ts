import { parseHTML } from 'linkedom'
import { getBrowser } from 'web-agent/lib/cdp'
import { waitForLoad } from 'web-agent/lib/page'

type Result = { title: string; url: string; date?: string; timestamp?: number }

// Using `tbs=cdr:...` (date filter) so Google includes date in every result
const FIVE_YEARS_AGO = new Date(Date.now() - 5 * 365 * 86_400_000)
const TBS = encodeURIComponent(
  `cdr:1,cd_min:${FIVE_YEARS_AGO.getMonth() + 1}/${FIVE_YEARS_AGO.getDate()}/${FIVE_YEARS_AGO.getFullYear()},cd_max:`
)

const ABSOLUTE_DATE_RE = /[A-Z][a-z]{2} \d{1,2}, \d{4}/
const RELATIVE_DATE_RE = /(\d+) (hour|day|week|month|year)s? ago/

const UNIT_MS: Record<string, number> = {
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
  year: 365 * 86_400_000
}

const parseDate = (text: string) => {
  const abs = text.match(ABSOLUTE_DATE_RE)
  if (abs) return { date: abs[0], timestamp: new Date(abs[0]).getTime() }
  const rel = text.match(RELATIVE_DATE_RE)
  if (rel) return { date: rel[0], timestamp: Date.now() - Number(rel[1]) * UNIT_MS[rel[2]] }
}

const parseResults = (html: string): Result[] => {
  const { document } = parseHTML(html)
  const results: Result[] = []
  for (const container of document.querySelectorAll('[data-rpos]')) {
    const h3 = container.querySelector('h3')
    const link = h3?.closest('a[href^="http"]')
    const title = h3?.textContent?.trim()
    const url = link?.getAttribute('href')
    // --limit 20 can return 19 because some data-rpos are video/image carousel, not h3+href so skipped
    if (!title || !url) continue
    const parsed = parseDate(container.textContent ?? '')
    results.push({ title, url, date: parsed?.date, timestamp: parsed?.timestamp })
  }
  return results
}

async function search(query: string, limit = 20) {
  await using browser = await getBrowser()
  await using session = await browser.openTab()

  // Whitelist is faster than blacklisting images/css/fonts/scripts
  await session.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
  session.on('Fetch.requestPaused', payload => {
    const allowed =
      payload.resourceType === 'Document' || payload.resourceType === 'Fetch' || payload.resourceType === 'XHR'
    session.send(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
      requestId: payload.requestId,
      ...(allowed ? {} : { errorReason: 'BlockedByClient' })
    })
  })

  const pages = Math.max(1, Math.ceil(limit / 10))

  await session.send('Page.navigate', {
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}&start=0&hl=en&tbs=${TBS}`
  })
  await waitForLoad(session)
  const { result: page1 } = await session.send('Runtime.evaluate', {
    expression: 'document.documentElement.outerHTML',
    returnByValue: true
  })

  const remainingStarts = Array.from({ length: pages - 1 }, (_, i) => (i + 1) * 10)
  let restHtml: string[] = []
  if (remainingStarts.length) {
    const { result } = await session.send('Runtime.evaluate', {
      expression: `Promise.all(${JSON.stringify(remainingStarts)}.map(start =>
        fetch("/search?q=" + encodeURIComponent(${JSON.stringify(query)}) + "&start=" + start + "&hl=en&tbs=${TBS}").then(r => r.text())
      ))`,
      returnByValue: true,
      awaitPromise: true
    })
    restHtml = result.value
  }

  const results = [page1.value, ...restHtml].flatMap(parseResults)
  if (!results.length) return 'No results'
  const limited = results.slice(0, limit)

  // Rank by 1 year ago. Naive sort-by-date would ruin original relevance order
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
  const recent = limited.filter(r => r.timestamp && r.timestamp >= oneYearAgo)
  const rest = limited.filter(r => !r.timestamp || r.timestamp < oneYearAgo)
  const sorted = [...recent, ...rest]

  return sorted.map((r, i) => `${i + 1}. ${r.title}\n${r.url}${r.date ? ` | ${r.date}` : ''}`).join('\n')
}

export { search }
