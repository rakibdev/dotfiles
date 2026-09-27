export const excludeDir = (files: string[], dir: string) => files.filter(f => !f.startsWith(`${dir}/`))

export const parseUrl = (input: string) => {
  const [, owner, repo, , branch, subdir] =
    input.match(/github\.com[/:]([^/]+)\/([^/\s]+?)(\/tree\/([^/]+)(\/.*)?)?$/) ?? []
  return { owner, repo, branch, subdir: subdir?.slice(1) }
}
