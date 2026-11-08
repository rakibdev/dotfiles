import { $ } from 'bun'

export const excludeDir = (files: string[], dir: string) => files.filter(f => !f.startsWith(`${dir}/`))

export const parseUrl = (input: string) => {
  const [, owner, repo, , branch, subdir] =
    input.match(/github\.com[/:]([^/]+)\/([^/\s]+?)(\/tree\/([^/]+)(\/.*)?)?$/) ?? []
  return { owner, repo, branch, subdir: subdir?.slice(1) }
}

// Shared partial clone (trees only, blobs fetched on demand) reused by tree.ts and grep.ts
export const ensureClone = async (input: string) => {
  const { owner, repo, branch: branchInUrl, subdir } = parseUrl(input)
  const dir = `/tmp/github/${owner}-${repo}`
  const lock = `${dir}.lock`
  const repoUrl = `https://github.com/${owner}/${repo}`
  await $`mkdir -p /tmp/github`

  await $`flock ${lock} sh -c '[ -e "$1/.git/HEAD" ] || git clone --filter=blob:none --no-checkout --depth=1 --quiet "$2" "$1"' _ ${dir} ${repoUrl}`

  const branch = branchInUrl ?? (await $`git -C ${dir} symbolic-ref --short HEAD`.text()).trim()
  let ref = 'HEAD'
  if (branchInUrl) {
    // fetched once per branch, then served from cache until /tmp is cleared
    const cached = `refs/cache/${branchInUrl}`
    await $`git -C ${dir} rev-parse --verify --quiet ${cached} || flock ${lock} git -C ${dir} fetch --depth=1 --filter=blob:none --quiet origin +${branchInUrl}:${cached}`.quiet()
    ref = (await $`git -C ${dir} rev-parse ${cached}`.text()).trim()
  }
  return { owner, repo, branch, subdir, dir, ref }
}
