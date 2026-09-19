// Compare two texts and show differences (line/word/char/json level).
// Uses the `diff` library — loaded dynamically from CDN.

const DIFF_URL = 'https://esm.sh/diff@5.2.0'

interface DiffChange {
  added?: boolean
  removed?: boolean
  value: string
  count?: number
}

interface DiffModule {
  diffWords: (a: string, b: string) => DiffChange[]
  diffChars: (a: string, b: string) => DiffChange[]
  diffJson: (a: unknown, b: unknown) => DiffChange[]
  diffLines: (a: string, b: string) => DiffChange[]
}

let DiffRef: DiffModule | null = null
async function loadDiff(): Promise<DiffModule> {
  if (DiffRef) return DiffRef
  const mod = (await import(/* @vite-ignore */ DIFF_URL)) as unknown as DiffModule
  DiffRef = mod
  return DiffRef
}

export async function runTextDiff(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const oldText = config.oldText ?? input
  const newText = config.newText ?? ''

  if (!oldText || !newText) {
    throw new Error('Both oldText and newText required (or wire one, set other in config)')
  }

  const Diff = await loadDiff()
  const mode = config.mode ?? 'lines'

  let changes: DiffChange[]
  if (mode === 'words') {
    changes = Diff.diffWords(oldText, newText)
  } else if (mode === 'chars') {
    changes = Diff.diffChars(oldText, newText)
  } else if (mode === 'json') {
    changes = Diff.diffJson(JSON.parse(oldText), JSON.parse(newText))
  } else {
    changes = Diff.diffLines(oldText, newText)
  }

  const stats = {
    added: changes.filter((c) => c.added).reduce((s, c) => s + (c.count ?? 0), 0),
    removed: changes.filter((c) => c.removed).reduce((s, c) => s + (c.count ?? 0), 0),
  }

  return JSON.stringify({
    ok: true,
    mode,
    stats,
    changes: changes.map((c) => ({
      added: c.added ?? false,
      removed: c.removed ?? false,
      value: c.value,
      count: c.count,
    })),
  }, null, 2)
}
