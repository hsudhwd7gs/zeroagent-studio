// String Template — replace {{variable}} with values from a JSON object.
//
// Config:
//   template  — string with {{var}} placeholders (falls back to input)
//   variables — JSON object string, e.g. {"name":"Alice","count":"5"}
//               If empty, tries to parse the input as a JSON object.

export async function runStringTemplate(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const template = (config.template ?? input).trim()
  if (!template) throw new Error('No template provided')

  const vars: Record<string, string> = {}
  
  const varsSource = config.variables?.trim() || input.trim()
  if (varsSource) {
    try {
      const parsed = JSON.parse(varsSource)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          vars[k] = v === null || v === undefined ? '' : String(v)
        }
      }
    } catch {
      void 0
    }
  }

  const result = template.replace(
    /\{\{\s*([\w.-]+)\s*\}\}/g,
    (_match, key: string) => vars[key] ?? ''
  )

  return result
}
