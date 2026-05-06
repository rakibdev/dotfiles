/**
 * Browser daemon - raw CDP, no playwright.
 * Auto-kills after 3 minutes of inactivity.
 *
 * Protocol: newline-delimited JSON
 *   recv: string[]  (raw argv from play.ts)
 *   send: { out?, error? }
 */
import { getBrowser } from '@ai/browser/cdp'
import type { Browser, Session } from '@ai/browser/cdp'

const SOCK = '/tmp/browser.sock'
const INACTIVITY_TIMEOUT = 3 * 60 * 1000

let inactivityTimer: Timer | null = null
const resetTimer = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(cleanup, INACTIVITY_TIMEOUT)
}

const cleanup = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  try { Bun.spawnSync(['rm', '-f', SOCK]) } catch {}
  process.exit(0)
}

let browser: Browser

const isCdpMethod = (s: string) => /^[A-Z][a-zA-Z]+\.[a-z][a-zA-Z]+(\s|$)/.test(s)

const execCode = async (session: Session, code: string, timeout = 30_000): Promise<string> => {
  const wrapped = `(async () => {
    const __lines = []
    const __con = new Proxy({}, { get: (_, m) => (...a) => __lines.push(a.map(x => typeof x==='object'?JSON.stringify(x):String(x)).join(' ')) })
    const _c = console; Object.assign(console, __con)
    try {
      const __r = await (async()=>{ ${code} })()
      if (__r !== undefined) __lines.push(typeof __r==='object'?JSON.stringify(__r,null,2):String(__r))
    } finally { Object.assign(console, _c) }
    return __lines.join('\\n')
  })()`

  const r = await Promise.race([
    session.send('Runtime.evaluate', { expression: wrapped, awaitPromise: true, returnByValue: true }),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`Timeout after ${timeout}ms`)), timeout)),
  ])
  if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r?.result?.value ?? ''
}

const execCdp = async (session: Session, input: string): Promise<string> => {
  const spaceIdx = input.indexOf(' ')
  const method = spaceIdx === -1 ? input : input.slice(0, spaceIdx)
  const params = spaceIdx === -1 ? {} : JSON.parse(input.slice(spaceIdx + 1))
  const r = await session.send(method, params)
  return r !== undefined ? JSON.stringify(r, null, 2) : ''
}

const dispatch = async (session: Session, payload: string): Promise<string> => {
  if (/^https?:\/\//.test(payload)) {
    await session.send('Page.navigate', { url: payload })
    return `Navigated to ${payload}`
  }
  return isCdpMethod(payload) ? execCdp(session, payload) : execCode(session, payload)
}

const resolvePage = (targets: Awaited<ReturnType<Browser['getTargets']>>, tab?: string) => {
  if (!tab) return targets[0]
  const idx = parseInt(tab)
  if (!isNaN(idx)) return targets[idx - 1]
}

const handle = async (argv: string[]): Promise<string> => {
  resetTimer()

  if (argv.length === 0 || argv[0] === 'tabs') {
    const targets = await browser.getTargets()
    return targets.length ? targets.map((t, i) => `${i + 1}. ${t.url}`).join('\n') : 'No tabs open'
  }

  if (argv[0] === 'new') {
    const targetId = await browser.createTarget(argv[1] && /^https?:\/\//.test(argv[1]) ? argv[1] : undefined)
    if (!argv[1] || /^https?:\/\//.test(argv[1])) return argv[1] ? `Navigated to ${argv[1]}` : 'New tab opened'
    const session = await browser.connect(targetId)
    const out = await dispatch(session, argv[1])
    session.close()
    return out
  }

  if (argv[0] === 'close') {
    const targets = await browser.getTargets()
    const target = resolvePage(targets, argv[1])
    if (!target) throw new Error(`Tab not found: ${argv[1] ?? '(first)'}`)
    await browser.send('Target.closeTarget', { targetId: target.targetId })
    return `Closed: ${target.url}`
  }

  const tab = argv.length >= 2 ? argv[0] : undefined
  const payload = argv.length >= 2 ? argv[1] : argv[0]
  const targets = await browser.getTargets()
  const target = resolvePage(targets, tab)
  if (!target) throw new Error(`Tab not found: ${tab ?? '(first)'}`)
  const session = await browser.connect(target.targetId)
  const out = await dispatch(session, payload)
  session.close()
  session.close()
  return out
}

try { Bun.spawnSync(['rm', '-f', SOCK]) } catch {}

browser = await getBrowser()

Bun.listen<{ buf: string }>({
  unix: SOCK,
  socket: {
    open(s) { s.data = { buf: '' } },
    async data(s, chunk) {
      s.data.buf += chunk.toString()
      const nl = s.data.buf.indexOf('\n')
      if (nl === -1) return
      const line = s.data.buf.slice(0, nl)
      let out: string | undefined, error: string | undefined
      try { out = await handle(JSON.parse(line) as string[]) }
      catch (e: any) { error = e.message }
      s.write(JSON.stringify({ out, error }) + '\n')
      s.end()
    },
    error(_, e) { console.error('Socket error:', e.message) },
  }
})

resetTimer()
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
