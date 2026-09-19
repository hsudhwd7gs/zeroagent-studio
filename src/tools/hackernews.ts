// Hacker News node — uses the free, public HN Firebase API (no key).

export async function runHackernews(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const action = config.action ?? 'top'
  const limit = parseInt(config.limit ?? '10', 10)

  if (action === 'item') {
    const itemId = config.itemId?.trim() || input.trim()
    if (!itemId) throw new Error('itemId required for item action')
    const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`)
    if (!res.ok) throw new Error(`HN item fetch failed: ${res.status}`)
    return JSON.stringify(await res.json(), null, 2)
  }

  const endpointMap: Record<string, string> = {
    top: 'topstories',
    new: 'newstories',
    best: 'beststories',
    ask: 'askstories',
    show: 'showstories',
  }
  const endpoint = endpointMap[action] ?? 'topstories'
  const listRes = await fetch(`https://hacker-news.firebaseio.com/v0/${endpoint}.json`)
  if (!listRes.ok) throw new Error(`HN list fetch failed: ${listRes.status}`)
  const ids = (await listRes.json() as number[]).slice(0, limit)
  const items = await Promise.all(
    ids.map(async (id) => {
      const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      return r.ok ? r.json() : null
    })
  )
  return JSON.stringify({ ok: true, action, count: items.length, items }, null, 2)
}
