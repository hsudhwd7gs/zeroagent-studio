// Array Slice — take a portion of a JSON array.
//
// Config:
//   mode  — range (default) | first | last
//   start — start index (for range)
//   end   — end index, exclusive (for range)
//   count — number of items (for first/last)

export async function runArraySlice(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const raw = input.trim()
  if (!raw) return '[]'

  let arr: unknown[]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array')
    arr = parsed
  } catch (err) {
    throw new Error('Input must be a valid JSON array', { cause: err })
  }

  const mode = config.mode ?? 'range'
  const count = Math.max(0, Math.floor(Number(config.count ?? '10')))

  let result: unknown[]

  if (mode === 'first') {
    result = arr.slice(0, count)
  } else if (mode === 'last') {
    result = count > 0 ? arr.slice(-count) : []
  } else {
    const start = Math.max(0, Math.floor(Number(config.start ?? '0')))
    const endRaw = config.end?.trim()
    const end = endRaw === undefined || endRaw === '' ? arr.length : Math.floor(Number(endRaw))
    result = arr.slice(start, end)
  }

  return JSON.stringify(result, null, 2)
}
