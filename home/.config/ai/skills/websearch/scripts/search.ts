const API_URL = "https://mcp.exa.ai/mcp"

type McpResponse = {
  result: {
    content: { type: string; text: string }[]
  }
}

async function search(query: string, numResults = 5) {
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "web_search_exa",
      arguments: {
        query,
        numResults,
        type: "auto",
      },
    },
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!res.ok) throw new Error(`Search failed: ${res.status}`)

  const text = await res.text()
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      const data: McpResponse = JSON.parse(line.slice(6))
      if (data.result?.content?.length) {
        const content = data.result.content[0].text

        const results = []
        let current: { title?: string; url?: string; date?: string } = {}

        for (const l of content.split("\n")) {
          if (l.startsWith("Title: ")) {
            if (current.title) results.push(current)
            current = { title: l.slice(7).trim() }
          } else if (l.startsWith("URL: ")) {
            current.url = l.slice(5).trim()
          } else if (l.startsWith("Published Date: ")) {
            current.date = l.slice(16).trim()
          }
        }
        if (current.title) results.push(current)

        return results
          .map((r) => {
            const date =
              r.date && !isNaN(Date.parse(r.date))
                ? new Date(r.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "No date"
            return `## ${r.title}\nURL: ${r.url}\nDate: ${date}`
          })
          .join("\n\n")
      }
    }
  }
  return "No results found"
}

export { search }

// Run CLI when executed directly, not when imported for tests
if (import.meta.main) {
  const query = process.argv.slice(2).join(" ")

  if (!query) {
    console.log("Usage: bun search.ts <query>")
    process.exit(1)
  }

  console.log(await search(query))
}
