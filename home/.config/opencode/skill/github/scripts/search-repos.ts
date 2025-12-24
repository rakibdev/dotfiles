import { request } from "./utils"

const query = process.argv.slice(2).join(" ")

type Repo = {
  full_name: string
  description: string | null
  stargazers_count: number
  html_url: string
}

type SearchResult = {
  total_count: number
  items: Repo[]
}

const data = await request<SearchResult>(
  `/search/repositories?q=${encodeURIComponent(query)}&sort=updated&per_page=20`
)

console.log(`Found ${data.total_count} repos\n`)
for (const repo of data.items) {
  console.log(`★${repo.stargazers_count} ${repo.full_name}`)
  if (repo.description) console.log(`  ${repo.description.slice(0, 80)}`)
  console.log(`  ${repo.html_url}\n`)
}
