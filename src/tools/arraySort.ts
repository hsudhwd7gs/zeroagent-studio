// Array Sort — sort a JSON array by key.
//
// Config:
//   key   — property to sort by (empty for primitive arrays)
//   order — asc | desc
//   type  — auto | number | string

export async function runArraySort(
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
  const order = config.order === 'desc' ? -1 : 1
  const type = config.type ?? 'auto'

  const getValue = (item: unknown): unknown => {
    if (key && item && typeof item === 'object' && !Array.isArray(item)) {
      return (item as Record<string, unknown>)[key]
    }
    return item
  }

  const sorted = [...arr].sort((a, b) => {
    const va = getValue(a)
    const vb = getValue(b)

    if (type === 'number') {
      return (Number(va ?? 0) - Number(vb ?? 0)) * order
    }

    if (type === 'auto') {
      const na = Number(va)
      const nb = Number(vb)
      if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '' && va !== null && vb !== null) {
        return (na - nb) * order
      }
    }

    return String(va ?? '').localeCompare(String(vb ?? '')) * order
  })

  return JSON.stringify(sorted, null, 2)
}
