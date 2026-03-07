export const request = async <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
  const url = endpoint.startsWith("http") ? endpoint : `https://api.github.com${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_PAT}`,
      Accept: "application/vnd.github+json",
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`)
  return res.json()
}

export const requestInternal = async (endpoint: string) => {
  const url = endpoint.startsWith("http") ? endpoint : `https://github.com${endpoint}`
  const res = await fetch(url, {
    headers: {
      // Note: Code search requires 'user_session' cookie. 'saved_user_sessions' only works for repo search.
      cookie: `user_session=${process.env.GITHUB_USER_SESSION}`,
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    },
  })
  if (!res.ok) throw new Error(`GitHub error: ${res.status}`)
  return res.text()
}

export const decodeHtml = (html: string) =>
  html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")

export const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export const parseCliArgs = () => {
  const args = process.argv.slice(2)
  const get = (key: string, defaultValue = "") => {
    const idx = args.findIndex((a) => a === key)
    if (idx !== -1) {
      const val = args[idx + 1]
      args.splice(idx, 2)
      return val
    }
    return defaultValue
  }
  return { args, get }
}
