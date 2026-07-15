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
const subdirPath = subdir?.slice(1) || '.'
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

const startDepth = subdirPath === '.' ? 0 : subdirPath.split('/').length
const maxDepth = 3

const isDir = (val: Record<string, any>) => Object.keys(val).length > 0

const render = (node: Record<string, any>, prefix = '', currentDepth = 0): string => {
  const keys = Object.keys(node).sort((a, b) => 
    Number(isDir(node[b])) - Number(isDir(node[a])) || a.localeCompare(b)
  )
  const isPastSubdir = currentDepth >= startDepth
  const relativeDepth = isPastSubdir ? currentDepth - startDepth : 0

  return keys
    .map((key, i) => {
      const isLast = i === keys.length - 1
      const connector = isLast ? '└─' : '├─'
      const children = node[key]
      const dir = isDir(children)
      const line = `${prefix}${connector}${key}${dir ? '/' : ''}`
      if (dir) {
        if (isPastSubdir && relativeDepth >= maxDepth - 1) return line
        const childPrefix = prefix + (isLast ? '  ' : '│ ')
        return `${line}\n${render(children, childPrefix, currentDepth + 1)}`
      }
      return line
    })
    .join('\n')
}

console.log(`Raw url: ${rawBase}`)
console.log(render(tree))
