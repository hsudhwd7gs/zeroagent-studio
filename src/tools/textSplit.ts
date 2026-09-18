// Text Split — split text into a JSON array.
//
// Config:
//   mode       — delimiter (default) | regex | lines | words | chars
//   delimiter  — string to split on (for "delimiter" mode)
//   pattern    — regex pattern (for "regex" mode)
//   trim       — "true" to trim each item (default "true")
//   removeEmpty — "true" to drop empty items (default "true")

export async function runTextSplit(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = input
  if (!text) return '[]'

  const mode = config.mode ?? 'delimiter'
  const trim = config.trim !== 'false'
  const removeEmpty = config.removeEmpty !== 'false'

  let parts: string[]

  if (mode === 'lines') {
    parts = text.split(/\r?\n/)
  } else if (mode === 'words') {
    parts = text.split(/\s+/)
  } else if (mode === 'chars') {
    parts = text.split('')
  } else if (mode === 'regex') {
    const pattern = config.pattern ?? ''
    if (!pattern) throw new Error('Regex pattern is required for regex mode')
    let re: RegExp
    try {
      re = new RegExp(pattern)
    } catch (err) {
      throw new Error(
        `Invalid regex: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err }
      )
    }
    parts = text.split(re)
  } else {
    const delimiter = config.delimiter ?? ','
    parts = text.split(delimiter)
  }

  let out = parts
  if (trim) out = out.map((s) => s.trim())
  if (removeEmpty) out = out.filter((s) => s.length > 0)

  return JSON.stringify(out, null, 2)
}
