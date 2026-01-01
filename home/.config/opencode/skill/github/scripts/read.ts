const url = process.argv[2]
if (!url) {
  console.error('Usage: bun read.ts <github_url>')
  process.exit(1)
}

const parse = (url: string) => {
  if (url.includes('raw.githubusercontent.com')) {
    return { type: 'blob', url }
  }

  const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/(blob|tree)\/([^/]+)(?:\/(.*))?)?/)
  if (!match) return

  const [, owner, repo, type = 'tree', ref = 'main', path = ''] = match
  return { owner, repo, type, ref, path }
}

const data = parse(url)
if (!data) {
  console.error('Invalid GitHub URL')
  process.exit(1)
}

if (data.type === 'blob') {
  // Direct raw URL or constructed
  const rawUrl = data.url || `https://raw.githubusercontent.com/${data.owner}/${data.repo}/${data.ref}/${data.path}`

  try {
    const res = await fetch(rawUrl)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    console.log(await res.text())
  } catch (e: any) {
    console.error(e.message)
    process.exit(1)
  }
} else {
  // Directory listing via GitChamber
  // https://gitchamber.com/repos/{owner}/{repo}/{ref}/files/{path}?glob=*
  const { owner, repo, ref, path } = data
  const baseUrl = `https://gitchamber.com/repos/${owner}/${repo}/${ref}/files`
  const cleanPath = path.replace(/^\/+/, '').replace(/\/+$/, '')
  const glob = cleanPath ? `${cleanPath}/**` : '**'

  try {
    const res = await fetch(`${baseUrl}?glob=${glob}`)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)

    const files = await res.json()
    if (!Array.isArray(files)) throw new Error('Invalid response')

    // Filter for immediate children
    const prefix = cleanPath ? `${cleanPath}/` : ''
    const immediate = new Set<string>()

    files.forEach((path: string) => {
      if (!path.startsWith(prefix)) return
      const rel = path.slice(prefix.length)
      if (!rel) return

      const parts = rel.split('/')
      if (parts.length === 1) {
        immediate.add(parts[0])
      } else {
        immediate.add(`${parts[0]}/`)
      }
    })

    console.log(Array.from(immediate).sort().join('\n'))
  } catch (error: any) {
    console.error(error.message)
    process.exit(1)
  }
}
