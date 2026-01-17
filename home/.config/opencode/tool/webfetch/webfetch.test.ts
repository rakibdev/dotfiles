import { expect, test, describe } from 'bun:test'
import TurndownService from 'turndown'
// @ts-expect-error
import { tables } from 'turndown-plugin-gfm'
import { parseHTML } from 'linkedom'
import { extractNavLinks, htmlToMarkdown } from './markdown'
import { findMainContent, scoreNode } from './pruner'

test('converts hyprlock wiki tables to markdown', async () => {
  const response = await fetch('https://wiki.hypr.land/Hypr-Ecosystem/hyprlock/')
  const html = await response.text()

  const turndown = new TurndownService()
  turndown.use(tables)
  const md = turndown.turndown(html)

  expect(md).toContain('| Variable |')
  expect(md).toContain('| --- |')
  expect(md).toContain('| `pam:enabled` |')
}, 10_000)

test('shadcn theming page returns markdown via .md fallback', async () => {
  const url = 'https://ui.shadcn.com/docs/theming'
  const mdUrl = url.replace(/\/$/, '') + '.md'

  const response = await fetch(mdUrl)
  expect(response.ok).toBe(true)

  const md = await response.text()
  expect(md).toContain('```')
  expect(md).toMatch(/^---\n|^# /m)
}, 10_000)

test('extracts nav links from hyprlock page', async () => {
  const response = await fetch('https://wiki.hypr.land/Hypr-Ecosystem/hyprlock/')
  const html = await response.text()
  const { document } = parseHTML(html)

  const links = extractNavLinks(document, 'https://wiki.hypr.land/Hypr-Ecosystem/hyprlock/')

  expect(links.length).toBeGreaterThan(0)
}, 10_000)

test('shadcn removes copy button inside <pre>', async () => {
  const url = 'https://ui.shadcn.com/docs/components/button'
  const res = await fetch(url)
  const html = await res.text()
  const md = htmlToMarkdown(html, url)

  expect(md).toContain('```')
  expect(md).toContain('import { Button }')
  expect(md).toContain('ButtonDemo')
}, 15_000)

test('github repo page preserves <span> tags inside <pre>', async () => {
  const url = 'https://github.com/shekohex/opencode-google-antigravity-auth'
  const res = await fetch(url)
  const html = await res.text()
  const md = htmlToMarkdown(html, url)

  expect(md).toContain('"$schema"')
  expect(md).toContain('"plugin"')
  expect(md).toContain('[')
  expect(md).toContain(']')
  expect(md).not.toMatch(/:\s*,/)
  expect(md).not.toMatch(/:\s*\[?\]/)
}, 15_000)

describe('pruner', () => {
  test('scoreNode gives article higher score than nav', () => {
    const { document } = parseHTML('<html><body><article>Content here</article><nav>Links</nav></body></html>')
    const article = document.querySelector('article')!
    const nav = document.querySelector('nav')!

    expect(scoreNode(article)).toBeGreaterThan(scoreNode(nav))
  })

  test('findMainContent prefers article over div', () => {
    const { document } = parseHTML(`
      <html><body>
        <div>Some random text</div>
        <article>Main article content with more text here for scoring purposes</article>
      </body></html>
    `)
    const main = findMainContent(document)

    expect(main.tagName.toLowerCase()).toBe('article')
  })
})
