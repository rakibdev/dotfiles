const token = process.env.GITHUB_PAT
if (!token) {
  console.error("Error: GITHUB_PAT env not set")
  process.exit(1)
}

export const request = async <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
  const url = endpoint.startsWith("http") ? endpoint : `https://api.github.com${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`)
  return res.json()
}
