import { tool } from '@opencode-ai/plugin'
import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'
import TurndownService from 'turndown'
// @ts-expect-error
import { tables } from 'turndown-plugin-gfm'
import { chromium } from 'playwright-core'

const TIMEOUT = 5_000
const PAGE_LOAD_TIMEOUT = 30_000

const DESCRIPTION = `Fetches URL content as markdown.
- URL must be fully-formed (http:// or https://)
- Uses Playwright for JS-rendered content`

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

const isMarkdown = (text: string) => text.startsWith('# ') || text.startsWith('---\n')

export default tool({
  description: DESCRIPTION,
  args: {
    url: tool.schema.string().describe('The URL to fetch content from')
  },
  async execute(args) {
    if (!args.url.startsWith('http://') && !args.url.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://')
    }

    const url = args.url
    const mdUrl = url.replace(/\.md($|\/)/, '$1').replace(/\/$/, '') + '.md'

    const [mdResult, htmlResult] = await Promise.allSettled([
      fetch(mdUrl, {
        signal: AbortSignal.timeout(TIMEOUT),
        headers: { 'User-Agent': USER_AGENT }
      }).then(async response => {
        if (!response.ok) throw new Error(response.statusText)
        return response.text()
      }),
      fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT),
        headers: { 'User-Agent': USER_AGENT }
      }).then(async response => {
        if (response.status == 404) throw new Error('404 Not Found')
        return response.text()
      })
    ])

    if (mdResult.status == 'fulfilled' && isMarkdown(mdResult.value)) return mdResult.value
    if (htmlResult.status == 'rejected') throw htmlResult.reason

    try {
      const html = htmlResult.value
      const markdown = toMarkdown(html, url)
      // If we got meaningful content (> 250 chars), return it.
      // Otherwise assume it's a client-side app and needs Playwright.
      if (markdown.length > 250) return markdown
    } catch {}

    const browser = await chromium.launch({
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--headless']
    })

    try {
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'networkidle', timeout: PAGE_LOAD_TIMEOUT })

      await page.waitForTimeout(1000)

      const content = await page.content()
      return toMarkdown(content, url)
    } finally {
      await browser.close()
    }
  }
})

const toMarkdown = (html: string, baseUrl?: string) => {
  const { document } = parseHTML(html)

  const navLinks = extractNavLinks(document, baseUrl)

  const reader = new Readability(document)
  const article = reader.parse()

  const content = article?.content ?? html

  const turndown = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*'
  })

  turndown.use(tables)

  turndown.addRule('fencedCodeBlock', {
    filter: (node, options) => {
      return options.codeBlockStyle === 'fenced' && node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE'
    },
    replacement: (_, node) => {
      const code = node.firstChild as Element
      const lang = code.getAttribute?.('class')?.match(/language-(\S+)/)?.[1] ?? ''
      const text = code.textContent?.replace(/\n$/, '') ?? ''
      return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`
    }
  })

  turndown.remove(['script', 'style', 'meta', 'link', 'nav', 'footer', 'header', 'aside'])

  let markdown = turndown
    .turndown(content)
    .replace(/\[\s*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\s+"[^"]*"\)/g, '[$1]($2)')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const unusedLinks = navLinks.filter(link => !markdown.includes(link.href))
  if (unusedLinks.length) {
    markdown += '\n\n---\n\n**Related pages:**\n' + unusedLinks.map(l => `- [${l.text}](${l.href})`).join('\n')
  }

  return markdown
}

const extractNavLinks = (document: Document, baseUrl?: string) => {
  const links: Array<{ text: string; href: string }> = []
  if (!baseUrl) return links

  const origin = new URL(baseUrl).origin
  const currentPath = new URL(baseUrl).pathname
  const basePath = currentPath.replace(/\/[^/]*\/?$/, '/')

  for (const anchor of document.querySelectorAll('ul li > a[href]')) {
    const href = anchor.getAttribute('href')
    const text = anchor.textContent?.trim()
    if (!href || !text || text.length < 2 || href.startsWith('#')) continue

    const fullUrl = href.startsWith('http') ? href : origin + (href.startsWith('/') ? href : '/' + href)
    if (!fullUrl.startsWith(origin)) continue

    const linkPath = new URL(fullUrl).pathname
    if (!linkPath.startsWith(basePath)) continue
    if (linkPath === currentPath || linkPath === currentPath + '/') continue

    if (!links.some(l => l.href === fullUrl)) {
      links.push({ text, href: fullUrl })
    }
  }

  return links
}
