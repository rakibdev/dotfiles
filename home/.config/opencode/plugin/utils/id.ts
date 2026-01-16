/**
 * Generates time-based IDs compatible with OpenCode's Identifier.ascending.
 * Using random UUIDs causes message parts to sort incorrectly (sometimes prepending instead of appending).
 * @see opencode/packages/opencode/src/id/id.ts
 */
let lastTimestamp = 0
let counter = 0
const base62Chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

const randomBase62 = (length: number) => {
  let result = ''
  for (let i = 0; i < length; i++) result += base62Chars[Math.floor(Math.random() * 62)]
  return result
}

export const partId = () => {
  const current = Date.now()
  if (current !== lastTimestamp) {
    lastTimestamp = current
    counter = 0
  }
  counter++
  const now = BigInt(current) * BigInt(0x1000) + BigInt(counter)
  const bytes = Buffer.alloc(6)
  for (let i = 0; i < 6; i++) bytes[i] = Number((now >> BigInt(40 - 8 * i)) & BigInt(0xff))
  return 'prt_' + bytes.toString('hex') + randomBase62(14)
}
