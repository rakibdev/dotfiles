import { test, expect } from 'bun:test'
import { excludeDir } from './github'

// https://github.com/dmtrKovalenko/fff
test('excludes dir', () => {
  expect(excludeDir(['.github/workflows/ci.yml', 'src/index.ts'], '.github')).toEqual(['src/index.ts'])
})
