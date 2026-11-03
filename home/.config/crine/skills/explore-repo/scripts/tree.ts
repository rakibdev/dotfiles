import { $ } from 'bun'
import { ensureClone, excludeDir } from './github'

const { owner, repo, branch, subdir, dir, ref } = await ensureClone(process.argv[2])
const subdirPath = subdir || '.'
const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`

const files = excludeDir(
  (await $`git -C ${dir} ls-tree -r --name-only ${ref} -- ${subdirPath}`.text())
    .trim()
    .split('\n')
    .filter(Boolean),
  '.github'
)

if (!files.length) {
  console.error(`Path not found at ${branch}: ${subdirPath}`)
  process.exit(1)
}

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
    .map(key => {
      const children = node[key]
      const dir = isDir(children)
      const line = `${prefix}${key}${dir ? '/' : ''}`
      if (dir) {
        if (isPastSubdir && relativeDepth >= maxDepth - 1) return line
        return `${line}\n${render(children, prefix + '  ', currentDepth + 1)}`
      }
      return line
    })
    .join('\n')
}

console.log(`Scope URL: https://github.com/${owner}/${repo}/tree/${branch}/<dir>   (for tree.ts / grep.ts)`)
console.log(`Raw URL: ${rawBase}/<path>   (webfetch/curl one file)`)
console.log(render(tree))
