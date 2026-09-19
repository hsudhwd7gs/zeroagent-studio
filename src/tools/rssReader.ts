// RSS / Atom feed reader — parses any RSS or Atom XML feed and returns the latest items.

export async function runRssReader(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('RSS feed URL required')
  const limit = parseInt(config.limit ?? '10', 10)

  // Use the worker's cached-proxy to avoid CORS issues
  const workerUrl = window.location.origin
  const proxied = `${workerUrl}/api/proxy?url=${encodeURIComponent(url)}`
  const res = await fetch(proxied)
  if (!res.ok) throw new Error(`Failed to fetch feed: ${res.status}`)
  const xml = await res.text()
  const doc = new DOMParser().parseFromString(xml, 'text/xml')

  // Detect RSS vs Atom
  const isAtom = !!doc.querySelector('feed > entry')
  const itemEls = Array.from(doc.querySelectorAll(isAtom ? 'entry' : 'item')) as Element[]
  const items = itemEls.slice(0, limit).map((el) => {
    const getText = (sel: string) => el.querySelector(sel)?.textContent?.trim() ?? ''
    return {
      title: getText('title'),
      link: isAtom
        ? el.querySelector('link')?.getAttribute('href') ?? ''
        : getText('link'),
      description: getText('description') || getText('summary') || getText('content'),
      pubDate: getText('pubDate') || getText('published') || getText('updated'),
      author: getText('author') || getText('dc:creator') || getText('name'),
      guid: getText('guid') || getText('id'),
    }
  })

  const feedTitle = doc.querySelector('channel > title, feed > title')?.textContent?.trim() ?? url
  return JSON.stringify({ ok: true, feed: feedTitle, url, count: items.length, items }, null, 2)
}
