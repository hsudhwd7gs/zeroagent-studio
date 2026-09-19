// Diff Viewer — produce a line-by-line diff of two text inputs.
// Uses a simple LCS algorithm. Output: unified diff or JSON of changes.

export interface DiffConfig {
  format?: 'unified' | 'json' | 'side-by-side'
  contextLines?: string // for unified format
}

export interface DiffLine {
  type: 'add' | 'del' | 'ctx'
  text: string
  oldLine?: number
  newLine?: number
}

export function runDiffViewer(input: string, config: DiffConfig = {}): string {
  // Input format: JSON { a: string, b: string }
  let parsed: { a?: string; b?: string }
  try {
    parsed = JSON.parse(input)
  } catch {
    // Fallback: split input on \n---\n
    const parts = input.split('\n---\n')
    if (parts.length === 2) {
      parsed = { a: parts[0], b: parts[1] }
    } else {
      return '[diff error: input must be JSON {a, b} or two texts separated by --- on its own line]'
    }
  }

  const a = (parsed.a ?? '').split('\n')
  const b = (parsed.b ?? '').split('\n')
  const diff = lcsDiff(a, b)
  const format = config.format || 'unified'

  if (format === 'json') {
    return JSON.stringify(diff, null, 2)
  }

  if (format === 'side-by-side') {
    const maxLen = Math.max(a.length, b.length)
    const lines: string[] = []
    lines.push('--- left\t+++ right')
    for (let i = 0; i < maxLen; i++) {
      const left = (a[i] ?? '').padEnd(40).slice(0, 40)
      const right = b[i] ?? ''
      lines.push(`${left}\t${right}`)
    }
    return lines.join('\n')
  }

  // unified
  const out: string[] = ['--- a', '+++ b']
  for (const d of diff) {
    if (d.type === 'add') out.push(`+${d.text}`)
    else if (d.type === 'del') out.push(`-${d.text}`)
    else out.push(` ${d.text}`)
  }
  return out.join('\n')
}

interface LcsDiffResult {
  type: 'add' | 'del' | 'ctx'
  text: string
}

function lcsDiff(a: string[], b: string[]): LcsDiffResult[] {
  // Build LCS table
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  // Backtrack to produce diff
  const result: LcsDiffResult[] = []
  let i = 0, j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push({ type: 'ctx', text: a[i] })
      i++; j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'del', text: a[i] })
      i++
    } else {
      result.push({ type: 'add', text: b[j] })
      j++
    }
  }
  while (i < m) {
    result.push({ type: 'del', text: a[i] })
    i++
  }
  while (j < n) {
    result.push({ type: 'add', text: b[j] })
    j++
  }
  return result
}
