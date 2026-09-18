// Array Filter — keep items matching a condition.
//
// Config:
//   mode  — truthy | contains | equals | greater | less
//   key   — property to check (for object items)
//   value — comparison value (for contains/equals/greater/less)

export async function runArrayFilter(
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

  const mode = config.mode ?? 'truthy'
  const key = config.key ?? ''

  const getValue = (item: unknown): unknown => {
    if (key && item && typeof item === 'object' && !Array.isArray(item)) {
      return (item as Record<string, unknown>)[key]
    }
    return item
  }

  let filtered: unknown[]

  if (mode === 'contains') {
    const needle = config.value ?? ''
    filtered = arr.filter((item) => String(getValue(item) ?? '').includes(needle))
  } else if (mode === 'equals') {
    const target = config.value ?? ''
    filtered = arr.filter((item) => String(getValue(item) ?? '') === target)
  } else if (mode === 'greater') {
    const threshold = Number(config.value ?? 0)
    filtered = arr.filter((item) => Number(getValue(item) ?? 0) > threshold)
  } else if (mode === 'less') {
    const threshold = Number(config.value ?? 0)
    filtered = arr.filter((item) => Number(getValue(item) ?? 0) < threshold)
  } else {
    filtered = arr.filter((item) => Boolean(getValue(item)))
  }

  return JSON.stringify(filtered, null, 2)
}
