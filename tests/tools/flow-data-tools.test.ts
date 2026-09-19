// Tests for the flow + data tools added in the Brainwire rebrand:
// diffViewer, jsonSchemaValidator, csvFromUrl, embeddingsIndex, rssMonitor, cronTrigger.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runDiffViewer } from '../../src/tools/diffViewer'
import { runJsonSchemaValidator } from '../../src/tools/jsonSchemaValidator'
import { runCsvFromUrl } from '../../src/tools/csvFromUrl'
import { runEmbeddingsIndex, clearEmbeddingsIndexForNode } from '../../src/tools/embeddingsIndex'
import { runRssMonitor } from '../../src/tools/rssMonitor'
import { runCronTrigger, clearCronForNode } from '../../src/tools/cronTrigger'

const parse = (s: string) => JSON.parse(s)

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  clearEmbeddingsIndexForNode('test-node')
  clearCronForNode('test-node')
})

describe('diffViewer', () => {
  it('renders a unified diff with +, -, and context lines', () => {
    const out = runDiffViewer(JSON.stringify({ a: 'one\ntwo\nthree', b: 'one\nTWO\nthree\nfour' }), {})
    expect(out).toContain('--- a')
    expect(out).toContain('+++ b')
    expect(out).toContain('-two')
    expect(out).toContain('+TWO')
    expect(out).toContain('+four')
    expect(out).toContain(' one')
    expect(out).toContain(' three')
  })

  it('accepts the --- separator fallback format', () => {
    const out = runDiffViewer('alpha\n---\nbeta', {})
    expect(out).toContain('-alpha')
    expect(out).toContain('+beta')
  })

  it('returns an error marker for unusable input', () => {
    const out = runDiffViewer('just one text', {})
    expect(out).toContain('diff error')
  })

  it('json format returns structured diff entries', () => {
    const out = parse(runDiffViewer(JSON.stringify({ a: 'x', b: 'y' }), { format: 'json' }))
    expect(out).toEqual([
      { type: 'del', text: 'x' },
      { type: 'add', text: 'y' },
    ])
  })

  it('side-by-side format pads both columns', () => {
    const out = runDiffViewer(JSON.stringify({ a: 'l1', b: 'r1' }), { format: 'side-by-side' })
    expect(out).toContain('--- left\t+++ right')
    expect(out).toContain('l1')
    expect(out).toContain('r1')
  })
})

describe('jsonSchemaValidator', () => {
  it('validates types including null and array', () => {
    const ok = parse(runJsonSchemaValidator('"x"', { schema: '{"type":"string"}' }))
    expect(ok.valid).toBe(true)

    const bad = parse(runJsonSchemaValidator('null', { schema: '{"type":"string"}' }))
    expect(bad.valid).toBe(false)
    expect(bad.errors[0].message).toContain('expected string, got null')

    const multi = parse(runJsonSchemaValidator('[]', { schema: '{"type":["string","number"]}' }))
    expect(multi.valid).toBe(false)
    expect(multi.errors[0].message).toContain('string|number')
  })

  it('rejects invalid JSON input and schema', () => {
    const badInput = parse(runJsonSchemaValidator('{nope', {}))
    expect(badInput.valid).toBe(false)
    expect(badInput.errors[0].message).toContain('Input is not valid JSON')

    const badSchema = parse(runJsonSchemaValidator('{}', { schema: '{nope' }))
    expect(badSchema.errors[0].message).toContain('Schema is not valid JSON')
  })

  it('enforces enum, const, and string constraints', () => {
    const enumBad = parse(runJsonSchemaValidator('"red"', { schema: '{"enum":["green","blue"]}' }))
    expect(enumBad.valid).toBe(false)
    expect(enumBad.errors[0].message).toContain('enum')

    const constBad = parse(runJsonSchemaValidator('2', { schema: '{"const":1}' }))
    expect(constBad.valid).toBe(false)

    const strBad = parse(
      runJsonSchemaValidator('"AB"', { schema: '{"type":"string","minLength":3,"pattern":"^[a-z]+$"}' })
    )
    expect(strBad.errors.map((e: { message: string }) => e.message)).toEqual(
      expect.arrayContaining([expect.stringContaining('too short'), expect.stringContaining('pattern')])
    )

    const tooLong = parse(runJsonSchemaValidator('"abcd"', { schema: '{"maxLength":3}' }))
    expect(tooLong.errors[0].message).toContain('too long')
  })

  it('enforces numeric and array constraints', () => {
    const numBad = parse(runJsonSchemaValidator('3', { schema: '{"minimum":5,"multipleOf":5}' }))
    expect(numBad.errors).toHaveLength(2)

    const maxBad = parse(runJsonSchemaValidator('11', { schema: '{"maximum":10}' }))
    expect(maxBad.errors[0].message).toContain('maximum')

    const arrBad = parse(runJsonSchemaValidator('[1]', { schema: '{"type":"array","minItems":2,"items":{"type":"number"}}' }))
    expect(arrBad.errors[0].message).toContain('too short')

    const itemBad = parse(runJsonSchemaValidator('["x"]', { schema: '{"type":"array","items":{"type":"number"}}' }))
    expect(itemBad.errors[0].path).toBe('$[0]')
    expect(itemBad.errors[0].message).toContain('number')
  })

  it('enforces object constraints: required, nested properties, additionalProperties', () => {
    const schema = JSON.stringify({
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, age: { type: 'number', minimum: 0 } },
      additionalProperties: false,
    })
    const missing = parse(runJsonSchemaValidator('{}', { schema }))
    expect(missing.errors[0].path).toBe('$.name')

    const nestedBad = parse(runJsonSchemaValidator('{"name":"x","age":-1}', { schema }))
    expect(nestedBad.errors[0].path).toBe('$.age')

    const extra = parse(runJsonSchemaValidator('{"name":"x","oops":1}', { schema }))
    expect(extra.errors[0].message).toContain('additional property')
  })

  it('skips invalid regex patterns instead of crashing', () => {
    const out = parse(runJsonSchemaValidator('"x"', { schema: '{"pattern":"("}' }))
    expect(out.valid).toBe(true)
  })
})

describe('csvFromUrl', () => {
  it('fetches and parses CSV with headers', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => 'a,b\n1,2\n3,4',
    } as Response)
    const out = parse(await runCsvFromUrl('https://x.dev/d.csv', {}))
    expect(out.rows).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ])
    expect(out.count).toBe(2)
    expect(out.headers).toEqual(['a', 'b'])
  })

  it('supports no-header mode, limits, and custom delimiters', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => '1;2\n3;4\n5;6',
    } as Response)
    const out = parse(await runCsvFromUrl('https://x.dev', { hasHeader: 'false', delimiter: ';', limit: '2' }))
    expect(out.rows).toEqual([
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('falls back to the worker proxy when direct fetch fails', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('CORS blocked'))
      .mockResolvedValueOnce({ ok: true, text: async () => 'h\nv' } as Response)
    const out = parse(await runCsvFromUrl('https://blocked.dev/d.csv', {}))
    expect(out.rows).toEqual([{ h: 'v' }])
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain('/api/proxy?url=')
  })

  it('reports errors for missing URLs and double failures', async () => {
    expect(await runCsvFromUrl('', {})).toContain('no URL provided')

    vi.mocked(fetch).mockRejectedValue(new TypeError('down'))
    const out = await runCsvFromUrl('https://x.dev', {})
    expect(out).toContain('csv-from-url error')
  })

  it('handles quoted CSV fields', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => 'name,note\n"Doe, Jane","multi, comma"',
    } as Response)
    const out = parse(await runCsvFromUrl('https://x.dev', {}))
    expect(out.rows).toEqual([{ name: 'Doe, Jane', note: 'multi, comma' }])
  })

  it('returns empty rows for empty responses', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: async () => '' } as Response)
    const out = parse(await runCsvFromUrl('https://x.dev', {}))
    expect(out).toEqual({ rows: [], count: 0 })
  })
})

describe('embeddingsIndex', () => {
  it('adds entries and lists them per node', () => {
    const add1 = parse(runEmbeddingsIndex('{"text":"hello","embedding":[1,0]}', { action: 'add' }, 'test-node'))
    expect(add1.ok).toBe(true)
    const add2 = parse(runEmbeddingsIndex('{"text":"world","embedding":[0,1]}', { action: 'add' }, 'test-node'))
    expect(add2.count).toBe(2)

    const list = parse(runEmbeddingsIndex('', { action: 'list' }, 'test-node'))
    expect(list.count).toBe(2)
    expect(list.entries.map((e: { text: string }) => e.text)).toEqual(['hello', 'world'])
  })

  it('searches by cosine similarity with topK and threshold', () => {
    runEmbeddingsIndex('{"text":"hello","embedding":[1,0]}', { action: 'add' }, 'test-node')
    runEmbeddingsIndex('{"text":"world","embedding":[0,1]}', { action: 'add' }, 'test-node')

    const results = parse(
      runEmbeddingsIndex('{"embedding":[0.9, 0.1]}', { action: 'search', topK: '1' }, 'test-node')
    )
    expect(results.results).toHaveLength(1)
    expect(results.results[0].text).toBe('hello')
    expect(results.results[0].score).toBeGreaterThan(0.9)

    const filtered = parse(
      runEmbeddingsIndex('{"embedding":[1,0]}', { action: 'search', threshold: '0.99' }, 'test-node')
    )
    expect(filtered.results.map((r: { text: string }) => r.text)).toEqual(['hello'])
  })

  it('validates malformed input and unknown actions', () => {
    expect(runEmbeddingsIndex('nope', { action: 'add' }, 'test-node')).toContain('must be JSON')
    expect(runEmbeddingsIndex('{"text":"x"}', { action: 'add' }, 'test-node')).toContain('missing text or embedding')
    expect(runEmbeddingsIndex('nope', { action: 'search' }, 'test-node')).toContain('must be JSON')
    expect(runEmbeddingsIndex('{}', { action: 'search' }, 'test-node')).toContain('missing embedding')
    expect(runEmbeddingsIndex('', { action: 'nope' as 'add' }, 'test-node')).toContain('unknown action')
  })

  it('clear empties the node index', () => {
    runEmbeddingsIndex('{"text":"x","embedding":[1]}', { action: 'add' }, 'test-node')
    const cleared = parse(runEmbeddingsIndex('', { action: 'clear' }, 'test-node'))
    expect(cleared.cleared).toBe(true)
    expect(parse(runEmbeddingsIndex('', { action: 'list' }, 'test-node')).count).toBe(0)
  })
})

describe('rssMonitor', () => {
  const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Tech Feed</title>
  <item><title>First</title><link>https://x/1</link><pubDate>Mon, 1 Jan 2026</pubDate><description>D1</description><guid>g1</guid></item>
  <item><title>Second</title><link>https://x/2</link><pubDate>Tue, 2 Jan 2026</pubDate><description>D2</description><guid>g2</guid></item>
</channel></rss>`

  const ATOM_XML = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry><title>A1</title><link href="https://x/a1"/><updated>2026-01-01T00:00:00Z</updated><summary>S1</summary><id>i1</id></entry>
</feed>`

  it('parses RSS 2.0 feeds and limits items', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: async () => RSS_XML } as Response)
    const out = parse(await runRssMonitor('', { url: 'https://feed', limit: '1' }))
    expect(out.feed).toBe('Tech Feed')
    expect(out.items).toEqual([
      { title: 'First', link: 'https://x/1', pubDate: 'Mon, 1 Jan 2026', description: 'D1', guid: 'g1' },
    ])
  })

  it('parses Atom feeds', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: async () => ATOM_XML } as Response)
    const out = parse(await runRssMonitor('https://feed', {}))
    expect(out.feed).toBe('Atom Feed')
    expect(out.items[0]).toMatchObject({ title: 'A1', link: 'https://x/a1', pubDate: '2026-01-01T00:00:00Z' })
  })

  it('handles errors: no URL, HTTP failures, invalid XML, network errors', async () => {
    expect(await runRssMonitor('', {})).toContain('no URL provided')

    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404, text: async () => '' } as Response)
    expect(await runRssMonitor('https://x', {})).toContain('HTTP 404')

    vi.mocked(fetch).mockResolvedValue({ ok: true, text: async () => 'not xml <<' } as Response)
    const invalid = await runRssMonitor('https://x', {})
    expect(invalid.includes('[rss error: invalid XML]') || invalid.includes('[rss error')).toBe(true)

    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'))
    expect(await runRssMonitor('https://x', {})).toContain('rss error')
  })

  it('returns an empty item list for feeds without items', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => '<rss version="2.0"><channel><title>Empty</title></channel></rss>',
    } as Response)
    const out = parse(await runRssMonitor('https://x', {}))
    expect(out).toEqual({ feed: 'Empty', items: [] })
  })
})

describe('cronTrigger', () => {
  it('registers local timers for every-minute and every-N-minute schedules', async () => {
    const everyMin = parse(await runCronTrigger('', { schedule: '* * * * *', mode: 'local' }, 'test-node'))
    expect(everyMin.ok).toBe(true)
    expect(everyMin.intervalMs).toBe(60_000)

    const every5 = parse(await runCronTrigger('', { schedule: '*/5 * * * *' }, 'test-node'))
    expect(every5.intervalMs).toBe(300_000)

    const hourly = parse(await runCronTrigger('', { schedule: '30 * * * *' }, 'test-node'))
    expect(hourly.intervalMs).toBe(3_600_000)
  })

  it('rejects unsupported local schedules', async () => {
    const out = await runCronTrigger('', { schedule: '0 9 * * 1' }, 'test-node')
    expect(out).toContain('unsupported schedule')
  })

  it('registers worker-mode crons via /api/jobs', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ id: 'job-7' }) } as Response)
    const out = parse(await runCronTrigger('', { schedule: '0 9 * * *', mode: 'worker' }, 'test-node'))
    expect(out.ok).toBe(true)
    expect(out.jobId).toBe('job-7')
    expect(out.mode).toBe('worker')
  })

  it('surfaces worker errors gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response)
    expect(await runCronTrigger('', { schedule: '* * * * *', mode: 'worker' }, 'test-node')).toContain('worker returned 500')

    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'))
    expect(await runCronTrigger('', { schedule: '* * * * *', mode: 'worker' }, 'test-node')).toContain('not reachable')
  })
})
