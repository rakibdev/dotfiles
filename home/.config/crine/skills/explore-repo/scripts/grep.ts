import { $ } from 'bun'
import { ensureClone, parseUrl } from './github'

const [input, pattern, ...extraUrls] = process.argv.slice(2)
const limit = 30
const maxWidth = 200
const maxFiles = 2000
const excludes = ['*.min.*', '*.map', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock', 'Cargo.lock', 'go.sum']

const { owner, repo, branch, subdir, dir, ref } = await ensureClone(input)
const subdirs = [subdir, ...extraUrls.map(url => parseUrl(url).subdir)].map(path => path || '.')
const lock = `${dir}.lock`

// Local trees only, no blob fetch. Guards against checking out a whole monorepo
const files = (await $`git -C ${dir} ls-tree -r --name-only ${ref} -- ${subdirs}`.text()).trim().split('\n').filter(Boolean)
if (!files.length) {
  console.error(`Path not found at ${branch}: ${subdirs.join(', ')}. Check with tree.ts`)
  process.exit(1)
}
if (files.length > maxFiles) {
  const counts = new Map<string, number>()
  for (const file of files) {
    const parent = subdirs.find(path => path !== '.' && file.startsWith(`${path}/`))
    const rest = parent ? file.slice(parent.length + 1) : file
    const [top] = rest.split('/')
    const key = rest.includes('/') ? `${parent ? `${parent}/` : ''}${top}` : ''
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const menu = [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([path, count]) => `  https://github.com/${owner}/${repo}/tree/${branch}/${path}  (${count} files)`)
  console.error(`Too large: ${files.length} files. Re-run with a subdir URL:\n${menu.join('\n')}`)
  process.exit(1)
}

// sparse-checkout + checkout fetches all missing blobs for these dirs in one request, cached for later calls
const sparse = subdirs.filter(path => path !== '.')
await $`flock -x ${lock} sh -c 'dir=$1 ref=$2; shift 2; git -C "$dir" sparse-checkout init --cone && { [ $# -eq 0 ] || git -C "$dir" sparse-checkout add "$@"; } && git -C "$dir" checkout --quiet --detach "$ref"' _ ${dir} ${ref} ${sparse}`.quiet()

const proc = Bun.spawn(
  [
    'flock', '-s', lock,
    'rg', '-n', '--no-heading', '--with-filename', '--hidden', '--no-ignore', '--max-count=5',
    '-g', '!.git',
    ...excludes.flatMap(glob => ['-g', `!${glob}`]),
    '-e', pattern, '--', ...subdirs
  ],
  { cwd: dir, stdout: 'pipe', stderr: 'pipe' }
)

const lines: string[] = []
let buffer = ''
let hasMore = false
const decoder = new TextDecoder()
for await (const chunk of proc.stdout) {
  buffer += decoder.decode(chunk, { stream: true })
  const parts = buffer.split('\n')
  buffer = parts.pop()!
  lines.push(...parts)
  if (lines.length > limit) {
    hasMore = true
    proc.kill()
    break
  }
}
if (!hasMore && buffer) lines.push(buffer)

if (!hasMore) {
  const code = await proc.exited
  if (code > 1 && !lines.length) throw new Error((await new Response(proc.stderr).text()).trim())
}

const matches = lines.slice(0, limit).map(line => {
  const [, path, lineNumber, text] = line.match(/^(.*?):(\d+):(.*)$/) ?? []
  const trimmed = text.trim()
  return { path, lineNumber, text: trimmed.length > maxWidth ? `${trimmed.slice(0, maxWidth)}…` : trimmed }
})

const output = matches
  .map(({ path, lineNumber, text }, i) => {
    const header = matches[i - 1]?.path !== path ? `${path}\n` : ''
    return `${header}${lineNumber}\t${text}`
  })
  .join('\n')

console.log(output || 'No matches')
if (hasMore) console.log('...more matches exist, scope with subdir URL or tighter regex')
