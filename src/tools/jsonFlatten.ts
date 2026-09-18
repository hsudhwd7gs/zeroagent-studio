// JSON Flatten — flatten nested JSON into dot-notation keys.
//
// Config:
//   separator — default "."
//   arrays    — "index" (default) uses [0], [1]; "keep" leaves arrays intact

function flatten(
  value: unknown,
  prefix: string,
  out: Record<string, unknown>,
  separator: string,
  arrayMode: 'index' | 'keep'
): void {
  if (value === null || value === undefined) {
    out[prefix] = value
    return
  }

  if (Array.isArray(value)) {
    if (arrayMode === 'keep') {
      out[prefix] = value
      return
    }
    if (value.length === 0) {
      out[prefix] = []
      return
    }
    value.forEach((item, i) => {
      const childKey = prefix ? `${prefix}[${i}]` : `[${i}]`
      flatten(item, childKey, out, separator, arrayMode)
    })
    return
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      out[prefix] = {}
      return
    }
    for (const [k, v] of entries) {
      const childKey = prefix ? `${prefix}${separator}${k}` : k
      flatten(v, childKey, out, separator, arrayMode)
    }
    return
  }

  out[prefix] = value
}

export async function runJsonFlatten(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const raw = input.trim()
  if (!raw) throw new Error('No input provided')

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch (err) {
    throw new Error('Input must be valid JSON', { cause: err })
  }

  const separator = config.separator?.trim() || '.'
  const arrayMode: 'index' | 'keep' = config.arrays === 'keep' ? 'keep' : 'index'

  const out: Record<string, unknown> = {}
  flatten(data, '', out, separator, arrayMode)

  return JSON.stringify(out, null, 2)
}
