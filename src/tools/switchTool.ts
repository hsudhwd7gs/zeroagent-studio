// Switch / Case node — runtime branch based on input value
// Input: text/json. Config: list of cases [{match, output}] + default.
// Output: the matched case's output (or default).

export interface SwitchCase {
  match: string  // exact match or regex if starts with /
  output: string // emitted if matched
}

export interface SwitchConfig {
  cases?: string // JSON array of SwitchCase
  defaultOutput?: string
  matchMode?: 'exact' | 'regex' | 'contains'
}

export function runSwitch(input: string, config: SwitchConfig = {}): string {
  const trimmed = (input ?? '').trim()
  let cases: SwitchCase[] = []
  try {
    cases = config.cases ? JSON.parse(config.cases) : []
  } catch {
    return `[switch error: invalid cases JSON]`
  }
  const mode = config.matchMode || 'exact'

  for (const c of cases) {
    if (mode === 'regex') {
      try {
        const re = new RegExp(c.match)
        if (re.test(trimmed)) return c.output
      } catch {
        continue
      }
    } else if (mode === 'contains') {
      if (trimmed.includes(c.match)) return c.output
    } else {
      if (trimmed === c.match) return c.output
    }
  }
  return config.defaultOutput ?? ''
}
