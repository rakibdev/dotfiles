import { request } from "./utils"

const [type, ...rest] = process.argv.slice(2)
const query = rest.join(" ")
const isType = type == "pr" ? "is:pr" : "is:issue"

type Issue = {
  number: number
  title: string
  state: string
  html_url: string
  user: { login: string }
}

type SearchResult = {
  total_count: number
  items: Issue[]
}

const data = await request<SearchResult>(
  `/search/issues?q=${encodeURIComponent(`${isType} ${query}`)}&per_page=20`
)

console.log(`Found ${data.total_count} ${type}s\n`)
for (const item of data.items) {
  console.log(`#${item.number} [${item.state}] ${item.title}`)
  console.log(`  by @${item.user.login}`)
  console.log(`  ${item.html_url}\n`)
}
