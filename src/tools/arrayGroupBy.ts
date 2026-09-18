// Array Group By — group array items by a key.
//
// Output: { "groupA": [items...], "groupB": [items...] }
//
// Config:
//   key — property to group by

export async function runArrayGroupBy(
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

  const key = (config.key ?? '').trim()
  if (!key) throw new Error('No grouping key provided')

  const groups: Record<string, unknown[]> = {}

  for (const item of arr) {
    let groupKey = '__ungrouped__'
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const v = (item as Record<string, unknown>)[key]
      if (v !== null && v !== undefined) {
        groupKey = String(v)
      }
    }
    if (!groups[groupKey]) groups[groupKey] = []
    groups[groupKey].push(item)
  }

  return JSON.stringify(groups, null, 2)
}
