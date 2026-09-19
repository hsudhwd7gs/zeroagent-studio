// Tests for pure-logic data tools: CSV + JSON manipulation nodes.
import { describe, it, expect } from 'vitest'
import { runCsvToJson } from '../../src/tools/csvToJson'
import { runCsvExport } from '../../src/tools/csvExport'
import { runJsonDiff } from '../../src/tools/jsonDiff'
import { runJsonFlatten } from '../../src/tools/jsonFlatten'
import { runJsonPath } from '../../src/tools/jsonPath'
import { runJsonPick } from '../../src/tools/jsonPick'
import { runJsonMerge } from '../../src/tools/jsonMerge'

const parse = (s: string) => JSON.parse(s)

describe('csvToJson', () => {
  it('parses basic CSV with headers into objects', async () => {
    const out = parse(await runCsvToJson('name,age\nAlice,30\nBob,25', {}))
    expect(out).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('returns [] for empty input', async () => {
    expect(await runCsvToJson('   ', {})).toBe('[]')
  })

  it('supports custom delimiters', async () => {
    const out = parse(await runCsvToJson('a;b\n1;2', { delimiter: ';' }))
    expect(out).toEqual([{ a: '1', b: '2' }])
  })

  it('supports tab delimiter via \\t', async () => {
    const out = parse(await runCsvToJson('a\tb\n1\t2', { delimiter: '\\t' }))
    expect(out).toEqual([{ a: '1', b: '2' }])
  })

  it('handles quoted fields with embedded delimiters and escaped quotes', async () => {
    const csv = 'name,note\n"Smith, John","said ""hi"""'
    const out = parse(await runCsvToJson(csv, {}))
    expect(out).toEqual([{ name: 'Smith, John', note: 'said "hi"' }])
  })

  it('header=false returns array of arrays', async () => {
    const out = parse(await runCsvToJson('a,b\n1,2', { header: 'false' }))
    expect(out).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('trims values by default and can disable trimming', async () => {
    const withTrim = parse(await runCsvToJson('x\n  padded  ', {}))
    expect(withTrim).toEqual([{ x: 'padded' }])
    // Note: the whole input is trimmed first, so only the leading spaces survive
    const noTrim = parse(await runCsvToJson('x\n  padded  ', { trim: 'false' }))
    expect(noTrim).toEqual([{ x: '  padded' }])
  })

  it('fills missing trailing cells with empty strings', async () => {
    const out = parse(await runCsvToJson('a,b,c\n1,2', {}))
    expect(out).toEqual([{ a: '1', b: '2', c: '' }])
  })
})

describe('csvExport', () => {
  it('converts array of objects to CSV with header', async () => {
    const out = await runCsvExport(JSON.stringify([{ a: '1', b: '2' }, { a: '3', b: '4' }]), {})
    expect(out).toBe('a,b\n1,2\n3,4')
  })

  it('throws on empty input', async () => {
    await expect(runCsvExport('', {})).rejects.toThrow('No input provided')
  })

  it('throws on non-array input', async () => {
    await expect(runCsvExport('{"a":1}', {})).rejects.toThrow('valid JSON array')
  })

  it('returns empty string for empty array', async () => {
    expect(await runCsvExport('[]', {})).toBe('')
  })

  it('quotes values containing delimiters, quotes, and newlines', async () => {
    const out = await runCsvExport(
      JSON.stringify([{ msg: 'a,b', quote: 'say "hi"', line: 'l1\nl2' }]),
      {}
    )
    expect(out).toBe('msg,quote,line\n"a,b","say ""hi""","l1\nl2"')
  })

  it('supports specified columns and TSV delimiter', async () => {
    const out = await runCsvExport(
      JSON.stringify([{ a: 1, b: 2, c: 3 }]),
      { columns: 'c,a', delimiter: '\\t' }
    )
    expect(out).toBe('c\ta\n3\t1')
  })

  it('wraps primitive arrays under a value column', async () => {
    const out = await runCsvExport(JSON.stringify(['x', 'y']), {})
    expect(out).toBe('value\nx\ny')
  })
})

describe('jsonDiff', () => {
  it('reports equal objects with zero changes', async () => {
    const out = parse(await runJsonDiff('{"a":1}', { other: '{"a":1}' }))
    expect(out.equal).toBe(true)
    expect(out.changes).toHaveLength(0)
  })

  it('throws without input or other', async () => {
    await expect(runJsonDiff('', { other: '{}' })).rejects.toThrow('No input provided')
    await expect(runJsonDiff('{}', {})).rejects.toThrow('No "other"')
  })

  it('throws on invalid JSON', async () => {
    await expect(runJsonDiff('{bad', { other: '{}' })).rejects.toThrow('valid JSON')
    await expect(runJsonDiff('{}', { other: '{bad' })).rejects.toThrow('valid JSON')
  })

  it('detects added, removed, and changed keys with paths', async () => {
    const a = { keep: 1, gone: 2, changed: 3 }
    const b = { keep: 1, new: 4, changed: 9 }
    const out = parse(await runJsonDiff(JSON.stringify(a), { other: JSON.stringify(b) }))
    const types = Object.fromEntries(out.changes.map((c: { path: string; type: string }) => [c.path, c.type]))
    expect(types.gone).toBe('removed')
    expect(types.new).toBe('added')
    expect(types.changed).toBe('changed')
  })

  it('diffs nested arrays with index paths', async () => {
    const out = parse(await runJsonDiff('[1,2]', { other: '[1,2,3]' }))
    expect(out.changes).toEqual([{ path: '[2]', type: 'added', b: 3 }])
  })

  it('summary mode counts change types', async () => {
    const out = parse(
      await runJsonDiff('{"a":1,"b":2}', { other: '{"a":9,"c":3}', mode: 'summary' })
    )
    expect(out).toEqual({ equal: false, totalChanges: 3, added: 1, removed: 1, changed: 1 })
  })
})

describe('jsonFlatten', () => {
  it('flattens nested objects into dot notation', async () => {
    const out = parse(await runJsonFlatten('{"a":{"b":{"c":1}}}', {}))
    expect(out).toEqual({ 'a.b.c': 1 })
  })

  it('throws on empty input and invalid JSON', async () => {
    await expect(runJsonFlatten('', {})).rejects.toThrow('No input provided')
    await expect(runJsonFlatten('nope', {})).rejects.toThrow('valid JSON')
  })

  it('indexes arrays by default and can keep them intact', async () => {
    const indexed = parse(await runJsonFlatten('{"list":[1,2]}', {}))
    expect(indexed).toEqual({ 'list[0]': 1, 'list[1]': 2 })
    const kept = parse(await runJsonFlatten('{"list":[1,2]}', { arrays: 'keep' }))
    expect(kept).toEqual({ list: [1, 2] })
  })

  it('preserves null values and empty containers', async () => {
    const out = parse(await runJsonFlatten('{"n":null,"e":[],"o":{}}', {}))
    expect(out).toEqual({ n: null, e: [], o: {} })
  })

  it('supports custom separators', async () => {
    const out = parse(await runJsonFlatten('{"a":{"b":1}}', { separator: '_' }))
    expect(out).toEqual({ a_b: 1 })
  })
})

describe('jsonPath', () => {
  it('extracts nested values via dot notation', async () => {
    expect(await runJsonPath('{"user":{"name":"Ada"}}', { path: 'user.name' })).toBe('Ada')
  })

  it('extracts array items via bracket notation', async () => {
    const out = await runJsonPath('{"items":[{"title":"T0"},{"title":"T1"}]}', { path: 'items[1].title' })
    expect(out).toBe('T1')
  })

  it('throws on missing input or path', async () => {
    await expect(runJsonPath('', { path: 'a' })).rejects.toThrow('No input provided')
    await expect(runJsonPath('{"a":1}', {})).rejects.toThrow('No path provided')
  })

  it('returns empty string for missing paths and wrong types', async () => {
    expect(await runJsonPath('{"a":1}', { path: 'b.c' })).toBe('')
    expect(await runJsonPath('{"a":1}', { path: 'a[0]' })).toBe('')
    expect(await runJsonPath('{"a":{"b":null}}', { path: 'a.b' })).toBe('')
  })

  it('returns primitives directly and objects as JSON', async () => {
    expect(await runJsonPath('{"count": 7}', { path: 'count' })).toBe('7')
    const obj = parse(await runJsonPath('{"o":{"x":1}}', { path: 'o' }))
    expect(obj).toEqual({ x: 1 })
  })
})

describe('jsonPick', () => {
  it('keeps only requested keys from an object', async () => {
    const out = parse(await runJsonPick('{"id":1,"title":"T","views":9}', { keys: 'id,title' }))
    expect(out).toEqual({ id: 1, title: 'T' })
  })

  it('throws on empty input or missing keys config', async () => {
    await expect(runJsonPick('', { keys: 'a' })).rejects.toThrow('No input provided')
    await expect(runJsonPick('{"a":1}', {})).rejects.toThrow('No keys provided')
  })

  it('maps over arrays of objects, passing primitives through', async () => {
    const out = parse(await runJsonPick('[{"a":1,"b":2},"str"]', { keys: 'a' }))
    expect(out).toEqual([{ a: 1 }, 'str'])
  })

  it('throws for non-object, non-array JSON', async () => {
    await expect(runJsonPick('42', { keys: 'a' })).rejects.toThrow('object or array')
  })
})

describe('jsonMerge', () => {
  it('deep merges nested objects', async () => {
    const out = parse(
      await runJsonMerge('{"a":{"x":1,"y":2},"b":1}', { other: '{"a":{"y":9,"z":3}}' })
    )
    expect(out).toEqual({ a: { x: 1, y: 9, z: 3 }, b: 1 })
  })

  it('shallow merge replaces nested objects wholesale', async () => {
    const out = parse(
      await runJsonMerge('{"a":{"x":1}}', { other: '{"a":{"y":2}}', mode: 'shallow' })
    )
    expect(out).toEqual({ a: { y: 2 } })
  })

  it('throws on missing or non-object inputs', async () => {
    await expect(runJsonMerge('', { other: '{}' })).rejects.toThrow('No input provided')
    await expect(runJsonMerge('{}', {})).rejects.toThrow('No "other"')
    await expect(runJsonMerge('[1]', { other: '{}' })).rejects.toThrow('must be JSON objects')
    await expect(runJsonMerge('{"a":1}', { other: '[1]' })).rejects.toThrow('must be JSON objects')
  })
})
