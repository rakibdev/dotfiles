import { expect, test } from 'bun:test'
import { ObjectId } from 'mongodb'
import { compact, execute } from './shell'

test('compact', () => {
  const _id = new ObjectId('65f0000000000000000000aa')
  expect(compact({ _id, name: 'x', n: 1, a: { b: 2 } })).toBe(
    '{_id: 65f0000000000000000000aa, name: "x", n: 1, a: {b: 2}}',
  )
})

test('snippet can use require', async () => {
  expect(await execute(`return require('crypto').createHash('md5').update('a').digest('hex')`)).toBe(
    '0cc175b9c0f1b6a831c399e269772661',
  )
})
