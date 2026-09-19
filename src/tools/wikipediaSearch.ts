// Wikipedia node — search, summary (extract), or full page via Wikipedia Action API.

export async function runWikipediaSearch(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const query = config.query?.trim() || input.trim()
  if (!query) throw new Error('query required')
  const action = config.action ?? 'summary'
  const limit = parseInt(config.limit ?? '5', 10)

  if (action === 'search') {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&origin=*`,
    )
    if (!res.ok) throw new Error(`Wikipedia search failed: ${res.status}`)
    const data = await res.json() as any
    const items = (data.query?.search ?? []).map((s: any) => ({
      title: s.title,
      pageid: s.pageid,
      url: `https://en.wikipedia.org/?curid=${s.pageid}`,
      snippet: s.snippet?.replace(/<[^>]+>/g, ''),
      size: s.size,
      wordcount: s.wordcount,
    }))
    return JSON.stringify({ ok: true, action, query, count: items.length, items }, null, 2)
  }

  if (action === 'summary') {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
    )
    if (!res.ok) throw new Error(`Wikipedia summary failed: ${res.status}`)
    const data = await res.json() as any
    return JSON.stringify({
      ok: true,
      action,
      query,
      title: data.title,
      extract: data.extract,
      url: data.content_urls?.desktop?.page,
      thumbnail: data.thumbnail?.source,
    }, null, 2)
  }

  if (action === 'page') {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(query)}&prop=wikitext&format=json&origin=*`,
    )
    if (!res.ok) throw new Error(`Wikipedia page failed: ${res.status}`)
    const data = await res.json() as any
    return JSON.stringify({
      ok: true,
      action,
      query,
      title: data.parse?.title,
      pageid: data.parse?.pageid,
      wikitext: data.parse?.wikitext?.['*'],
    }, null, 2)
  }

  throw new Error(`Unknown action: ${action}`)
}
