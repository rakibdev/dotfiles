import { parseHTML } from 'linkedom'
import TurndownService from 'turndown'
// @ts-expect-error
import { tables } from 'turndown-plugin-gfm'
import { extractMetadata, detoxDOM, type Metadata } from './scraper'
import { findMainContent, pruneContent } from './pruner'

const createTurndown = () => {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*'
  })

  turndown.use(tables)

  turndown.addRule('fencedCodeBlock', {
    filter: (node, options) => options.codeBlockStyle === 'fenced' && node.nodeName === 'PRE',
    replacement: (_, node) => {
      const codeEl = node.firstChild?.nodeName === 'CODE' ? node.firstChild as Element : node
      const lang = codeEl.getAttribute?.('class')?.match(/language-(\S+)/)?.[1] ?? ''
      const text = codeEl.textContent?.replace(/\n$/, '') ?? ''
      return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`
    }
  })

  turndown.remove(['script', 'style', 'meta', 'link', 'nav', 'footer', 'header', 'aside', 'noscript'])

  return turndown
}

const formatHeader = (metadata: Metadata) => {
  let header = ''
  if (metadata.title) header += `# ${metadata.title}\n\n`
  if (metadata.description) header += `> ${metadata.description}\n\n`
  if (metadata.author || metadata.publishedTime) {
    header += `*${[metadata.author, metadata.publishedTime].filter(Boolean).join(' • ')}*\n\n`
  }
  return header ? header + '---\n\n' : ''
}

export const extractNavLinks = (document: Document, baseUrl?: string) => {
  const links: Array<{ text: string; href: string }> = []
  if (!baseUrl) return links

  const { origin, pathname: currentPath } = new URL(baseUrl)
  const basePath = currentPath.replace(/\/[^/]*\/?$/, '/')

  document.querySelectorAll('ul li > a[href]').forEach(anchor => {
    const href = anchor.getAttribute('href')
    const text = anchor.textContent?.trim()
    if (!href || !text || text.length < 2 || href.startsWith('#')) return

    const fullUrl = href.startsWith('http') ? href : origin + (href.startsWith('/') ? href : '/' + href)
    if (!fullUrl.startsWith(origin)) return

    const linkPath = new URL(fullUrl).pathname
    if (!linkPath.startsWith(basePath) || linkPath === currentPath || linkPath === currentPath + '/') return

    if (!links.some(l => l.href === fullUrl)) {
      links.push({ text, href: fullUrl })
    }
  })

  return links
}

export const htmlToMarkdown = (html: string, baseUrl?: string): string => {
  const { document } = parseHTML(html)

  const metadata = extractMetadata(document)
  detoxDOM(document)

  const mainContent = findMainContent(document)
  pruneContent(mainContent)

  const navLinks = extractNavLinks(document, baseUrl)
  const turndown = createTurndown()

  let markdown = turndown
    .turndown(mainContent.outerHTML || mainContent.innerHTML)
    .replace(/\[\s*\]\([^)]*\)/g, '') // Remove empty links: []()
    .replace(/\[([^\]]+)\]\(([^)]+)\s+"[^"]*"\)/g, '[$1]($2)') // Remove title attributes: [text](url "title") → [text](url)
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim()

  markdown = formatHeader(metadata) + markdown

  const unusedLinks = navLinks.filter(link => !markdown.includes(link.href))
  if (unusedLinks.length) {
    markdown += '\n\n---\n\n## Other links\n\n' + unusedLinks.map(l => `- [${l.text}](${l.href})`).join('\n')
  }

  return markdown
}
