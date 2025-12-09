import { tool } from "@opencode-ai/plugin"
import TurndownService from "turndown"
import { $ } from "bun"

const TIMEOUT = 30_000

const toRawUrl = (url: string) => {
  const match = url.match(/^(https?):\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/)
  if (match) return `${match[1]}://raw.githubusercontent.com/${match[2]}/${match[3]}/${match[4]}`
}

const DESCRIPTION = `Fetches URL content and converts to markdown.

- URL must be fully-formed (http:// or https://)
- Read-only, does not modify files
- Results may be summarized if content is large`

export default tool({
  description: DESCRIPTION,
  args: {
    url: tool.schema.string().describe("The URL to fetch content from"),
  },
  async execute(args) {
    if (!args.url.startsWith("http://") && !args.url.startsWith("https://")) {
      throw new Error("URL must start with http:// or https://")
    }

    const url = toRawUrl(args.url) ?? args.url

    const html = await $`lightpanda fetch --dump --strip_mode full --http_timeout ${TIMEOUT} ${url}`
      .text()
      .catch((error: any) => {
        throw new Error(`Lightpanda fetch failed: ${error.message}`)
      })

    return toMarkdown(html)
  },
})

function toMarkdown(html: string) {
  const turndown = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  })

  turndown.remove(["script", "style", "meta", "link", "nav", "footer", "header", "aside"])

  turndown.addRule("removeEmpty", {
    filter: (node) => {
      const tag = node.nodeName.toLowerCase()
      if (["div", "span", "p"].includes(tag)) {
        return !node.textContent?.trim()
      }
      return false
    },
    replacement: () => "",
  })

  return (
    turndown
      .turndown(html)
      // [](url) -> empty
      .replace(/\[\s*\]\([^)]*\)/g, "")
      // [text](url "text") -> [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\s+"[^"]*"\)/g, "[$1]($2)")
      // [.github](...)\n\n[.github](...) -> [.github](...)
      .replace(/\[([^\]]+)\]\([^)]+\)\s*\n+\s*\[\1\]\([^)]+\)/g, (m) => m.match(/\[[^\]]+\]\([^)]+\)/)?.[0] ?? m)
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  )
}
