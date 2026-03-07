import { request } from "./utils"

const [owner, repo, prNumber, method, ...rest] = process.argv.slice(2)
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

if (method == "diff") {
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
} else if (method == "comment") {
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
  const [commentId, ...bodyParts] = rest
  await request(`${base}/comments/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: bodyParts.join(" ") }),
  })
  console.log(`Reply added to comment ${commentId}`)
}

