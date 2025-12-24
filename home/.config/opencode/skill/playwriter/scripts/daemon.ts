import { chromium, type Page, type BrowserContext, type Browser } from 'playwright-core'
import vm from 'node:vm'

const SOCK = '/tmp/playwriter.sock'
const WS_PORT = 19988
const INACTIVITY_TIMEOUT = 3 * 60 * 1000
const CONNECTION_TIMEOUT = 60_000

let browser: Browser | null = null
let context: BrowserContext | null = null
let page: Page | null = null
let inactivityTimer: Timer | null = null

const userState: Record<string, unknown> = {}

const usefulGlobals = {
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  URL,
  URLSearchParams,
  fetch,
  Buffer,
  TextEncoder,
  TextDecoder,
  crypto,
  AbortController,
  AbortSignal,
  structuredClone
}

const cleanup = async () => {
  if (browser) {
    try {
      await browser.close()
    } catch {}
  }
  try {
    await Bun.$`rm -f ${SOCK}`.quiet()
  } catch {}
  process.exit(0)
}

const resetInactivityTimer = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(cleanup, INACTIVITY_TIMEOUT)
}

const ensureConnection = async (): Promise<{ page: Page; context: BrowserContext }> => {
  if (browser && context && page) {
    try {
      await page.evaluate(() => true)
      return { page, context }
    } catch {
      browser = null
      context = null
      page = null
    }
  }

  const cdpUrl = `ws://127.0.0.1:${WS_PORT}/cdp/${Math.random().toString(36).slice(2)}`
  const start = Date.now()

  console.log('Waiting for extension connection...')

  while (Date.now() - start < CONNECTION_TIMEOUT) {
    try {
      browser = await chromium.connectOverCDP(cdpUrl, { timeout: 3000 })
      console.log('Connected!')
      break
    } catch {
      await Bun.sleep(500)
    }
  }

  if (!browser) {
    throw new Error('Timeout waiting for extension. Click extension icon on a tab.')
  }

  const contexts = browser.contexts()
  context = contexts.length ? contexts[0] : await browser.newContext()

  const pages = context.pages()
  if (!pages.length) {
    throw new Error('No browser tabs connected. Click the extension icon on a tab.')
  }
  page = pages[0]

  return { page, context }
}

const execute = async (code: string, timeout = 5000): Promise<string> => {
  resetInactivityTimer()

  const logs: { method: string; args: unknown[] }[] = []
  const customConsole = {
    log: (...args: unknown[]) => logs.push({ method: 'log', args }),
    info: (...args: unknown[]) => logs.push({ method: 'info', args }),
    warn: (...args: unknown[]) => logs.push({ method: 'warn', args }),
    error: (...args: unknown[]) => logs.push({ method: 'error', args }),
    debug: (...args: unknown[]) => logs.push({ method: 'debug', args })
  }

  const { page: p, context: ctx } = await ensureConnection()

  const vmContext = vm.createContext({
    page: p,
    context: ctx,
    state: userState,
    console: customConsole,
    require,
    ...usefulGlobals
  })

  const result = await Promise.race([
    vm.runInContext(`(async () => { ${code} })()`, vmContext, { timeout }),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout))
  ])

  let output = ''
  for (const { method, args } of logs) {
    const formatted = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')
    output += `[${method}] ${formatted}\n`
  }

  if (result !== undefined) {
    output += `Return: ${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}`
  } else if (!logs.length) {
    output = 'OK'
  }

  return output.trim()
}

const handleRequest = async (data: string): Promise<string> => {
  try {
    const { code, timeout } = JSON.parse(data) as { code: string; timeout?: number }
    const result = await execute(code, timeout)
    return JSON.stringify({ ok: true, result })
  } catch (error: any) {
    return JSON.stringify({ ok: false, error: error.message })
  }
}

// Cleanup old socket
try {
  await Bun.$`rm -f ${SOCK}`.quiet()
} catch {}

const server = Bun.listen({
  unix: SOCK,
  socket: {
    async data(socket, data) {
      const response = await handleRequest(data.toString())
      socket.write(response)
      socket.end()
    },
    error(_, error) {
      console.error('Socket error:', error.message)
    }
  }
})

console.log(`Daemon listening on ${SOCK}`)
resetInactivityTimer()

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
