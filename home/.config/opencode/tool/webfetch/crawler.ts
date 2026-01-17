import { chromium, type Page, type BrowserContext } from 'playwright-core'
import { USER_AGENT, PAGE_LOAD_TIMEOUT, SCROLL_DELAY } from './constants'
import { htmlToMarkdown } from './markdown'

export const crawlWithPlaywright = async (url: string): Promise<string> => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--headless']
  })

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1920, height: 1080 }
    })

    await injectStealthScripts(context)

    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_LOAD_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    await simulateUser(page)
    await scrollFullPage(page)

    await page.waitForTimeout(500)
    const content = await page.content()
    return htmlToMarkdown(content, url)
  } finally {
    await browser.close()
  }
}

const injectStealthScripts = async (context: BrowserContext) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })

    // @ts-expect-error
    window.chrome = { runtime: {} }

    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5].map(() => ({ name: 'Chrome PDF Plugin' }))
    })

    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    })

    const originalQuery = window.navigator.permissions.query
    window.navigator.permissions.query = (params: any) =>
      params.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : originalQuery(params)
  })
}

const simulateUser = async (page: Page) => {
  await page.mouse.move(100 + Math.random() * 200, 100 + Math.random() * 200)
  await page.mouse.down()
  await page.mouse.up()
  await page.keyboard.press('ArrowDown')
}

const scrollFullPage = async (page: Page) => {
  const viewportHeight = await page.evaluate(() => window.innerHeight)
  let scrollPosition = 0
  let maxScrolls = 20

  while (maxScrolls-- > 0) {
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    if (scrollPosition >= scrollHeight - viewportHeight) break

    scrollPosition += viewportHeight
    await page.evaluate((y) => window.scrollTo(0, y), scrollPosition)
    await page.waitForTimeout(SCROLL_DELAY)
  }

  await page.evaluate(() => window.scrollTo(0, 0))
}
