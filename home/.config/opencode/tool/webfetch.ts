import { tool } from '@opencode-ai/plugin'
import { TIMEOUT, USER_AGENT, MIN_CONTENT_LENGTH, isMarkdown, isBlocked } from './webfetch/constants'
import { htmlToMarkdown } from './webfetch/markdown'
import { crawlWithPlaywright } from './webfetch/crawler'

export { extractNavLinks } from './webfetch/markdown'

const DESCRIPTION = `Fetches URL content as markdown.
- URL must be fully-formed (http:// or https://)
- Uses Playwright for JS-rendered content`

export default tool({
  description: DESCRIPTION,
  args: {
    url: tool.schema.string().describe('The URL to fetch content from')
  },
  async execute(args) {
    if (!args.url.startsWith('http://') && !args.url.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://')
    }

    const url = args.url
    const mdUrl = url.replace(/\.md($|\/)/, '$1').replace(/\/$/, '') + '.md'

    const [mdResult, htmlResult] = await Promise.allSettled([
      fetch(mdUrl, {
        signal: AbortSignal.timeout(TIMEOUT),
        headers: { 'User-Agent': USER_AGENT }
      }).then(async res => {
        if (!res.ok) throw new Error(res.statusText)
        return res.text()
      }),
      fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT),
        headers: { 'User-Agent': USER_AGENT }
      }).then(async res => {
        if (res.status == 404) throw new Error('404 Not Found')
        return res.text()
      })
    ])

    if (mdResult.status == 'fulfilled' && isMarkdown(mdResult.value)) return mdResult.value
    if (htmlResult.status == 'rejected') throw htmlResult.reason

    const markdown = htmlToMarkdown(htmlResult.value, url)

    if (markdown.length > MIN_CONTENT_LENGTH && !isBlocked(markdown)) {
      return markdown
    }

    return crawlWithPlaywright(url)
  }
})
