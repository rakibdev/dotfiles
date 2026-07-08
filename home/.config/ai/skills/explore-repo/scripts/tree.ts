import { $ } from 'bun'

const input = process.argv[2]
const [, owner, repo, , branchInUrl, subdir] =
  input.match(/github\.com[/:]([^/]+)\/([^/\s]+?)(\/tree\/([^/]+)(\/.*)?)?$/) ?? []
const localPath = `/tmp/github/${owner}/${repo}`
const repoUrl = `https://github.com/${owner}/${repo}`

if (!(await Bun.file(localPath + '/.git/HEAD').exists())) {
  await $`git clone --filter=blob:none --no-checkout --depth=1 --quiet ${repoUrl} ${localPath}`
}

const branch =
  branchInUrl ??
  (await $`git ls-remote --symref ${repoUrl} HEAD`.text()).match(/ref: refs\/heads\/(\S+)\s+HEAD/)?.[1] ??
  'main'
const subdirPath = subdir?.replace(/^\//, '') || '.'
const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`

const files = (await $`git -C ${localPath} ls-tree -r --name-only HEAD -- ${subdirPath}`.text())
  .trim()
  .split('\n')
  .filter(Boolean)

const tree: Record<string, any> = {}
for (const file of files) {
  const parts = file.split('/')
  let node = tree
  for (const part of parts) node = node[part] ??= {}
}

const render = (node: Record<string, any>, prefix = ''): string => {
  const keys = Object.keys(node).sort((a, b) => {
    const aDir = Object.keys(node[a]).length > 0
    const bDir = Object.keys(node[b]).length > 0
    if (aDir !== bDir) return aDir ? -1 : 1
    return a.localeCompare(b)
  })
  return keys
    .map((key, i) => {
      const isLast = i === keys.length - 1
      const connector = isLast ? '└' : '├'
      const children = node[key]
      const isDir = Object.keys(children).length > 0
      const line = `${prefix}${connector}${key}${isDir ? '/' : ''}`
      if (isDir) {
        const childPrefix = prefix + (isLast ? ' ' : '│')
        return line + '\n' + render(children, childPrefix)
      }
      return line
    })
    .join('\n')
}

console.log(`Raw url: ${rawBase}`)
console.log(render(tree))
