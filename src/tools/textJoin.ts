// Text Join — join a JSON array into a single string.
//
// Config:
//   separator — string between items (default ", ")
//   mode      — plain (default) | json | numbered

export async function runTextJoin(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const raw = input.trim()
  if (!raw) return ''

  let arr: unknown[]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array')
    arr = parsed
  } catch (err) {
    throw new Error('Input must be a valid JSON array', { cause: err })
  }

  const separator = config.separator ?? ', '
  const mode = config.mode ?? 'plain'

  if (mode === 'json') {
    return arr.map((item) => JSON.stringify(item)).join(separator)
  }

  if (mode === 'numbered') {
    return arr
      .map((item, i) => `${i + 1}. ${String(item ?? '')}`)
      .join(separator)
  }

  return arr
    .map((item) => {
      if (item === null || item === undefined) return ''
      if (typeof item === 'string') return item
      return JSON.stringify(item)
    })
    .join(separator)
}
