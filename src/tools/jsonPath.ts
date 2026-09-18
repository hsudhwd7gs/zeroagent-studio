// JSON Path — extract a value from JSON using dot/bracket notation.
//
// Supported paths:
//   user.name
//   items[0].title
//   data.users[2].email
//   count

export async function runJsonPath(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const raw = input.trim()
  if (!raw) throw new Error('No input provided')

  const path = (config.path ?? '').trim()
  if (!path) throw new Error('No path provided')

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch (err) {
    throw new Error('Input must be valid JSON', { cause: err })
  }

  const tokens: Array<string | number> = []
  const re = /[^.[\]]+|\[(\d+)\]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(path)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(Number(match[1]))
    } else if (match[0]) {
      tokens.push(match[0])
    }
  }

  let current: unknown = data
  for (const token of tokens) {
    if (current === null || current === undefined) {
      return ''
    }
    if (typeof token === 'number') {
      if (!Array.isArray(current)) return ''
      current = current[token]
    } else {
      if (typeof current !== 'object' || Array.isArray(current)) return ''
      current = (current as Record<string, unknown>)[token]
    }
  }

  if (current === null || current === undefined) return ''
  if (typeof current === 'string') return current
  return JSON.stringify(current, null, 2)
}
