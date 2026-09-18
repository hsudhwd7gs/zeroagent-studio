// JSON Pick — keep only specific keys from a JSON object or array of objects.
//
// Config:
//   keys — comma-separated list (e.g. "id,title,views")

function pickFromObject(
  obj: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    if (k in obj) out[k] = obj[k]
  }
  return out
}

export async function runJsonPick(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const raw = input.trim()
  if (!raw) throw new Error('No input provided')

  const keysCsv = (config.keys ?? '').trim()
  if (!keysCsv) throw new Error('No keys provided')

  const keys = keysCsv
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch (err) {
    throw new Error('Input must be valid JSON', { cause: err })
  }

  if (Array.isArray(data)) {
    const out = data.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return pickFromObject(item as Record<string, unknown>, keys)
      }
      return item
    })
    return JSON.stringify(out, null, 2)
  }

  if (data && typeof data === 'object') {
    return JSON.stringify(pickFromObject(data as Record<string, unknown>, keys), null, 2)
  }

  throw new Error('Input must be a JSON object or array of objects')
}
