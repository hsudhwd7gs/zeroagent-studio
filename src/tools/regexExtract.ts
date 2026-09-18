// Regex Extract — apply a regex pattern and return all matches + groups.
//
// Config:
//   pattern — regex pattern string (required)
//   flags   — regex flags (default "g")
//   mode    — matches (default) | groups | first
//   replace — optional: replacement string (used with mode="replace")
//
// Note: pattern is passed to `new RegExp(pattern, flags)`.
// Invalid patterns throw with a clear message.

export async function runRegexExtract(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = input
  if (!text) return ''

  const pattern = config.pattern ?? ''
  if (!pattern) throw new Error('Regex pattern is required')

  const flags = config.flags ?? 'g'
  const mode = config.mode ?? 'matches'

  let re: RegExp
  try {
    re = new RegExp(pattern, flags)
  } catch (err) {
    throw new Error(
      `Invalid regex: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    )
  }

  if (mode === 'replace') {
    const replacement = config.replace ?? ''
    return text.replace(re, replacement)
  }

  if (mode === 'first') {
    const m = text.match(new RegExp(pattern, flags.replace('g', '')))
    if (!m) return ''
    return JSON.stringify({ match: m[0], groups: m.slice(1) }, null, 2)
  }

  if (mode === 'groups') {
    const matches = Array.from(text.matchAll(re))
    const grouped = matches.map((m) => ({
      full: m[0],
      groups: m.slice(1),
      index: m.index ?? 0,
    }))
    return JSON.stringify(grouped, null, 2)
  }

  // Default — return list of matched strings
  const matches = text.match(re) ?? []
  return JSON.stringify(matches, null, 2)
}
