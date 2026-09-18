// JSON Diff — compare two JSON values, return differences.
//
// Config:
//   other — the second JSON value (as string). Required.
//   mode  — full (default) | summary

type DiffEntry = {
  path: string
  type: 'added' | 'removed' | 'changed'
  a?: unknown
  b?: unknown
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function diff(a: unknown, b: unknown, path: string, out: DiffEntry[]): void {
  if (a === b) return

  if (isPlainObject(a) && isPlainObject(b)) {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of allKeys) {
      const childPath = path ? `${path}.${k}` : k
      if (!(k in a)) {
        out.push({ path: childPath, type: 'added', b: b[k] })
      } else if (!(k in b)) {
        out.push({ path: childPath, type: 'removed', a: a[k] })
      } else {
        diff(a[k], b[k], childPath, out)
      }
    }
    return
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    const max = Math.max(a.length, b.length)
    for (let i = 0; i < max; i++) {
      const childPath = `${path}[${i}]`
      if (i >= a.length) {
        out.push({ path: childPath, type: 'added', b: b[i] })
      } else if (i >= b.length) {
        out.push({ path: childPath, type: 'removed', a: a[i] })
      } else {
        diff(a[i], b[i], childPath, out)
      }
    }
    return
  }

  out.push({ path, type: 'changed', a, b })
}

export async function runJsonDiff(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const rawA = input.trim()
  const rawB = (config.other ?? '').trim()
  if (!rawA) throw new Error('No input provided')
  if (!rawB) throw new Error('No "other" JSON provided in config')

  let a: unknown
  let b: unknown
  try {
    a = JSON.parse(rawA)
  } catch (err) {
    throw new Error('Input must be valid JSON', { cause: err })
  }
  try {
    b = JSON.parse(rawB)
  } catch (err) {
    throw new Error('"other" must be valid JSON', { cause: err })
  }

  const diffs: DiffEntry[] = []
  diff(a, b, '', diffs)

  const mode = config.mode ?? 'full'

  if (mode === 'summary') {
    const counts = { added: 0, removed: 0, changed: 0 }
    for (const d of diffs) counts[d.type]++
    return JSON.stringify(
      { equal: diffs.length === 0, totalChanges: diffs.length, ...counts },
      null,
      2
    )
  }

  return JSON.stringify(
    { equal: diffs.length === 0, changes: diffs },
    null,
    2
  )
}
