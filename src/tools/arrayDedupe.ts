// Array Dedupe — remove duplicate items from a JSON array.
//
// Config:
//   key — property to check for uniqueness (empty = whole item)

export async function runArrayDedupe(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const raw = input.trim()
  if (!raw) throw new Error('No input provided')

  let arr: unknown[]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array')
    arr = parsed
  } catch (err) {
    throw new Error('Input must be a valid JSON array', { cause: err })
  }

  const key = config.key ?? ''
  const seen = new Set<string>()
  const result: unknown[] = []

  for (const item of arr) {
    let marker: string
    if (key && item && typeof item === 'object' && !Array.isArray(item)) {
      marker = String((item as Record<string, unknown>)[key] ?? '')
    } else {
      marker = JSON.stringify(item)
    }
    if (!seen.has(marker)) {
      seen.add(marker)
      result.push(item)
    }
  }

  return JSON.stringify(result, null, 2)
}
