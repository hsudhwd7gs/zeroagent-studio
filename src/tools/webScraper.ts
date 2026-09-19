const BROWSER_HEADERS = {
  Accept: 'text/html,application/xhtml+xml',
  'User-Agent':
    'Mozilla/5.0 (compatible; Brainwire/0.1; +https://github.com/sakurablush/brainwire)',
}

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
]

import { isWikipediaHostname, normalizeHttpUrl } from '../lib/validateUrl'

export interface ScrapeResult {
  url: string
  title: string
  text: string
  links: string[]
}

function parseWikipediaUrl(url: string): { lang: string; title: string } | null {
  try {
    const parsed = new URL(url)
    if (!isWikipediaHostname(parsed.hostname)) return null
    const match = parsed.pathname.match(/^\/wiki\/(.+)$/)
    if (!match) return null
    const lang = parsed.hostname.split('.')[0]
    const title = decodeURIComponent(match[1].replace(/_/g, ' '))
    return { lang, title }
  } catch {
    return null
  }
}

async function fetchWikipediaSummary(url: string): Promise<ScrapeResult | null> {
  const wiki = parseWikipediaUrl(url)
  if (!wiki) return null

  const apiUrl = `https://${wiki.lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki.title)}`
  const response = await fetch(apiUrl, { headers: { Accept: 'application/json' } })
  if (!response.ok) return null

  const data = (await response.json()) as {
    title?: string
    extract?: string
    content_urls?: { desktop?: { page?: string } }
  }

  const text = (data.extract ?? '').trim()
  if (!text) return null

  return {
    url: data.content_urls?.desktop?.page ?? url,
    title: data.title ?? wiki.title,
    text: text.slice(0, 8000),
    links: [],
  }
}

async function fetchWithJina(url: string): Promise<string> {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: 'text/plain' },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.text()
}

async function fetchWithProxy(url: string): Promise<string> {
  let lastError: Error | null = null

  for (const proxyFn of CORS_PROXIES) {
    try {
      const response = await fetch(proxyFn(url), {
        headers: { Accept: 'text/html' },
      })
      if (response.ok) {
        return await response.text()
      }
      lastError = new Error(`HTTP ${response.status}`)
    } catch (err) {
      // v8 ignore next -- proxy fetch may throw non-Error values from the network stack
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  /* v8 ignore start -- proxies always record a failure before this throw */
  if (!lastError) {
    lastError = new Error('Failed to fetch URL through proxies')
  }
  /* v8 ignore stop */
  throw lastError
}

function parseHtml(url: string, html: string): ScrapeResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const title = doc.querySelector('title')?.textContent?.trim() ?? ''
  const scripts = doc.querySelectorAll('script, style, noscript')
  scripts.forEach((el) => el.remove())

  // v8 ignore next -- jsdom always provides body; optional chain is defensive
  const text = (doc.body?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)

  const links = Array.from(doc.querySelectorAll('a[href]'))
    .map((a) => a.getAttribute('href'))
    .filter((href): href is string => !!href && href.startsWith('http'))
    .slice(0, 20)

  return { url, title, text, links }
}

export async function scrapeWebPage(url: string): Promise<ScrapeResult> {
  const target = normalizeHttpUrl(url)

  const wikiResult = await fetchWikipediaSummary(target)
  if (wikiResult) return wikiResult

  try {
    const jinaText = await fetchWithJina(target)
    const titleMatch = jinaText.match(/^Title:\s*(.+)$/m)
    const title = titleMatch?.[1]?.trim() ?? ''
    const text = jinaText.replace(/^Title:.*$/m, '').trim().slice(0, 8000)
    if (text.length > 20) {
      return { url: target, title, text, links: [] }
    }
  } catch {
    // try other strategies
  }

  let html: string
  try {
    const direct = await fetch(target, { mode: 'cors', headers: BROWSER_HEADERS })
    if (direct.ok) {
      html = await direct.text()
      return parseHtml(target, html)
    }
    if (direct.status === 403) {
      try {
        html = await fetchWithProxy(target)
        return parseHtml(target, html)
      } catch {
        throw new Error(
          'This site refused the request (403). It may forbid automated access — do not bypass; try a page you are allowed to fetch (e.g. Wikipedia).'
        )
      }
    }
    html = await fetchWithProxy(target)
  } catch (err) {
    if (err instanceof Error && err.message.includes('403')) throw err
    try {
      html = await fetchWithProxy(target)
    } catch {
      throw new Error(
        `Could not fetch page. ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  return parseHtml(target, html)
}

export async function fetchUrl(url: string): Promise<string> {
  const result = await scrapeWebPage(url)
  return `Title: ${result.title}\n\n${result.text}`
}

export function previewScrapeText(result: ScrapeResult, maxLen = 500): string {
  const snippet = result.text.slice(0, maxLen)
  return `Title: ${result.title}\n\n${snippet}${result.text.length > maxLen ? '…' : ''}`
}
