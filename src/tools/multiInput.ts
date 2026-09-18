// Multi-Input tool — collects named fields into a JSON object.
//
// Config shape (all stored as a single JSON string in config.fields):
//   [
//     { "key": "seed", "value": "personal finance" },
//     { "key": "region", "value": "US" },
//     { "key": "language", "value": "en" }
//   ]
//
// Output: pretty-printed JSON object with one entry per field.

export interface MultiInputField {
  key: string
  label?: string
  value?: string
}

export function parseMultiInputFields(
  raw: string | undefined
): MultiInputField[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((f) => f && typeof f === 'object')
      .map((f) => {
        const obj = f as Record<string, unknown>
        return {
          key: String(obj.key ?? '').trim(),
          label:
            typeof obj.label === 'string' ? obj.label : undefined,
          value:
            obj.value === undefined || obj.value === null
              ? ''
              : String(obj.value),
        }
      })
      .filter((f) => f.key.length > 0)
  } catch {
    return []
  }
}

export function serializeMultiInputFields(
  fields: MultiInputField[]
): string {
  return JSON.stringify(fields)
}

export function createEmptyField(index: number): MultiInputField {
  return {
    key: `field${index}`,
    label: `Field ${index}`,
    value: '',
  }
}

export async function runMultiInput(
  _input: string,
  config: Record<string, string>
): Promise<string> {
  const fields = parseMultiInputFields(config.fields)

  if (fields.length === 0) {
    throw new Error(
      'No fields configured. Add at least one field in the inspector.'
    )
  }

  const out: Record<string, string> = {}
  const seen = new Set<string>()

  for (const f of fields) {
    if (seen.has(f.key)) {
      throw new Error(`Duplicate field key: "${f.key}"`)
    }
    seen.add(f.key)
    out[f.key] = f.value ?? ''
  }

  return JSON.stringify(out, null, 2)
}
