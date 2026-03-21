export const request = async <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_PAT}`,
      Accept: 'application/vnd.github+json',
      ...options?.headers
    }
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`)
  return res.json()
}

const getCookie = async (domain: string, name: string) => {
  const port = process.env.PLAYWRIGHT_PORT
  if (!port) throw new Error('PLAYWRIGHT_PORT not set')
  const base = `http://127.0.0.1:${port}`
  const [{ webSocketDebuggerUrl }] = await fetch(`${base}/json/list`).then(r => r.json())
  const ws = new WebSocket(webSocketDebuggerUrl)
  const cookies: { name: string; value: string }[] = await new Promise((resolve, reject) => {
    ws.onopen = () =>
      ws.send(JSON.stringify({ id: 1, method: 'Network.getCookies', params: { urls: [`https://${domain}`] } }))
    ws.onmessage = ({ data }) => {
      resolve(JSON.parse(data).result.cookies)
      ws.close()
    }
    ws.onerror = reject
  })
  return cookies.find(c => c.name === name)?.value
}

const cachePath = new URL('../cache.json', import.meta.url).pathname

const loadCache = async (): Promise<Record<string, string>> => {
  try {
    return await Bun.file(cachePath).json()
  } catch {
    return {}
  }
}

const saveCache = async (key: string, value: string) => {
  const cache = await loadCache()
  cache[key] = value
  await Bun.write(cachePath, JSON.stringify(cache, null, 2))
}

export const requestInternal = async (endpoint: string, retry = true): Promise<string> => {
  const cache = await loadCache()
  let session = cache['user_session']
  if (!session) {
    session = await getCookie('github.com', 'user_session')
    if (!session) throw new Error('No GitHub user_session found. Open github.com in browser.')
    await saveCache('user_session', session)
  }
  const url = endpoint.startsWith('http') ? endpoint : `https://github.com${endpoint}`
  const res = await fetch(url, {
    headers: {
      // Note: Code search requires 'user_session' cookie. 'saved_user_sessions' only works for repo search.
      cookie: `user_session=${session}`,
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
    }
  })
  if (res.status == 401 || res.status == 403) {
    if (!retry) throw new Error(`GitHub error: ${res.status}`)
    await saveCache('user_session', '')
    return requestInternal(endpoint, false)
  }
  if (!res.ok) throw new Error(`GitHub error: ${res.status}`)
  return res.text()
}

export const decodeHtml = (html: string) =>
  html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

export const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const parseCliArgs = () => {
  const args = process.argv.slice(2)
  const get = (key: string, defaultValue = '') => {
    const idx = args.findIndex(a => a === key)
    if (idx !== -1) {
      const val = args[idx + 1]
      args.splice(idx, 2)
      return val
    }
    return defaultValue
  }
  return { args, get }
}
