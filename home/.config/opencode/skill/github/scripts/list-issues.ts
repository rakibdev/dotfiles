import { request } from "./utils"

const [owner, repo, state = "open"] = process.argv.slice(2)

type Issue = {
  number: number
  title: string
  state: string
  labels: { name: string }[]
  user: { login: string }
  html_url: string
}

const issues = await request<Issue[]>(
  `/repos/${owner}/${repo}/issues?state=${state}&per_page=20`
)

console.log(`Issues for ${owner}/${repo} (${state})\n`)
for (const issue of issues) {
  const labels = issue.labels.map((l) => l.name).join(", ")
  console.log(`#${issue.number} ${issue.title}`)
  console.log(`  by @${issue.user.login}${labels ? ` | ${labels}` : ""}`)
  console.log(`  ${issue.html_url}\n`)
}
