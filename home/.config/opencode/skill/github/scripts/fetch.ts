import { request } from './utils'

const url = process.argv[2]
if (!url) {
  console.error('Usage: bun fetch.ts <github_url>')
  process.exit(1)
}

const parse = (url: string) => {
  if (url.includes('raw.githubusercontent.com')) {
    return { rawUrl: url }
  }

  const issueMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/)
  if (issueMatch) {
    const [, owner, repo, issueNumber] = issueMatch
    return { owner, repo, issueNumber, isPr: false }
  }

  const prMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  if (prMatch) {
    const [, owner, repo, prNumber] = prMatch
    return { owner, repo, issueNumber: prNumber, isPr: true }
  }

  const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/(blob|tree)\/([^/]+)(?:\/(.*))?)?/)
  if (match) {
    const [, owner, repo, type = 'tree', ref = 'main', path = ''] = match
    return { owner, repo, type, ref, path }
  }
}

const data = parse(url) as any
if (!data) {
  console.error('Invalid GitHub URL')
  process.exit(1)
}

const cleanBody = (body: string) => {
  return body
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove MD images
    .replace(/<img\s+[^>]*?>/g, '') // Remove HTML images
    .replace(/^\s*>.*$/gm, '') // Remove blockquotes
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .join('\n')
    .trim()
}

const getReactions = (r: any) => {
  if (!r) return ''
  const map: any = {
    '+1': '👍',
    '-1': '👎',
    laugh: '😄',
    hooray: '🎉',
    confused: '😕',
    heart: '❤️',
    rocket: '🚀',
    eyes: '👀'
  }
  return Object.entries(map)
    .map(([k, emoji]) => (r[k] > 0 ? `${emoji} ${r[k]}` : ''))
    .filter(Boolean)
    .join(' ')
}

const fetchIssue = async (owner: string, repo: string, number: string) => {
  try {
    const [issue, comments] = await Promise.all([
      request(`/repos/${owner}/${repo}/issues/${number}`),
      request(`/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`)
    ])

    const cleanedBody = cleanBody(issue.body ?? '')
    const cleanedComments = (comments as any[])
      .map(c => ({
        user: c.user.login,
        body: cleanBody(c.body),
        reactions: c.reactions?.total_count || 0,
        reactionDetails: getReactions(c.reactions),
        created_at: c.created_at
      }))
      .filter(c => c.body)
      .sort((a, b) => b.reactions - a.reactions)
      .slice(0, 20)
      // Prioritize most reacted comments, but display them chronologically for context.
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    console.log(`<issue>
# ${issue.title}
State: ${issue.state}

${cleanedBody}

<comments>
${cleanedComments
  .map(c => `User: ${c.user} ${c.reactionDetails ? `(${c.reactionDetails})` : ''}\n${c.body}`)
  .join('\n\n')}
</comments>
</issue>`)
  } catch (e: any) {
    console.error(e.message)
    process.exit(1)
  }
}

const fetchPR = async (owner: string, repo: string, number: string) => {
  try {
    const [pr, reviewComments] = await Promise.all([
      request(`/repos/${owner}/${repo}/pulls/${number}`),
      request(`/repos/${owner}/${repo}/pulls/${number}/comments?per_page=100`)
    ])

    const cleanedBody = cleanBody(pr.body ?? '')

    const cleanedComments = (reviewComments as any[])
      .map(c => {
        const line = c.line || c.original_line
        const start = c.start_line || c.original_start_line
        const lineInfo = start && start !== line ? `${start}-${line}` : `${line}`
        return {
          id: c.id,
          user: c.user.login,
          body: cleanBody(c.body),
          created_at: c.created_at,
          meta: `[${c.path}:${lineInfo}]`
        }
      })
      .filter(c => c.body)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    console.log(`<pr>
State: ${pr.state} | Merged: ${pr.merged}
Branch: ${pr.head.ref} -> ${pr.base.ref}

${cleanedBody}

<comments>
${cleanedComments.map(c => `[${c.id}] User: ${c.user} ${c.meta}\n${c.body}`).join('\n\n')}
</comments>
</pr>`)
  } catch (e: any) {
    console.error(e.message)
    process.exit(1)
  }
}

if (data.issueNumber) {
  if (data.isPr) {
    await fetchPR(data.owner, data.repo, data.issueNumber)
  } else {
    await fetchIssue(data.owner, data.repo, data.issueNumber)
  }
} else if (data.rawUrl || (data.path && data.type === 'blob')) {
  // Direct raw URL or constructed
  const rawUrl = data.rawUrl || `https://raw.githubusercontent.com/${data.owner}/${data.repo}/${data.ref}/${data.path}`

  try {
    const res = await fetch(rawUrl)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    console.log(await res.text())
  } catch (e: any) {
    console.error(e.message)
    process.exit(1)
  }
} else {
  const { owner, repo, ref, path } = data

  try {
    const items = await request<any[]>(`/repos/${owner}/${repo}/contents/${path}?ref=${ref}`)
    if (!Array.isArray(items)) throw new Error('Not a directory')

    const output = items
      .map(item => (item.type == 'dir' ? `${item.name}/` : item.name))
      .sort()
      .join('\n')

    console.log(output)

    const readmeItem = items.find(item => item.name.toLowerCase() === 'readme.md')
    if (readmeItem) {
      console.log('\n<readme>')
      const res = await fetch(readmeItem.download_url)
      if (res.ok) {
        console.log(cleanBody(await res.text()))
      }
      console.log('</readme>')
    }
  } catch (error: any) {
    console.error(error.message)
    process.exit(1)
  }
}
