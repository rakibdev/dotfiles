import { request } from "./utils"

const [owner, repo, prNumber, method = "get", ...rest] = process.argv.slice(2)
const base = `/repos/${owner}/${repo}/pulls/${prNumber}`

type PR = {
  number: number
  title: string
  state: string
  merged: boolean
  body: string | null
  html_url: string
  user: { login: string }
  head: { ref: string; sha: string }
  base: { ref: string }
}

type File = {
  filename: string
  status: string
  additions: number
  deletions: number
}

type Comment = {
  user: { login: string }
  body: string
  path?: string
}

type Review = {
  id: number
  user: { login: string }
  state: string
  body: string
}

if (method == "get") {
  const pr = await request<PR>(base)
  console.log(`#${pr.number} ${pr.title}`)
  console.log(`State: ${pr.state} | Merged: ${pr.merged}`)
  console.log(`Author: @${pr.user.login}`)
  console.log(`Branch: ${pr.head.ref} → ${pr.base.ref}`)
  console.log(`HEAD: ${pr.head.sha}`)
  console.log(`URL: ${pr.html_url}`)
  if (pr.body) console.log(`\n${pr.body.slice(0, 500)}`)
} else if (method == "diff") {
  const res = await fetch(`https://api.github.com${base}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_PAT}`,
      Accept: "application/vnd.github.diff",
    },
  })
  console.log(await res.text())
} else if (method == "files") {
  const files = await request<File[]>(`${base}/files`)
  for (const f of files) {
    console.log(`[${f.status}] ${f.filename} (+${f.additions} -${f.deletions})`)
  }
} else if (method == "comments") {
  const comments = await request<Comment[]>(`${base}/comments`)
  for (const c of comments) {
    console.log(`@${c.user.login}${c.path ? ` on ${c.path}` : ""}:`)
    console.log(`  ${c.body.slice(0, 200)}\n`)
  }
} else if (method == "reviews") {
  const reviews = await request<Review[]>(`${base}/reviews`)
  for (const r of reviews) {
    console.log(`@${r.user.login} [${r.state}]`)
    if (r.body) console.log(`  ${r.body.slice(0, 200)}`)
    console.log()
  }
} else if (method == "review") {
  const [event = "COMMENT", ...bodyParts] = rest
  const body = bodyParts.join(" ") || ""
  const pr = await request<PR>(base)
  await request(`${base}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commit_id: pr.head.sha,
      body,
      event: event.toUpperCase(),
    }),
  })
  console.log(`Review submitted: ${event.toUpperCase()}`)
}
