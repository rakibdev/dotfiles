import { describe, expect, test } from 'bun:test'
import { $ } from 'bun'

describe('github read', () => {
  test('issues/7193 should contain traefik:v3.6.1', async () => {
    const { stdout } = await $`bun fetch.ts https://github.com/coollabsio/coolify/issues/7193`.cwd(__dirname)
    const text = stdout.toString()
    expect(text).toContain('traefik:v3.6.1')
  }, 120000)
})
