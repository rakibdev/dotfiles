export const TIMEOUT = 5_000
export const PAGE_LOAD_TIMEOUT = 30_000
export const SCROLL_DELAY = 100
export const MIN_CONTENT_LENGTH = 250

export const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

export const BLOCKED_INDICATORS = [
  'access denied',
  'please verify you are human',
  'checking your browser',
  'enable javascript',
  'just a moment',
  'captcha',
  'security check',
  'bot detection',
  'are you a robot'
]

export const NOISE_PATTERNS = /nav|footer|header|sidebar|ads?|comment|promo|advert|social|share|widget|popup|modal|cookie|banner|newsletter/i

export const IMPORTANT_ATTRS = new Set([
  'href', 'title', 'type', 'name', 'content', 'property', 'rel'
])

export const TAG_WEIGHTS: Record<string, number> = {
  article: 25, main: 20, section: 5,
  h1: 10, h2: 8, h3: 6, h4: 4, h5: 3, h6: 2,
  p: 5, blockquote: 5, pre: 5, code: 3,
  ul: 3, ol: 3, li: 1,
  table: 5, tr: 1, td: 1, th: 2,
  figure: 3, figcaption: 2,
  div: 0, span: 0, aside: -10, nav: -15, footer: -15, header: -5
}

export const BYPASS_TAGS = new Set([
  'br', 'hr', 'input', 'wbr', 'iframe'
])

export const isMarkdown = (text: string) =>
  text.startsWith('# ') || text.startsWith('---\n')

export const isBlocked = (text: string) =>
  BLOCKED_INDICATORS.some(i => text.toLowerCase().includes(i))
