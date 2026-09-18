// Text Extract — pull emails, URLs, phones, numbers, hashtags from text.
//
// Config:
//   mode   — emails | urls | phones | numbers | hashtags | all
//   unique — "true" (default) to dedupe results

const PATTERNS: Record<string, RegExp> = {
  emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  urls: /https?:\/\/[^\s<>"'`)]+/g,
  phones: /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  numbers: /-?\d+(?:\.\d+)?/g,
  hashtags: /#[\w]+/g,
}

export async function runTextExtract(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = input
  if (!text.trim()) return JSON.stringify({})

  const mode = config.mode ?? 'all'
  const unique = config.unique !== 'false'

  const result: Record<string, string[]> = {}

  const modes = mode === 'all' ? Object.keys(PATTERNS) : [mode]

  for (const m of modes) {
    const re = PATTERNS[m]
    if (!re) continue
    const matches = text.match(re) ?? []
    const finalMatches = unique ? Array.from(new Set(matches)) : matches
    result[m] = finalMatches
  }

  return JSON.stringify(result, null, 2)
}
