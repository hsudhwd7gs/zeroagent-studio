// Tests for pure-logic array + text manipulation tools.
import { describe, it, expect, beforeEach } from 'vitest'
import { runArrayFilter } from '../../src/tools/arrayFilter'
import { runArrayMap } from '../../src/tools/arrayMap'
import { runArraySlice } from '../../src/tools/arraySlice'
import { runArraySort } from '../../src/tools/arraySort'
import { runLoopOver } from '../../src/tools/loopOver'
import { runTextJoin } from '../../src/tools/textJoin'
import { runTextSplit } from '../../src/tools/textSplit'
import { runRegexExtract } from '../../src/tools/regexExtract'
import { runTextTruncate } from '../../src/tools/textTruncate'
import { runTextExtract } from '../../src/tools/textExtract'
import { runStringTemplate } from '../../src/tools/stringTemplate'
import { runHashText } from '../../src/tools/hashText'
import { runSummarize } from '../../src/tools/summarize'
import { runVariableStore } from '../../src/tools/variableStore'

const parse = (s: string) => JSON.parse(s)

describe('arrayFilter', () => {
  it('keeps truthy items by default', async () => {
    const out = parse(await runArrayFilter('[1, "", 0, "x", null, false, 3]', {}))
    expect(out).toEqual([1, 'x', 3])
  })

  it('filters by contains/equals on a key', async () => {
    const data = JSON.stringify([{ n: 'apple' }, { n: 'banana' }, { n: 'cherry' }])
    const contains = parse(await runArrayFilter(data, { mode: 'contains', key: 'n', value: 'an' }))
    expect(contains).toEqual([{ n: 'banana' }])
    const starts = parse(await runArrayFilter(data, { mode: 'contains', key: 'n', value: 'a' }))
    expect(starts).toEqual([{ n: 'apple' }, { n: 'banana' }])
    const equals = parse(await runArrayFilter(data, { mode: 'equals', key: 'n', value: 'banana' }))
    expect(equals).toEqual([{ n: 'banana' }])
  })

  it('filters numerically with greater/less', async () => {
    const data = JSON.stringify([{ v: 1 }, { v: 5 }, { v: 10 }])
    const greater = parse(await runArrayFilter(data, { mode: 'greater', key: 'v', value: '4' }))
    expect(greater).toEqual([{ v: 5 }, { v: 10 }])
    const less = parse(await runArrayFilter(data, { mode: 'less', key: 'v', value: '6' }))
    expect(less).toEqual([{ v: 1 }, { v: 5 }])
  })

  it('throws for empty or non-array input', async () => {
    await expect(runArrayFilter('', {})).rejects.toThrow('No input provided')
    await expect(runArrayFilter('{"a":1}', {})).rejects.toThrow('valid JSON array')
  })
})

describe('arrayMap', () => {
  it('extracts a key from each object', async () => {
    const out = parse(await runArrayMap('[{"a":1},{"a":2}]', { mode: 'extract', key: 'a' }))
    expect(out).toEqual([1, 2])
  })

  it('supports stringify, uppercase, lowercase, and number modes', async () => {
    expect(parse(await runArrayMap('[{"a":1}]', { mode: 'stringify' }))).toEqual(['{"a":1}'])
    expect(parse(await runArrayMap('["a","b"]', { mode: 'uppercase' }))).toEqual(['A', 'B'])
    expect(parse(await runArrayMap('["A","B"]', { mode: 'lowercase' }))).toEqual(['a', 'b'])
    expect(parse(await runArrayMap('["1","2"]', { mode: 'number' }))).toEqual([1, 2])
  })

  it('returns the array unchanged for unknown mode', async () => {
    const out = parse(await runArrayMap('[1,2]', { mode: 'nope' }))
    expect(out).toEqual([1, 2])
  })

  it('throws for empty or invalid input', async () => {
    await expect(runArrayMap('', {})).rejects.toThrow('No input provided')
    await expect(runArrayMap('"str"', {})).rejects.toThrow('valid JSON array')
  })
})

describe('arraySlice', () => {
  it('takes first N items', async () => {
    const out = parse(await runArraySlice('[1,2,3,4,5]', { mode: 'first', count: '2' }))
    expect(out).toEqual([1, 2])
  })

  it('takes last N items', async () => {
    const out = parse(await runArraySlice('[1,2,3,4,5]', { mode: 'last', count: '2' }))
    expect(out).toEqual([4, 5])
  })

  it('slices a range with start/end', async () => {
    const out = parse(await runArraySlice('[1,2,3,4,5]', { start: '1', end: '3' }))
    expect(out).toEqual([2, 3])
  })

  it('defaults end to array length', async () => {
    const out = parse(await runArraySlice('[1,2,3]', { start: '1' }))
    expect(out).toEqual([2, 3])
  })

  it('returns [] for empty input', async () => {
    expect(await runArraySlice('', {})).toBe('[]')
  })

  it('throws for invalid JSON array', async () => {
    await expect(runArraySlice('"x"', {})).rejects.toThrow('valid JSON array')
  })
})

describe('arraySort', () => {
  it('sorts primitives ascending by default', async () => {
    const out = parse(await runArraySort('[3,1,2]', {}))
    expect(out).toEqual([1, 2, 3])
  })

  it('sorts descending', async () => {
    const out = parse(await runArraySort('[3,1,2]', { order: 'desc' }))
    expect(out).toEqual([3, 2, 1])
  })

  it('sorts objects by key', async () => {
    const out = parse(await runArraySort('[{"v":2},{"v":1}]', { key: 'v' }))
    expect(out).toEqual([{ v: 1 }, { v: 2 }])
  })

  it('falls back to string comparison for non-numeric values', async () => {
    const out = parse(await runArraySort('["b","a"]', {}))
    expect(out).toEqual(['a', 'b'])
  })

  it('throws for empty or invalid input', async () => {
    await expect(runArraySort('', {})).rejects.toThrow('No input provided')
    await expect(runArraySort('{}', {})).rejects.toThrow('valid JSON array')
  })
})

describe('loopOver', () => {
  it('extracts a key from items', async () => {
    const out = parse(await runLoopOver('[{"a":"x"},{"a":"y"}]', { mode: 'extract', key: 'a' }))
    expect(out).toEqual(['x', 'y'])
  })

  it('applies text transforms', async () => {
    expect(parse(await runLoopOver('["a","b"]', { mode: 'uppercase' }))).toEqual(['A', 'B'])
    expect(parse(await runLoopOver('["A"," B "]', { mode: 'lowercase' }))).toEqual(['a', ' b '])
    expect(parse(await runLoopOver('[" pad "]', { mode: 'trim' }))).toEqual(['pad'])
    expect(parse(await runLoopOver('["1","2"]', { mode: 'number' }))).toEqual([1, 2])
    expect(parse(await runLoopOver('[{"a":1},"xy",[1,2]]', { mode: 'length' }))).toEqual([1, 2, 2])
  })

  it('prefilters with truthy/contains/equals', async () => {
    expect(parse(await runLoopOver('[0,1,"",2]', { filter: 'truthy' }))).toEqual([1, 2])
    const contains = parse(await runLoopOver('["apple","fig"]', { filter: 'contains:ap' }))
    expect(contains).toEqual(['apple'])
    const equals = parse(await runLoopOver('["a","b"]', { filter: 'equals:b' }))
    expect(equals).toEqual(['b'])
  })

  it('throws for empty or non-array input', async () => {
    await expect(runLoopOver('', {})).rejects.toThrow('No input provided')
    await expect(runLoopOver('"str"', {})).rejects.toThrow('valid JSON array')
  })
})

describe('textJoin', () => {
  it('joins plain values with a separator', async () => {
    expect(await runTextJoin('["a","b","c"]', { separator: '-' })).toBe('a-b-c')
  })

  it('returns empty string for empty input', async () => {
    expect(await runTextJoin('  ', {})).toBe('')
  })

  it('numbered and json modes', async () => {
    expect(await runTextJoin('["a","b"]', { mode: 'numbered' })).toBe('1. a, 2. b')
    expect(await runTextJoin('[{"a":1},2]', { mode: 'json' })).toBe('{"a":1}, 2')
  })

  it('stringifies non-string items in plain mode', async () => {
    expect(await runTextJoin('[1,{"a":2},null]', { separator: '|' })).toBe('1|{"a":2}|')
  })

  it('throws for non-array input', async () => {
    await expect(runTextJoin('"abc"', {})).rejects.toThrow('valid JSON array')
  })
})

describe('textSplit', () => {
  it('splits on a delimiter and drops empties by default', async () => {
    const out = parse(await runTextSplit('a, b,, c', { delimiter: ',' }))
    expect(out).toEqual(['a', 'b', 'c'])
  })

  it('returns [] for empty text', async () => {
    expect(await runTextSplit('', {})).toBe('[]')
  })

  it('supports lines, words, and chars modes', async () => {
    expect(parse(await runTextSplit('l1\nl2', { mode: 'lines' }))).toEqual(['l1', 'l2'])
    expect(parse(await runTextSplit('a  b c', { mode: 'words' }))).toEqual(['a', 'b', 'c'])
    expect(parse(await runTextSplit('ab', { mode: 'chars' }))).toEqual(['a', 'b'])
  })

  it('supports regex mode and validates the pattern', async () => {
    expect(parse(await runTextSplit('a1b2', { mode: 'regex', pattern: '\\d' }))).toEqual(['a', 'b'])
    await expect(runTextSplit('x', { mode: 'regex', pattern: '' })).rejects.toThrow('pattern is required')
    await expect(runTextSplit('x', { mode: 'regex', pattern: '(' })).rejects.toThrow('Invalid regex')
  })

  it('can keep empty items when removeEmpty=false', async () => {
    const out = parse(await runTextSplit('a,,b', { removeEmpty: 'false' }))
    expect(out).toEqual(['a', '', 'b'])
  })
})

describe('regexExtract', () => {
  it('returns all matches by default', async () => {
    const out = parse(await runRegexExtract('id: 12, ref: 34', { pattern: '\\d+' }))
    expect(out).toEqual(['12', '34'])
  })

  it('returns empty string for empty input', async () => {
    expect(await runRegexExtract('', { pattern: 'x' })).toBe('')
  })

  it('throws when pattern is missing or invalid', async () => {
    await expect(runRegexExtract('text', {})).rejects.toThrow('pattern is required')
    await expect(runRegexExtract('text', { pattern: '[' })).rejects.toThrow('Invalid regex')
  })

  it('groups mode returns full match plus groups', async () => {
    const out = parse(await runRegexExtract('12-34', { pattern: '(\\d+)-(\\d+)', mode: 'groups' }))
    expect(out).toEqual([{ full: '12-34', groups: ['12', '34'], index: 0 }])
  })

  it('first mode returns a single match, replace mode substitutes', async () => {
    const first = parse(await runRegexExtract('a1b2', { pattern: '\\d', mode: 'first', flags: '' }))
    expect(first).toEqual({ match: '1', groups: [] })
    expect(await runRegexExtract('a1b2', { pattern: '\\d', mode: 'replace', replace: '#' })).toBe('a#b#')
  })
})

describe('textTruncate', () => {
  it('returns short text unchanged', async () => {
    expect(await runTextTruncate('short', { length: '10' })).toBe('short')
  })

  it('returns empty string for empty input', async () => {
    expect(await runTextTruncate('', {})).toBe('')
  })

  it('truncates long text with a suffix', async () => {
    const out = await runTextTruncate('abcdefghij', { length: '5', suffix: '...' })
    expect(out).toBe('abcde...')
  })

  it('cuts at a word boundary when words=true', async () => {
    const out = await runTextTruncate('one two three four', { length: '11', words: 'true' })
    expect(out).toBe('one two…')
  })
})

describe('textExtract', () => {
  it('extracts emails, urls, numbers, and hashtags in all mode', async () => {
    const text = 'Contact a@b.com or visit https://x.io page #tag number 42'
    const out = parse(await runTextExtract(text, {}))
    expect(out.emails).toEqual(['a@b.com'])
    expect(out.urls).toEqual(['https://x.io'])
    expect(out.numbers).toEqual(['42'])
    expect(out.hashtags).toEqual(['#tag'])
  })

  it('returns empty object for blank input', async () => {
    expect(parse(await runTextExtract('  ', {}))).toEqual({})
  })

  it('dedupes by default and can keep duplicates', async () => {
    const text = 'a@b.com and a@b.com'
    expect(parse(await runTextExtract(text, { mode: 'emails' })).emails).toEqual(['a@b.com'])
    expect(parse(await runTextExtract(text, { mode: 'emails', unique: 'false' })).emails).toEqual(['a@b.com', 'a@b.com'])
  })

  it('ignores unknown modes', async () => {
    const out = parse(await runTextExtract('x', { mode: 'nope' }))
    expect(out).toEqual({})
  })
})

describe('stringTemplate', () => {
  it('replaces {{var}} placeholders with config variables', async () => {
    const out = await runStringTemplate('Hello {{name}}, #{{count}}', {
      template: 'Hello {{name}}, #{{count}}',
      variables: '{"name":"Ada","count":3}',
    })
    expect(out).toBe('Hello Ada, #3')
  })

  it('uses input as variables when config.variables is empty', async () => {
    const out = await runStringTemplate('{"name":"Bob"}', { template: 'Hi {{name}}!' })
    expect(out).toBe('Hi Bob!')
  })

  it('replaces missing variables with empty strings', async () => {
    const out = await runStringTemplate('{"a":1}', { template: 'x{{missing}}y' })
    expect(out).toBe('xy')
  })

  it('throws when no template is available', async () => {
    await expect(runStringTemplate('', {})).rejects.toThrow('No template provided')
  })

  it('tolerates non-JSON variables sources', async () => {
    const out = await runStringTemplate('not json', { template: 'ok {{v}}' })
    expect(out).toBe('ok ')
  })
})

describe('hashText', () => {
  it('produces the known SHA-256 hex digest for "abc"', async () => {
    const out = await runHashText('abc', {})
    expect(out).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('produces the known SHA-1 hex digest', async () => {
    const out = await runHashText('abc', { algorithm: 'SHA-1' })
    expect(out).toBe('a9993e364706816aba3e25717850c26c9cd0d89d')
  })

  it('supports lowercase algorithm aliases and base64 encoding', async () => {
    const hex = await runHashText('abc', { algorithm: 'sha256' })
    expect(hex).toBe(await runHashText('abc', {}))
    const b64 = await runHashText('abc', { encoding: 'base64' })
    expect(b64).toBe('ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=')
  })

  it('falls back to SHA-256 for unknown algorithms', async () => {
    const out = await runHashText('abc', { algorithm: 'nope' })
    expect(out).toBe(await runHashText('abc', {}))
  })
})

describe('summarize', () => {
  const text =
    'The sun rises in the east. Birds sing every morning. The sun gives light and warmth. ' +
    'Birds fly south for winter. Light helps plants grow.'

  it('returns the top sentences in original order (extractive)', async () => {
    const out = parse(await runSummarize(text, { sentences: '2' }))
    expect(out.ok).toBe(true)
    expect(out.mode).toBe('extractive')
    expect(out.topSentences).toHaveLength(2)
    // original order must be preserved
    const idxs = out.topSentences.map((s: string) => text.indexOf(s))
    expect(idxs).toEqual([...idxs].sort((a: number, b: number) => a - b))
  })

  it('throws for empty text', async () => {
    await expect(runSummarize('  ', {})).rejects.toThrow('text required')
  })

  it('bullet mode numbers the sentences', async () => {
    const out = parse(await runSummarize(text, { mode: 'bullet', sentences: '2' }))
    expect(out.summary.startsWith('1. ')).toBe(true)
    expect(out.summary.includes('\n2. ')).toBe(true)
  })

  it('one-line mode returns exactly one sentence', async () => {
    const out = parse(await runSummarize(text, { mode: 'one-line' }))
    expect(out.summary).not.toContain('. ')
  })

  it('headline mode title-cases the first words', async () => {
    const out = parse(await runSummarize(text, { mode: 'headline' }))
    expect(out.headline).toMatch(/^[A-Z]/)
    expect(out.headline.split(/\s+/).length).toBeLessThanOrEqual(7)
  })

  it('throws for unknown mode', async () => {
    await expect(runSummarize(text, { mode: 'nope' })).rejects.toThrow('Unknown mode')
  })
})

describe('variableStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('sets and gets a value, parsing JSON when possible', async () => {
    await runVariableStore('', { mode: 'set', key: 'hits', value: '42' })
    expect(await runVariableStore('', { mode: 'get', key: 'hits' })).toBe('42')

    await runVariableStore('', { mode: 'set', key: 'obj', value: '{"a":1}' })
    const out = parse(await runVariableStore('', { mode: 'get', key: 'obj' }))
    expect(out).toEqual({ a: 1 })
  })

  it('returns empty string when the key does not exist', async () => {
    expect(await runVariableStore('', { mode: 'get', key: 'missing' })).toBe('')
  })

  it('appends values into an array and reports the count', async () => {
    await runVariableStore('a', { mode: 'append', key: 'list' })
    const out = parse(await runVariableStore('b', { mode: 'append', key: 'list' }))
    expect(out.count).toBe(2)
    const stored = parse(await runVariableStore('', { mode: 'get', key: 'list' }))
    expect(stored).toEqual(['a', 'b'])
  })

  it('clears a namespace without touching other namespaces', async () => {
    await runVariableStore('1', { mode: 'set', namespace: 'alpha', key: 'x' })
    await runVariableStore('2', { mode: 'set', namespace: 'beta', key: 'x' })
    await runVariableStore('', { mode: 'clear', namespace: 'alpha' })
    expect(await runVariableStore('', { mode: 'get', namespace: 'alpha', key: 'x' })).toBe('')
    expect(await runVariableStore('', { mode: 'get', namespace: 'beta', key: 'x' })).toBe('2')
  })

  it('expired entries are treated as missing', async () => {
    await runVariableStore('temp', { mode: 'set', key: 't', ttlMs: '1' })
    await new Promise((r) => setTimeout(r, 5))
    expect(await runVariableStore('', { mode: 'get', key: 't' })).toBe('')
  })

  it('throws when a key is required but missing', async () => {
    await expect(runVariableStore('', { mode: 'set' })).rejects.toThrow('key is required')
    await expect(runVariableStore('', { mode: 'nope', key: 'k' })).rejects.toThrow('Unknown mode')
  })
})
