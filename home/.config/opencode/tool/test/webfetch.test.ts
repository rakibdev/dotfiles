import { expect, test } from 'bun:test'
import TurndownService from 'turndown'
import { tables } from 'turndown-plugin-gfm'

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
