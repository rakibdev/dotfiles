/**
 * Browser daemon - raw CDP, no playwright.
 * Auto-kills after 3 minutes of inactivity.
 *
 * Protocol: newline-delimited JSON
 *   recv: string[]  (raw argv from play.ts)
 *   send: { out?, error? }
 */
const PORT = process.env.PLAYWRIGHT_PORT
if (!PORT) { console.error('PLAYWRIGHT_PORT not set'); process.exit(1) }

const SOCK = '/tmp/browser.sock'
const BASE = `http://127.0.0.1:${PORT}`
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

// ---- CDP helpers ----

type Target = { id: string; type: string; url: string; webSocketDebuggerUrl: string }

const listTargets = async () =>
  ((await fetch(`${BASE}/json/list`).then(r => r.json())) as Target[]).filter(t => t.type === 'page')

const resolvePage = (targets: Target[], tab?: string) => {
  if (!tab) return targets[0]
  const idx = parseInt(tab)
  if (!isNaN(idx)) return targets[idx - 1]
}

type Session = { send: (method: string, params?: object) => Promise<any>; close: () => void }

const openSession = (wsUrl: string): Promise<Session> => new Promise((resolve, reject) => {
  const ws = new WebSocket(wsUrl)
  let id = 1
  const pending = new Map<number, (r: any) => void>()

  ws.addEventListener('open', () => resolve({
    send: (method, params = {}) => new Promise(res => {
      const mid = id++
      pending.set(mid, res)
      ws.send(JSON.stringify({ id: mid, method, params }))
    }),
    close: () => ws.close(),
  }))
  ws.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data as string)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)!(msg.result); pending.delete(msg.id) }
  })
  ws.addEventListener('error', () => reject(new Error(`WS error: ${wsUrl}`)))
})

const isCdpMethod = (s: string) => /^[A-Z][a-zA-Z]+\.[a-z][a-zA-Z]+(\s|$)/.test(s)

// Run browser JS, capturing console + return value
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

// Send raw CDP method, e.g. "Debugger.enable" or "Runtime.evaluate {...}"
const execCdp = async (session: Session, input: string): Promise<string> => {
  const spaceIdx = input.indexOf(' ')
  const method = spaceIdx === -1 ? input : input.slice(0, spaceIdx)
  const params = spaceIdx === -1 ? {} : JSON.parse(input.slice(spaceIdx + 1))
  const r = await session.send(method, params)
  return r !== undefined ? JSON.stringify(r, null, 2) : ''
}

// Dispatch payload to the right executor on an open session
const dispatch = async (session: Session, payload: string): Promise<string> => {
  if (/^https?:\/\//.test(payload)) {
    await session.send('Page.navigate', { url: payload })
    return `Navigated to ${payload}`
  }
  return isCdpMethod(payload) ? execCdp(session, payload) : execCode(session, payload)
}

// ---- Command handler (argv from play.ts) ----

const handle = async (argv: string[]): Promise<string> => {
  resetTimer()

  // tabs
  if (argv.length === 0 || argv[0] === 'tabs') {
    const targets = await listTargets()
    return targets.length ? targets.map((t, i) => `${i + 1}. ${t.url}`).join('\n') : 'No tabs open'
  }

  // new [payload]
  if (argv[0] === 'new') {
    const target = await fetch(`${BASE}/json/new`, { method: 'PUT' }).then(r => r.json()) as Target
    if (!argv[1]) return 'New tab opened'
    const session = await openSession(target.webSocketDebuggerUrl)
    const out = await dispatch(session, argv[1])
    session.close()
    return out
  }

  // close [tab]
  if (argv[0] === 'close') {
    const targets = await listTargets()
    const target = resolvePage(targets, argv[1])
    if (!target) throw new Error(`Tab not found: ${argv[1] ?? '(first)'}`)
    await fetch(`${BASE}/json/close/${target.id}`)
    return `Closed: ${target.url}`
  }

  // [tab] payload  OR  payload (no tab)
  const tab = argv.length >= 2 ? argv[0] : undefined
  const payload = argv.length >= 2 ? argv[1] : argv[0]
  const targets = await listTargets()
  const target = resolvePage(targets, tab)
  if (!target) throw new Error(`Tab not found: ${tab ?? '(first)'}`)
  const session = await openSession(target.webSocketDebuggerUrl)
  const out = await dispatch(session, payload)
  session.close()
  return out
}

// ---- Unix socket server (Bun) ----

try { Bun.spawnSync(['rm', '-f', SOCK]) } catch {}

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
