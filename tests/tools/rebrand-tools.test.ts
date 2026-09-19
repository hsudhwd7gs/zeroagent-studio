// Tests for the flow-control tools added alongside the Brainwire rebrand:
// switchTool, throttle, tryCatch, webhookReceiver, yamlLoader.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runSwitch } from '../../src/tools/switchTool'
import { runThrottle } from '../../src/tools/throttle'
import { runTryCatch } from '../../src/tools/tryCatch'
import { runWebhookReceiver } from '../../src/tools/webhookReceiver'
import { runYamlLoader } from '../../src/tools/yamlLoader'

const parse = (s: string) => JSON.parse(s)

describe('switchTool', () => {
  const cases = JSON.stringify([
    { match: 'a', output: 'A!' },
    { match: 'b', output: 'B!' },
  ])

  it('returns the matching case output in exact mode', () => {
    expect(runSwitch('a', { cases })).toBe('A!')
    expect(runSwitch('b', { cases })).toBe('B!')
  })

  it('falls back to defaultOutput when nothing matches', () => {
    expect(runSwitch('zzz', { cases, defaultOutput: 'dflt' })).toBe('dflt')
    expect(runSwitch('zzz', { cases })).toBe('')
  })

  it('contains and regex match modes', () => {
    const containsCases = JSON.stringify([{ match: 'ell', output: 'matched' }])
    expect(runSwitch('hello', { cases: containsCases, matchMode: 'contains' })).toBe('matched')

    const regexCases = JSON.stringify([{ match: '^\\d+$', output: 'number' }])
    expect(runSwitch('12345', { cases: regexCases, matchMode: 'regex' })).toBe('number')
    expect(runSwitch('12a45', { cases: regexCases, matchMode: 'regex' })).toBe('')
  })

  it('survives invalid regex cases and invalid cases JSON', () => {
    const badRegex = JSON.stringify([{ match: '[', output: 'x' }])
    expect(runSwitch('any', { cases: badRegex, matchMode: 'regex' })).toBe('')
    expect(runSwitch('any', { cases: '{bad json' })).toContain('invalid cases JSON')
  })
})

describe('throttle', () => {
  it('passes the first message through immediately', async () => {
    const out = await runThrottle('first', { ms: '60000' })
    expect(out).toBe('first')
  })

  it('drops intermediate messages in drop mode', async () => {
    await runThrottle('first', { ms: '60000' })
    const dropped = await runThrottle('second', { ms: '60000', mode: 'drop' })
    expect(dropped).toBe('')
  })

  it('queues messages in queue mode until the window elapses', async () => {
    vi.useFakeTimers()
    try {
      await runThrottle('m1', { ms: '100' })
      const queued = runThrottle('m2', { ms: '100', mode: 'queue' })
      // Not resolved until the window passes
      const pendingCheck = await Promise.race([queued.then(() => 'resolved'), Promise.resolve('pending')])
      expect(pendingCheck).toBe('pending')
      await vi.advanceTimersByTimeAsync(120)
      await expect(queued).resolves.toBe('m2')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('tryCatch', () => {
  it('evaluates expressions with input in scope', () => {
    expect(runTryCatch('42', { expression: 'Number(input) * 2' })).toBe('84')
    expect(runTryCatch('x', { expression: 'input.toUpperCase()' })).toBe('X')
    expect(runTryCatch('{"a":1}', { expression: 'JSON.parse(input).a' })).toBe('1')
    expect(runTryCatch('x', {})).toBe('x') // default expression is "input"
  })

  it('stringifies non-string results', () => {
    expect(runTryCatch('x', { expression: 'Math.max(1, 5)' })).toBe('5')
    expect(parse(runTryCatch('x', { expression: '{ a: 1 }' }))).toEqual({ a: 1 })
  })

  it('returns the fallback on errors and nullish results', () => {
    expect(runTryCatch('x', { expression: 'JSON.parse("nope")', fallback: 'safe' })).toBe('safe')
    expect(runTryCatch('x', { expression: 'undefined', fallback: 'fb' })).toBe('fb')
    expect(runTryCatch('x', { expression: 'null', fallback: 'fb' })).toBe('fb')
    expect(runTryCatch('x', { expression: 'JSON.parse("nope")' })).toContain('error:')
  })
})

describe('webhookReceiver', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('generates a webhook URL and reports the latest payload', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ body: { hello: 'world' }, receivedAt: '2026-09-19T00:00:00Z' }),
    } as Response)
    const out = parse(await runWebhookReceiver('', { path: 'myhook' }))
    expect(out.id).toBe('myhook')
    expect(out.url).toContain('/api/webhook/myhook')
    expect(out.lastPayload).toEqual({ hello: 'world' })
    expect(out.receivedAt).toBe('2026-09-19T00:00:00Z')
  })

  it('tolerates unreachable workers and generates an id when omitted', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'))
    const out = parse(await runWebhookReceiver('', {}))
    expect(out.id).toBeTruthy()
    expect(out.url).toContain('/api/webhook/')
    expect(out.lastPayload).toBeNull()
  })
})

describe('yamlLoader', () => {
  it('parses flat key: value documents with typed scalars', () => {
    const out = parse(
      runYamlLoader('name: "Brainwire"\ncount: 3\nratio: 1.5\nenabled: true\nmissing: null')
    )
    expect(out).toEqual({ name: 'Brainwire', count: 3, ratio: 1.5, enabled: true, missing: null })
  })

  it('parses nested objects and lists', () => {
    const yaml = 'server:\n  host: localhost\n  port: 8080\nfruits:\n  - apple\n  - banana'
    const out = parse(runYamlLoader(yaml))
    expect(out).toEqual({ server: { host: 'localhost', port: 8080 }, fruits: ['apple', 'banana'] })
  })

  it('handles comments, inline arrays, and object list items', () => {
    const yaml = '# top comment\nnums: [1, 2]\nitems:\n  - name: a\n    value: 1\n  - name: b\n    value: 2'
    const out = parse(runYamlLoader(yaml))
    expect(out.nums).toEqual([1, 2])
    expect(out.items).toEqual([
      { name: 'a', value: 1 },
      { name: 'b', value: 2 },
    ])
  })

  it('parses top-level lists and bare scalars', () => {
    expect(parse(runYamlLoader('- one\n- two'))).toEqual(['one', 'two'])
    expect(parse(runYamlLoader('just a scalar'))).toBe('just a scalar')
  })

  it('returns an error marker on parser failure', () => {
    // Force a parse failure by feeding a string that triggers the error path
    const spy = vi.spyOn(JSON, 'stringify')
    spy.mockImplementationOnce(() => {
      throw new Error('stringify exploded')
    })
    try {
      const out = runYamlLoader('a: 1')
      expect(out).toContain('yaml error')
    } finally {
      spy.mockRestore()
    }
  })
})
