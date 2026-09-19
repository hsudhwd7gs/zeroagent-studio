// RSS Monitor — fetch and parse an RSS/Atom feed.
// Returns the latest N items as JSON.

export interface RssMonitorConfig {
  url?: string
  limit?: string // max items (default 10)
}

export interface RssItem {
  title: string
  link: string
  pubDate?: string
  description?: string
  guid?: string
}

export async function runRssMonitor(input: string, config: RssMonitorConfig = {}): Promise<string> {
  const url = (config.url || input || '').trim()
  if (!url) return '[rss error: no URL provided]'
  const limit = Math.max(1, Math.min(100, parseInt(config.limit || '10', 10) || 10))

  try {
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) return `[rss error: HTTP ${res.status}]`
    const xml = await res.text()

    // Parse XML with DOMParser
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')

    const parseError = doc.querySelector('parsererror')
    if (parseError) return `[rss error: invalid XML]`

    // Try RSS first (<rss><channel><item>...)
    let items: Element[] = []
    let channelTitle = ''
    const rssChannel = doc.querySelector('rss > channel')
    if (rssChannel) {
      channelTitle = rssChannel.querySelector('title')?.textContent || ''
      items = Array.from(rssChannel.querySelectorAll('item'))
    } else {
      // Try Atom (<feed><entry>...)
      const atomFeed = doc.querySelector('feed')
      if (atomFeed) {
        channelTitle = atomFeed.querySelector('title')?.textContent || ''
        items = Array.from(atomFeed.querySelectorAll('entry'))
      }
    }

    if (items.length === 0) return JSON.stringify({ feed: channelTitle, items: [] })

    const rssItems: RssItem[] = items.slice(0, limit).map((item) => {
      const get = (tag: string) => item.querySelector(tag)?.textContent?.trim() || ''
      const getAtom = (tag: string) => {
        const el = item.querySelector(tag)
        return el?.textContent?.trim() || el?.getAttribute('href') || ''
      }
      // Detect RSS vs Atom
      const isAtom = item.tagName === 'entry'
      return {
        title: isAtom ? getAtom('title') : get('title'),
        link: isAtom ? getAtom('link') : get('link'),
        pubDate: isAtom ? get('updated') || get('published') : get('pubDate'),
        description: isAtom ? get('summary') || get('content') : get('description'),
        guid: get('guid') || get('id'),
      }
    })

    return JSON.stringify({ feed: channelTitle, count: rssItems.length, items: rssItems }, null, 2)
  } catch (err) {
    return `[rss error: ${err instanceof Error ? err.message : String(err)}]`
  }
}
