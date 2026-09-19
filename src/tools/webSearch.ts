// Web Search node — uses DuckDuckGo's HTML endpoint (no key) or Wikipedia's API.

interface SearchResult {
  title: string
  url: string
  snippet: string
}

interface SearxResponse {
  results?: Array<{ title?: string; url?: string; content?: string }>
}

interface WikipediaSearchResponse {
  query?: { search?: Array<{ title?: string; pageid?: number; snippet?: string }> }
}

export async function runWebSearch(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const query = config.query?.trim() || input.trim()
  if (!query) throw new Error('query required')
  const engine = config.engine ?? 'duckduckgo'
  const limit = parseInt(config.limit ?? '8', 10)
  const workerUrl = window.location.origin

  if (engine === 'duckduckgo') {
    const res = await fetch(`${workerUrl}/api/proxy?url=${encodeURIComponent(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`)}`)
    if (!res.ok) throw new Error(`DuckDuckGo failed: ${res.status}`)
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const results: SearchResult[] = []
    const resultEls = doc.querySelectorAll('.result, .web-result')
    resultEls.forEach((el) => {
      const a = el.querySelector('.result__a, .result-title')
      const snippet = el.querySelector('.result__snippet, .result-snippet')?.textContent?.trim()
      if (a) {
        const title = a.textContent?.trim() ?? ''
        const url = (a as HTMLAnchorElement).href
          .replace(/^https?:\/\/duckduckgo\.com\/l\/\?uddg=/, '')
          .replace(/&rut=[^&]+$/, '')
        try { results.push({ title, url: decodeURIComponent(url), snippet: snippet ?? '' }) } catch { /* ignore */ }
        if (results.length >= limit) return
      }
    })
    return JSON.stringify({ ok: true, engine, query, count: results.length, results }, null, 2)
  }

  if (engine === 'wikipedia') {
    return await wikipediaSearch(query, limit)
  }

  if (engine === 'searx') {
    // Use a public SearX instance — be mindful of each instance's terms
    const searxUrl = 'https://searx.be/search'
    const res = await fetch(`${workerUrl}/api/proxy?url=${encodeURIComponent(`${searxUrl}?q=${encodeURIComponent(query)}&format=json`)}`)
    if (!res.ok) throw new Error(`SearX failed: ${res.status}`)
    const data = await res.json() as SearxResponse
    const results: SearchResult[] = (data.results ?? []).slice(0, limit).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.content ?? '',
    }))
    return JSON.stringify({ ok: true, engine, query, count: results.length, results }, null, 2)
  }

  throw new Error(`Unknown engine: ${engine}`)
}

async function wikipediaSearch(query: string, limit: number): Promise<string> {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&origin=*`,
  )
  if (!res.ok) throw new Error(`Wikipedia search failed: ${res.status}`)
  const data = await res.json() as WikipediaSearchResponse
  const results = (data.query?.search ?? []).map((s) => ({
    title: s.title ?? '',
    url: `https://en.wikipedia.org/?curid=${s.pageid}`,
    snippet: s.snippet?.replace(/<[^>]+>/g, '') ?? '',
  }))
  return JSON.stringify({ ok: true, engine: 'wikipedia', query, count: results.length, results }, null, 2)
}
