// JSON Merge — deep merge two JSON objects.
//
// Config:
//   other — the second JSON object (as string)
//   mode  — deep (default) | shallow

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function deepMerge(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a }
  for (const [k, v] of Object.entries(b)) {
    if (isPlainObject(out[k]) && isPlainObject(v)) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v)
    } else {
      out[k] = v
    }
  }
  return out
}

export async function runJsonMerge(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const rawA = input.trim()
  const rawB = (config.other ?? '').trim()
  if (!rawA) throw new Error('No input provided')
  if (!rawB) throw new Error('No "other" JSON provided in config')

  let a: unknown
  let b: unknown
  try {
    a = JSON.parse(rawA)
  } catch (err) {
    throw new Error('Input must be valid JSON', { cause: err })
  }
  try {
    b = JSON.parse(rawB)
  } catch (err) {
    throw new Error('"other" must be valid JSON', { cause: err })
  }

  if (!isPlainObject(a) || !isPlainObject(b)) {
    throw new Error('Both values must be JSON objects (not arrays or primitives)')
  }

  const mode = config.mode ?? 'deep'
  const result = mode === 'shallow' ? { ...a, ...b } : deepMerge(a, b)
  return JSON.stringify(result, null, 2)
}
