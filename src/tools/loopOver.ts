// Loop Over — apply a transform to each item in a JSON array.
//
// This is a "safe loop" — it runs inside one node, no orchestration changes.
//
// Config:
//   mode     — extract | stringify | uppercase | lowercase | number | trim | length
//   key      — property to extract (for extract mode)
//   filter   — optional: "truthy" | "contains:VAL" | "equals:VAL"

export async function runLoopOver(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const raw = input.trim()
  if (!raw) throw new Error('No input provided')

  let arr: unknown[]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('Input must be a JSON array')
    }
    arr = parsed
  } catch (err) {
    throw new Error('Input must be a valid JSON array', { cause: err })
  }

  const mode = config.mode ?? 'extract'
  const key = config.key ?? ''
  const filter = (config.filter ?? '').trim()

  const getValue = (item: unknown): unknown => {
    if (key && item && typeof item === 'object' && !Array.isArray(item)) {
      return (item as Record<string, unknown>)[key]
    }
    return item
  }

  // Optional pre-filter
  if (filter) {
    if (filter === 'truthy') {
      arr = arr.filter((item) => Boolean(getValue(item)))
    } else if (filter.startsWith('contains:')) {
      const needle = filter.slice('contains:'.length)
      arr = arr.filter((item) => String(getValue(item) ?? '').includes(needle))
    } else if (filter.startsWith('equals:')) {
      const target = filter.slice('equals:'.length)
      arr = arr.filter((item) => String(getValue(item) ?? '') === target)
    }
  }

  let mapped: unknown[]

  if (mode === 'extract') {
    mapped = arr.map((item) => getValue(item) ?? null)
  } else if (mode === 'stringify') {
    mapped = arr.map((item) => JSON.stringify(item))
  } else if (mode === 'uppercase') {
    mapped = arr.map((item) => String(getValue(item) ?? '').toUpperCase())
  } else if (mode === 'lowercase') {
    mapped = arr.map((item) => String(getValue(item) ?? '').toLowerCase())
  } else if (mode === 'trim') {
    mapped = arr.map((item) => String(getValue(item) ?? '').trim())
  } else if (mode === 'number') {
    mapped = arr.map((item) => Number(getValue(item) ?? 0))
  } else if (mode === 'length') {
    mapped = arr.map((item) => {
      const v = getValue(item)
      if (Array.isArray(v)) return v.length
      if (typeof v === 'string') return v.length
      if (v && typeof v === 'object') return Object.keys(v).length
      return 0
    })
  } else {
    mapped = arr
  }

  return JSON.stringify(mapped, null, 2)
}
