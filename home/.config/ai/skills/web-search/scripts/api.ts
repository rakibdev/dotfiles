const API_URL = 'https://mcp.exa.ai/mcp'

type McpResponse = {
  result: {
    content: { type: string; text: string }[]
  }
}

async function search(query: string, numResults = 20, offset = 0) {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'web_search_exa',
      arguments: {
        query,
        numResults,
        offset,
        type: 'auto'
      }
    }
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!res.ok) throw new Error(`Search failed: ${res.status}`)

  const text = await res.text()
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      const data: McpResponse = JSON.parse(line.slice(6))
      if (data.result?.content?.length) {
        const content = data.result.content[0].text

        const results = []
        let current: { title?: string; url?: string; date?: string; timestamp?: number } = {}

        for (const l of content.split('\n')) {
          if (l.startsWith('Title: ')) {
            if (current.title) results.push(current)
            current = { title: l.slice(7).trim() }
          } else if (l.startsWith('URL: ')) {
            current.url = l.slice(5).trim()
          } else if (l.startsWith('Published: ')) {
            const raw = l.slice(11).trim()
            if (raw !== 'N/A') {
              const d = new Date(raw)
              current.timestamp = d.getTime()
              current.date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            }
          }
        }
        if (current.title) results.push(current)

        // Rank by 1 year ago. Naive sort-by-date would ruin Exa's original order.
        const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
        const recent = results.filter(r => r.timestamp && r.timestamp >= oneYearAgo)
        const rest = results.filter(r => !r.timestamp || r.timestamp < oneYearAgo)
        const sorted = [...recent, ...rest]

        return sorted.map((r, i) => `${i + 1}. ${r.title}\n${r.url}${r.date ? ` | ${r.date}` : ''}`).join('\n')
      }
    }
  }
  return 'No results'
}

export { search }
