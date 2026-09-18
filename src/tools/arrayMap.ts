// Array Map — transform each item in a JSON array.
//
// Config:
//   mode — extract | stringify | uppercase | lowercase | number
//   key  — property to extract (for extract mode)

export async function runArrayMap(
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

  const mode = config.mode ?? 'extract'
  const key = config.key ?? ''

  let mapped: unknown[]

  if (mode === 'extract' && key) {
    mapped = arr.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return (item as Record<string, unknown>)[key] ?? null
      }
      return null
    })
  } else if (mode === 'stringify') {
    mapped = arr.map((item) => JSON.stringify(item))
  } else if (mode === 'uppercase') {
    mapped = arr.map((item) => String(item ?? '').toUpperCase())
  } else if (mode === 'lowercase') {
    mapped = arr.map((item) => String(item ?? '').toLowerCase())
  } else if (mode === 'number') {
    mapped = arr.map((item) => Number(item ?? 0))
  } else {
    mapped = arr
  }

  return JSON.stringify(mapped, null, 2)
}
