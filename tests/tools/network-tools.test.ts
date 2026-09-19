// Tests for network-bound and stateful tools, with fetch mocked per repo convention.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runRetryWithBackoff } from '../../src/tools/retryWithBackoff'
import { runCache } from '../../src/tools/cache'
import { runApiKeyManager } from '../../src/tools/apiKeyManager'
import { runFileGenerator } from '../../src/tools/fileGenerator'
import { runWebSearch } from '../../src/tools/webSearch'
import { runGithubApi } from '../../src/tools/githubApi'
import { runWeather } from '../../src/tools/weather'
import { runTranslate } from '../../src/tools/translate'
import { runCurrencyConvert } from '../../src/tools/currencyConvert'
import { runWikipediaSearch } from '../../src/tools/wikipediaSearch'
import { runStockFootage } from '../../src/tools/stockFootage'
import { runEmailSend } from '../../src/tools/emailSend'
import { runNotionApi } from '../../src/tools/notionApi'
import { runWebhookSend } from '../../src/tools/webhookSend'
import { runKaggleNotebook } from '../../src/tools/kaggleNotebook'
import { runScheduler } from '../../src/tools/scheduler'
import { runTrendpy } from '../../src/tools/trendpy'
import { useProjectStore } from '../../src/stores/projectStore'

// trendpy falls back to pure-JS math when Pyodide is unavailable — force that path.
vi.mock('../../src/tools/pythonRunner', () => ({
  runPython: vi.fn(async () => {
    throw new Error('pyodide unavailable in tests')
  }),
}))

const parse = (s: string) => JSON.parse(s)

function okResponse(body: unknown, status = 200): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    text: async () => text,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  } as Response
}

function failResponse(status: number, body = ''): Response {
  return {
    ok: false,
    status,
    statusText: 'ERR',
    text: async () => body,
    json: async () => JSON.parse(body || '{}'),
  } as Response
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  // jsdom does not implement createObjectURL — needed by fileGenerator's anchor path
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  })
})

describe('retryWithBackoff', () => {
  it('returns immediately on success', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse('{"a":1}'))
    const out = parse(await runRetryWithBackoff('', { url: 'https://x.dev' }))
    expect(out.ok).toBe(true)
    expect(out.attempt).toBe(1)
    expect(out.data).toEqual({ a: 1 })
  })

  it('throws on missing URL', async () => {
    await expect(runRetryWithBackoff('  ', {})).rejects.toThrow('No URL provided')
  })

  it('throws immediately for non-retryable statuses', async () => {
    vi.mocked(fetch).mockResolvedValue(failResponse(404, 'nope'))
    await expect(runRetryWithBackoff('https://x.dev', {})).rejects.toThrow('Non-retryable HTTP 404')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries retryable statuses and succeeds on the second attempt', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: false, status: 503, headers: new Headers() } as Response)
        .mockResolvedValueOnce(okResponse('ok'))
      const pending = runRetryWithBackoff('', {
        url: 'https://x.dev',
        maxAttempts: '2',
        baseDelayMs: '50',
      })
      await vi.advanceTimersByTimeAsync(80)
      const out = parse(await pending)
      expect(out.ok).toBe(true)
      expect(out.attempt).toBe(2)
      expect(fetch).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('gives up after maxAttempts of network errors', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(fetch).mockRejectedValue(new TypeError('network down'))
      const pending = runRetryWithBackoff('', { url: 'https://x.dev', maxAttempts: '2', baseDelayMs: '50' })
      await vi.advanceTimersByTimeAsync(80)
      const out = parse(await pending)
      expect(out.ok).toBe(false)
      expect(out.error).toContain('network down')
      expect(out.attempts).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects invalid header JSON', async () => {
    await expect(
      runRetryWithBackoff('https://x.dev', { headers: '{bad' })
    ).rejects.toThrow('Headers must be valid JSON')
  })
})

describe('cache', () => {
  beforeEach(() => localStorage.clear())

  it('set then get returns the stored value (JSON parsed)', async () => {
    await runCache('', { mode: 'set', key: 'k1', value: '{"a":1}' })
    expect(parse(await runCache('', { mode: 'get', key: 'k1' }))).toEqual({ a: 1 })
  })

  it('get returns fallback for missing keys and empty string by default', async () => {
    expect(await runCache('', { mode: 'get', key: 'nope' })).toBe('')
    expect(await runCache('', { mode: 'get', key: 'nope', fallback: 'dflt' })).toBe('dflt')
  })

  it('has reports existence and expiry metadata', async () => {
    const missing = parse(await runCache('', { mode: 'has', key: 'zz' }))
    expect(missing.exists).toBe(false)
    await runCache('v', { mode: 'set', key: 'zz', ttlMs: '60000' })
    const present = parse(await runCache('', { mode: 'has', key: 'zz' }))
    expect(present.exists).toBe(true)
    expect(present.expiresAt).toBeGreaterThan(Date.now() - 1000)
  })

  it('expired entries read as missing', async () => {
    await runCache('v', { mode: 'set', key: 'exp', ttlMs: '1' })
    await new Promise((r) => setTimeout(r, 5))
    expect(await runCache('', { mode: 'get', key: 'exp' })).toBe('')
  })

  it('clear removes only cache keys and throws for unknown modes', async () => {
    await runCache('v', { mode: 'set', key: 'c1' })
    localStorage.setItem('unrelated', 'keep')
    await runCache('', { mode: 'clear' })
    expect(await runCache('', { mode: 'get', key: 'c1' })).toBe('')
    expect(localStorage.getItem('unrelated')).toBe('keep')
    await expect(runCache('', { mode: 'nope', key: 'k' })).rejects.toThrow('Unknown cache mode')
    await expect(runCache('', { mode: 'get' })).rejects.toThrow('key is required')
  })
})

describe('apiKeyManager', () => {
  it('lists stored keys from the worker', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ count: 2, keys: ['A', 'B'] }))
    const out = await runApiKeyManager('', { action: 'list' })
    expect(out).toContain('Stored keys (2)')
    expect(out).toContain('• A')
  })

  it('lists "(none)" when no keys exist', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ count: 0, keys: [] }))
    const out = await runApiKeyManager('', { action: 'list' })
    expect(out).toContain('(none)')
  })

  it('set posts name+value and reports success', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ ok: true, stored: 'K' }))
    const out = await runApiKeyManager('secret', { action: 'set', keyName: 'K' })
    expect(out).toContain('Stored: K')
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(String(init.body)).toContain('"value":"secret"')
  })

  it('set validates name and value', async () => {
    await expect(runApiKeyManager('v', { action: 'set' })).rejects.toThrow('keyName required')
    await expect(runApiKeyManager('', { action: 'set', keyName: 'K' })).rejects.toThrow('keyValue required')
  })

  it('delete removes a key and surfaces worker errors', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({}))
    const out = await runApiKeyManager('', { action: 'delete', keyName: 'K' })
    expect(out).toContain('Deleted: K')

    vi.mocked(fetch).mockResolvedValue(failResponse(500))
    await expect(runApiKeyManager('', { action: 'list' })).rejects.toThrow('List failed: HTTP 500')
    await expect(runApiKeyManager('', { action: 'nope' })).rejects.toThrow('Unknown action')
  })
})

describe('fileGenerator', () => {
  it('saves text content with the right mime and auto-extension', async () => {
    const out = parse(await runFileGenerator('hello world', { filename: 'notes', format: 'md' }))
    expect(out.ok).toBe(true)
    expect(out.filename).toBe('notes.md')
    expect(out.mime).toBe('text/markdown')
    expect(out.size).toBe('hello world'.length)
    expect(out.saved).toBe(true)
  })

  it('throws when no content is provided', async () => {
    await expect(runFileGenerator('', { filename: 'f' })).rejects.toThrow('no content')
  })

  it('json mode pretty-prints valid JSON and passes through invalid JSON', async () => {
    const pretty = parse(await runFileGenerator('{"a":1}', { mode: 'json', filename: 'd.json' }))
    expect(pretty.filename).toBe('d.json')
    expect(pretty.size).toBe(JSON.stringify({ a: 1 }, null, 2).length)

    const raw = parse(await runFileGenerator('not-json', { mode: 'json', filename: 'd.json' }))
    expect(raw.size).toBe('not-json'.length)
  })

  it('dataurl mode decodes base64 payloads and infers the extension', async () => {
    const b64 = btoa('binary!')
    const out = parse(
      await runFileGenerator(`data:image/png;base64,${b64}`, { mode: 'dataurl', filename: 'img' })
    )
    expect(out.ok).toBe(true)
    expect(out.mime).toBe('image/png')
    expect(out.filename).toBe('img.png')
    expect(out.size).toBe('binary!'.length)
  })

  it('dataurl mode rejects non-data URLs', async () => {
    await expect(runFileGenerator('https://x.dev', { mode: 'dataurl' })).rejects.toThrow('data: URL')
  })

  it('url mode fetches through the worker proxy', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['abc'], { type: 'text/plain' }),
    } as Response)
    const out = parse(await runFileGenerator('https://x.dev/f.txt', { mode: 'url', filename: 'f' }))
    expect(out.filename).toBe('f.txt')
    expect(out.size).toBe(3)
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/api/proxy?url=')
  })

  it('rejects unknown modes', async () => {
    await expect(runFileGenerator('x', { mode: 'nope', filename: 'f' })).rejects.toThrow('Unknown mode')
  })
})

describe('webSearch', () => {
  it('parses DuckDuckGo HTML results through the proxy', async () => {
    const html = `
      <div class="result">
        <a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa&rut=xyz">Example</a>
        <div class="result__snippet">A snippet</div>
      </div>
      <div class="result">
        <a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fb&rut=xyz">Second</a>
      </div>`
    vi.mocked(fetch).mockResolvedValue(okResponse(html))
    const out = parse(await runWebSearch('query', {}))
    expect(out.ok).toBe(true)
    expect(out.results).toEqual([
      { title: 'Example', url: 'https://example.com/a', snippet: 'A snippet' },
      { title: 'Second', url: 'https://example.com/b', snippet: '' },
    ])
  })

  it('searx engine maps JSON results', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse({ results: [{ title: 'T', url: 'https://t.dev', content: 'C' }] })
    )
    const out = parse(await runWebSearch('q', { engine: 'searx' }))
    expect(out.results).toEqual([{ title: 'T', url: 'https://t.dev', snippet: 'C' }])
  })

  it('wikipedia engine maps search results', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse({ query: { search: [{ title: 'Ada', pageid: 1, snippet: '<b>p</b>' }] } })
    )
    const out = parse(await runWebSearch('ada', { engine: 'wikipedia' }))
    expect(out.results).toEqual([{ title: 'Ada', url: 'https://en.wikipedia.org/?curid=1', snippet: 'p' }])
  })

  it('throws for unknown engines and missing queries', async () => {
    await expect(runWebSearch('  ', {})).rejects.toThrow('query required')
    await expect(runWebSearch('q', { engine: 'nope' })).rejects.toThrow('Unknown engine')
  })
})

describe('githubApi', () => {
  it('fetches repo info through the worker proxy', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ id: 1, name: 'zeroagent-studio' }))
    const out = parse(await runGithubApi('', { action: 'repo', repo: 'a/b' }))
    expect(out.name).toBe('zeroagent-studio')
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('api.github.com%2Frepos%2Fa%2Fb')
  })

  it('builds issues/pulls/user/search URLs', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([]))
    await runGithubApi('', { action: 'issues', repo: 'a/b' })
    expect(decodeURIComponent(String(vi.mocked(fetch).mock.calls[0][0]))).toContain('/repos/a/b/issues?')
    await runGithubApi('', { action: 'pulls', repo: 'a/b' })
    expect(decodeURIComponent(String(vi.mocked(fetch).mock.calls[1][0]))).toContain('/repos/a/b/pulls?')
    await runGithubApi('', { action: 'user', repo: 'octocat' })
    expect(decodeURIComponent(String(vi.mocked(fetch).mock.calls[2][0]))).toContain('/users/octocat')
    await runGithubApi('', { action: 'search', query: 'vite' })
    expect(decodeURIComponent(String(vi.mocked(fetch).mock.calls[3][0]))).toContain('/search/repositories?')
  })

  it('validates required fields per action', async () => {
    await expect(runGithubApi('', { action: 'repo' })).rejects.toThrow('repo required')
    await expect(runGithubApi('', { action: 'user' })).rejects.toThrow('username required')
    await expect(runGithubApi('', { action: 'search' })).rejects.toThrow('query required')
    await expect(runGithubApi('', { action: 'nope' })).rejects.toThrow('Unknown action')
  })
})

describe('weather', () => {
  it('geocodes then fetches the forecast', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        okResponse({ results: [{ name: 'Dhaka', admin1: 'Dhaka', country: 'BD', latitude: 23.8, longitude: 90.4 }] })
      )
      .mockResolvedValueOnce(okResponse({ current: { temperature_2m: 30 }, daily: {}, hourly: {} }))
    const out = parse(await runWeather('Dhaka', {}))
    expect(out.ok).toBe(true)
    expect(out.location).toBe('Dhaka, Dhaka, BD')
    expect(out.current.temperature_2m).toBe(30)
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain('latitude=23.8')
  })

  it('throws when the location is not found', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ results: [] }))
    await expect(runWeather('nowhere', {})).rejects.toThrow('Location not found')
  })

  it('throws when location is missing', async () => {
    await expect(runWeather('  ', {})).rejects.toThrow('location required')
  })
})

describe('translate', () => {
  it('calls MyMemory and returns the translated text', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse({ responseData: { translatedText: 'hola', detectedLanguage: 'en' }, matches: [{ translation: 'hola' }] })
    )
    const out = parse(await runTranslate('hello', { from: 'en', to: 'es' }))
    expect(out.translated).toBe('hola')
    expect(out.matches).toHaveLength(1)
  })

  it('throws for empty text', async () => {
    await expect(runTranslate('  ', {})).rejects.toThrow('text required')
  })
})

describe('currencyConvert', () => {
  it('converts via Frankfurter', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ rates: { EUR: 0.9 }, date: '2026-09-19' }))
    const out = parse(await runCurrencyConvert('100', { from: 'USD', to: 'EUR' }))
    expect(out.rate).toBe(0.9)
    expect(out.date).toBe('2026-09-19')
  })

  it('throws for non-numeric amounts', async () => {
    await expect(runCurrencyConvert('abc', {})).rejects.toThrow('amount required')
  })
})

describe('wikipediaSearch', () => {
  it('search action returns mapped items', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse({ query: { search: [{ title: 'React', pageid: 5, snippet: '<i>lib</i>', size: 100, wordcount: 50 }] } })
    )
    const out = parse(await runWikipediaSearch('react', { action: 'search' }))
    expect(out.items[0]).toMatchObject({ title: 'React', pageid: 5, snippet: 'lib' })
  })

  it('summary action returns the extract', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse({ title: 'React', extract: 'A JS library', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/React' } } })
    )
    const out = parse(await runWikipediaSearch('react', { action: 'summary' }))
    expect(out.extract).toBe('A JS library')
    expect(out.url).toContain('React')
  })

  it('page action returns wikitext', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse({ parse: { title: 'React', pageid: 5, wikitext: { '*': 'raw wikitext' } } })
    )
    const out = parse(await runWikipediaSearch('react', { action: 'page' }))
    expect(out.wikitext).toBe('raw wikitext')
  })

  it('validates query and action', async () => {
    await expect(runWikipediaSearch('', {})).rejects.toThrow('query required')
    await expect(runWikipediaSearch('x', { action: 'nope' })).rejects.toThrow('Unknown action')
  })
})

describe('stockFootage', () => {
  it('requires an API key for pexels and pixabay', async () => {
    await expect(runStockFootage('city', { provider: 'pexels' })).rejects.toThrow('Pexels requires')
    await expect(runStockFootage('city', { provider: 'pixabay' })).rejects.toThrow('Pixabay requires')
  })

  it('maps pexels video results', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse({ videos: [{ id: 7, video_files: [{ link: 'https://v/7.mp4' }], image: 'https://t/7.jpg', width: 1920, height: 1080, duration: 12, user: { name: 'A' } }] })
    )
    const out = parse(await runStockFootage('city', { provider: 'pexels', apiKey: 'k' }))
    expect(out.results[0]).toMatchObject({ id: '7', url: 'https://v/7.mp4', author: 'A' })
  })

  it('maps pixabay hits', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse({ hits: [{ id: 9, videos: { large: { url: 'https://v/9.mp4', width: 1280, height: 720, } }, duration: 5, user: 'B' }] })
    )
    const out = parse(await runStockFootage('city', { provider: 'pixabay', apiKey: 'k' }))
    expect(out.results[0]).toMatchObject({ id: '9', url: 'https://v/9.mp4' })
  })

  it('unsplash needs no key and rejects unknown providers', async () => {
    const out = parse(await runStockFootage('city', { provider: 'unsplash', per_page: '2' }))
    expect(out.results).toHaveLength(2)
    await expect(runStockFootage('city', { provider: 'nope' })).rejects.toThrow('Unknown provider')
    await expect(runStockFootage('', {})).rejects.toThrow('query required')
  })
})

describe('emailSend', () => {
  it('validates required fields', async () => {
    await expect(runEmailSend('body', {})).rejects.toThrow('apiKey is required')
    await expect(runEmailSend('body', { apiKey: 'k' })).rejects.toThrow('"from" is required')
    await expect(
      runEmailSend('body', { apiKey: 'k', from: 'a@b.c' })
    ).rejects.toThrow('"to" is required')
    await expect(
      runEmailSend('body', { apiKey: 'k', from: 'a@b.c', to: 'd@e.f' })
    ).rejects.toThrow('"subject" is required')
    await expect(
      runEmailSend('', { apiKey: 'k', from: 'a@b.c', to: 'd@e.f', subject: 'S' })
    ).rejects.toThrow('body')
  })

  it('sends via Resend with a Bearer token', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ id: 'e1' }))
    const out = parse(
      await runEmailSend('hello', { apiKey: 'k', from: 'a@b.c', to: 'd@e.f, g@h.i', subject: 'S' })
    )
    expect(out.ok).toBe(true)
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer k')
    expect(String(init.body)).toContain('"to":["d@e.f","g@h.i"]')
  })

  it('sends via Postmark with a server token', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({}))
    await runEmailSend('hello', {
      provider: 'postmark',
      apiKey: 'k',
      from: 'a@b.c',
      to: 'd@e.f',
      subject: 'S',
    })
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.postmarkapp.com/email')
    expect((init.headers as Record<string, string>)['X-Postmark-Server-Token']).toBe('k')
  })
})

describe('notionApi', () => {
  it('requires apiKey and databaseId', async () => {
    await expect(runNotionApi('', {})).rejects.toThrow('API key is required')
    await expect(runNotionApi('', { apiKey: 'k' })).rejects.toThrow('databaseId is required')
  })

  it('creates a page with the title property and body block', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ object: 'page', id: 'p1' }))
    const out = parse(await runNotionApi('body text', { apiKey: 'k', databaseId: 'db', title: 'T' }))
    expect(out.ok).toBe(true)
    expect(out.id).toBe('p1')
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.notion.com/v1/pages')
    const payload = JSON.parse(String(init.body))
    expect(payload.parent.database_id).toBe('db')
    expect(payload.children[0].paragraph.rich_text[0].text.content).toBe('body text')
  })

  it('queries a database and surfaces API errors', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ results: [1, 2] }))
    const out = parse(await runNotionApi('', { apiKey: 'k', databaseId: 'db', action: 'query' }))
    expect(out.results).toEqual([1, 2])

    vi.mocked(fetch).mockResolvedValue(failResponse(401, '{"message":"unauthorized"}'))
    await expect(runNotionApi('', { apiKey: 'k', databaseId: 'db', action: 'query' })).rejects.toThrow('401')
  })
})

describe('webhookSend', () => {
  it('posts the input as JSON to the URL', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse('done'))
    const out = parse(await runWebhookSend('payload', { url: 'https://hook.dev/x' }))
    expect(out.ok).toBe(true)
    expect(out.response).toBe('done')
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://hook.dev/x')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('validates URL scheme, method, and headers', async () => {
    await expect(runWebhookSend('ftp://x', {})).rejects.toThrow('http:// or https://')
    await expect(
      runWebhookSend('https://x', { method: 'GET' })
    ).rejects.toThrow('POST, PUT, PATCH')
    await expect(
      runWebhookSend('https://x', { headers: '{bad' })
    ).rejects.toThrow('Headers must be valid JSON')
    await expect(runWebhookSend('', {})).rejects.toThrow('No URL provided')
  })
})

describe('kaggleNotebook', () => {
  it('generate posts prompts to the worker', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ ok: true, slug: 'n1' }))
    const out = parse(await runKaggleNotebook('["p1","p2"]', { action: 'generate' }))
    expect(out.ok).toBe(true)
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/kaggle/generate')
    expect(JSON.parse(String(init.body)).prompts).toEqual(['p1', 'p2'])
  })

  it('splits newline-separated prompts', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ ok: true }))
    await runKaggleNotebook('a\nb', { action: 'generate' })
    expect(JSON.parse(String((vi.mocked(fetch).mock.calls[0] as [string, RequestInit])[1].body)).prompts).toEqual(['a', 'b'])
  })

  it('status and output hit their endpoints', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ ready: true }))
    const status = parse(await runKaggleNotebook('', { action: 'status' }))
    expect(status.ready).toBe(true)
    vi.mocked(fetch).mockResolvedValue(okResponse({ files: [] }))
    const output = parse(await runKaggleNotebook('', { action: 'output' }))
    expect(output.files).toEqual([])
    await expect(runKaggleNotebook('', { action: 'nope' })).rejects.toThrow('Unknown action')
  })
})

describe('scheduler', () => {
  it('registers a job in worker KV', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ job_id: 'j1' }))
    const out = parse(await runScheduler('', { cron: '*/5 * * * *', workflowId: 'w1' }))
    expect(out.ok).toBe(true)
    expect(out.job_id).toBe('j1')
    expect(out.cron).toBe('*/5 * * * *')
  })

  it('requires a cron expression', async () => {
    await expect(runScheduler('', {})).rejects.toThrow('cron expression required')
  })
})

describe('trendpy (JS fallback)', () => {
  it('computes a linear trend', async () => {
    const out = parse(await runTrendpy('[1,2,3]', { mode: 'trend' }))
    expect(out.ok).toBe(true)
    expect(out.trendpy_available).toBe(false)
    expect(out.result).toMatchObject({ slope: 1, intercept: 1, r2: 1, trend: 'up' })
  })

  it('forecasts future values', async () => {
    const out = parse(await runTrendpy('[1,2,3]', { mode: 'forecast', periods: '2' }))
    expect(out.result.forecast).toEqual([4, 5])
  })

  it('seasonal moving average and lag-1 correlation', async () => {
    const seasonal = parse(await runTrendpy('[1,2,3]', { mode: 'seasonal' }))
    expect(seasonal.result.moving_average).toEqual([1.5, 2.5])
    expect(seasonal.result.window).toBe(2)

    const corr = parse(await runTrendpy('[1,2,3]', { mode: 'correlation' }))
    expect(corr.result.correlation).toBeCloseTo(1, 5)
  })

  it('parses {date,value} objects and plain number lists', async () => {
    const objs = parse(await runTrendpy('[{"date":"a","value":1},{"value":2}]', {}))
    expect(objs.data).toEqual([1, 2])
    const csvish = parse(await runTrendpy('1,2,3', {}))
    expect(csvish.data).toEqual([1, 2, 3])
  })

  it('validates input', async () => {
    await expect(runTrendpy('', {})).rejects.toThrow('data required')
    await expect(runTrendpy('[5]', {})).rejects.toThrow('at least 2')
    await expect(runTrendpy('[1,2,3]', { mode: 'nope' })).rejects.toThrow('Unknown mode')
  })
})

describe('projectStore', () => {
  it('creates, selects, renames, and removes projects (fake-indexeddb)', async () => {
    const store = useProjectStore.getState()
    const created = await store.createProject('Research')
    expect(created.name).toBe('Research')

    const state = useProjectStore.getState()
    expect(state.currentProjectId).toBe(created.id)
    expect(state.projects.some((p) => p.id === created.id)).toBe(true)

    await useProjectStore.getState().renameProject(created.id, 'Research 2')
    expect(
      useProjectStore.getState().projects.find((p) => p.id === created.id)?.name
    ).toBe('Research 2')

    await useProjectStore.getState().removeProject(created.id)
    const after = useProjectStore.getState()
    expect(after.projects.some((p) => p.id === created.id)).toBe(false)
    expect(after.currentProjectId).not.toBe(created.id)
  })

  it('does not remove the default project', async () => {
    const before = useProjectStore.getState().currentProjectId
    await useProjectStore.getState().removeProject(before)
    expect(useProjectStore.getState().currentProjectId).toBe(before)
  })

  it('init restores the last project when it still exists', async () => {
    const created = await useProjectStore.getState().createProject('Alpha')
    // reset to defaults, then init should restore Alpha from meta:lastProjectId
    useProjectStore.setState({ currentProjectId: 'personal', currentProject: useProjectStore.getState().projects[0], isLoaded: false })
    await useProjectStore.getState().init()
    const state = useProjectStore.getState()
    expect(state.isLoaded).toBe(true)
    expect(state.currentProjectId).toBe(created.id)
  })

  it('falls back to the default project when the last project was deleted', async () => {
    const created = await useProjectStore.getState().createProject('Temp')
    await useProjectStore.getState().removeProject(created.id)
    useProjectStore.setState({ isLoaded: false })
    await useProjectStore.getState().init()
    expect(useProjectStore.getState().currentProjectId).toBe('personal')
  })
})
