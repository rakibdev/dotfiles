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
  id: number
  user: { login: string }
  body: string
  path: string
  line?: number
  start_line?: number
  in_reply_to_id?: number
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
  const threads = new Map<number, Comment[]>()
  const roots: Comment[] = []

  for (const c of comments) {
    if (c.in_reply_to_id) {
      const thread = threads.get(c.in_reply_to_id) || []
      thread.push(c)
      threads.set(c.in_reply_to_id, thread)
    } else {
      roots.push(c)
      threads.set(c.id, [])
    }
  }

  for (const root of roots) {
    const lineInfo = root.start_line ? `L${root.start_line}-${root.line}` : `L${root.line}`
    console.log(`[${root.id}] ${root.path}:${lineInfo} @${root.user.login}`)
    console.log(`  ${root.body.slice(0, 300)}`)
    const replies = threads.get(root.id) || []
    for (const reply of replies) {
      console.log(`  ↳ @${reply.user.login}: ${reply.body.slice(0, 200)}`)
    }
    console.log()
  }
} else if (method == "comment") {
  // comment <path> <line> <body> OR comment <path> <start_line> <end_line> <body>
  const pr = await request<PR>(base)
  const path = rest[0]
  const isRange = !isNaN(Number(rest[2])) && rest.length > 3

  if (isRange) {
    const [startLine, endLine, ...bodyParts] = rest.slice(1)
    await request(`${base}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commit_id: pr.head.sha,
        path,
        body: bodyParts.join(" "),
        start_line: Number(startLine),
        line: Number(endLine),
      }),
    })
    console.log(`Comment added: ${path}:L${startLine}-${endLine}`)
  } else {
    const [line, ...bodyParts] = rest.slice(1)
    await request(`${base}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commit_id: pr.head.sha,
        path,
        body: bodyParts.join(" "),
        line: Number(line),
      }),
    })
    console.log(`Comment added: ${path}:L${line}`)
  }
} else if (method == "reply") {
  // reply <comment_id> <body>
  const [commentId, ...bodyParts] = rest
  await request(`${base}/comments/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: bodyParts.join(" ") }),
  })
  console.log(`Reply added to comment ${commentId}`)

