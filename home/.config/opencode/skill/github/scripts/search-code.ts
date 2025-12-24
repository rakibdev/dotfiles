import { request } from "./utils"

const query = process.argv.slice(2).join(" ")

type CodeItem = {
  name: string
  path: string
  repository: { full_name: string }
  html_url: string
}

type SearchResult = {
  total_count: number
  items: CodeItem[]
}

const data = await request<SearchResult>(
  `/search/code?q=${encodeURIComponent(query)}&per_page=20`
)

console.log(`Found ${data.total_count} results\n`)
for (const item of data.items) {
  console.log(`${item.repository.full_name}/${item.path}`)
  console.log(`  ${item.html_url}\n`)
}
