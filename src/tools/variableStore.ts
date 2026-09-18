// Variable Store — shared key-value state across a workflow.
//
// Persists to localStorage so values survive page reloads.
// Any node in the workflow can read/write the same namespace.
//
// Config:
//   mode      — "set" (write) | "get" (read) | "append" (push to array) | "clear"
//   namespace — grouping key (default "default")
//   key       — variable name (required for set/get/append)
//   value     — value to store (for set/append; empty = use input)
//   ttlMs     — optional expiry in ms (0 = never)

const STORAGE_PREFIX = 'zeroagent.varstore.'

interface StoredEntry {
  value: unknown
  expiresAt: number | null
}

function storageKey(namespace: string, key: string): string {
  return `${STORAGE_PREFIX}${namespace}.${key}`
}

function safeGetItem(fullKey: string): StoredEntry | null {
  try {
    const raw = localStorage.getItem(fullKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredEntry
    if (parsed.expiresAt !== null && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(fullKey)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function safeSetItem(fullKey: string, entry: StoredEntry): void {
  try {
    localStorage.setItem(fullKey, JSON.stringify(entry))
  } catch {
    void 0
  }
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function runVariableStore(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const mode = config.mode ?? 'set'
  const namespace = (config.namespace ?? 'default').trim() || 'default'
  const key = (config.key ?? '').trim()
  const ttlMs = Math.max(0, Math.floor(Number(config.ttlMs ?? '0')))

  if (mode === 'clear') {
    try {
      const prefix = `${STORAGE_PREFIX}${namespace}.`
      const toRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(prefix)) toRemove.push(k)
      }
      for (const k of toRemove) localStorage.removeItem(k)
    } catch {
      void 0
    }
    return JSON.stringify({ ok: true, mode: 'clear', namespace }, null, 2)
  }

  if (!key) throw new Error(`Variable key is required for mode "${mode}"`)

  const fullKey = storageKey(namespace, key)

  if (mode === 'get') {
    const entry = safeGetItem(fullKey)
    if (entry === null) return ''
    if (typeof entry.value === 'string') return entry.value
    return JSON.stringify(entry.value, null, 2)
  }

  if (mode === 'set') {
    const rawValue = config.value?.trim() || input.trim()
    const parsedValue = tryParseJson(rawValue)
    const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null
    safeSetItem(fullKey, { value: parsedValue, expiresAt })
    return JSON.stringify(
      { ok: true, mode: 'set', namespace, key, expiresAt },
      null,
      2
    )
  }

  if (mode === 'append') {
    const entry = safeGetItem(fullKey)
    const existing = entry && Array.isArray(entry.value) ? entry.value : []
    const rawValue = config.value?.trim() || input.trim()
    const parsedValue = tryParseJson(rawValue)
    const next = [...existing, parsedValue]
    const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null
    safeSetItem(fullKey, { value: next, expiresAt })
    return JSON.stringify(
      { ok: true, mode: 'append', namespace, key, count: next.length },
      null,
      2
    )
  }

  throw new Error(`Unknown mode: ${mode}`)
}
