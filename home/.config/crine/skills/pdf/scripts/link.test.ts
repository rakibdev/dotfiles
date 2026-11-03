import { test, expect } from 'bun:test'
import { addAnnotationLinks } from './link'

test('annotation middle word only', () => {
  const text = { page: 1, x: 0, y: 0, width: 110, text: 'foo bar baz' }
  const link = { page: 1, x: 40, y: 0, width: 30, linkUrl: 'https://x.com' }
  expect(addAnnotationLinks('start foo bar baz end', [text], [link])).toBe('start foo [bar](https://x.com) baz end')
})
