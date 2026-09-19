// Cache — key-value store with TTL for expensive results.
//
// Persists to localStorage. Any node can read/write the same cache.
// Useful for skipping repeated fetches or expensive computations.
//
// Config:
//   mode      — "get" (read) | "set" (write) | "clear" | "has"
//   key       — cache key (required for get/set/has)
//   value     — value to store (for set; empty = use input)
//   ttlMs     — time-to-live in ms (default 24 hours)
//   fallback  — for "get" mode: return this if key missing (default "")

const STORAGE_PREFIX = 'brainwire.cache.'

interface CacheEntry {
  value: unknown
  expiresAt: number | null
  createdAt: number
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`
}

function safeGet(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(storageKey(key))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (parsed.expiresAt !== null && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(storageKey(key))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function safeSet(key: string, entry: CacheEntry): void {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(entry))
  } catch {
    // localStorage full — silently skip
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

export async function runCache(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const mode = config.mode ?? 'get'
  const key = (config.key ?? '').trim()

  if (mode === 'clear') {
    try {
      const toRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(STORAGE_PREFIX)) toRemove.push(k)
      }
      for (const k of toRemove) localStorage.removeItem(k)
    } catch {
      void 0
    }
    return JSON.stringify({ ok: true, mode: 'clear' }, null, 2)
  }

  if (!key) throw new Error(`Cache key is required for mode "${mode}"`)

  if (mode === 'get') {
    const entry = safeGet(key)
    if (entry === null) return config.fallback ?? ''
    if (typeof entry.value === 'string') return entry.value
    return JSON.stringify(entry.value, null, 2)
  }

  if (mode === 'has') {
    const entry = safeGet(key)
    const exists = entry !== null
    return JSON.stringify(
      {
        ok: true,
        key,
        exists,
        expiresAt: entry?.expiresAt ?? null,
        createdAt: entry?.createdAt ?? null,
      },
      null,
      2
    )
  }

  if (mode === 'set') {
    const ttlMs = Math.max(0, Math.floor(Number(config.ttlMs ?? String(DEFAULT_TTL_MS))))
    const rawValue = config.value?.trim() || input.trim()
    const parsedValue = tryParseJson(rawValue)
    const createdAt = Date.now()
    const expiresAt = ttlMs > 0 ? createdAt + ttlMs : null
    safeSet(key, { value: parsedValue, expiresAt, createdAt })
    return JSON.stringify(
      { ok: true, mode: 'set', key, createdAt, expiresAt },
      null,
      2
    )
  }

  throw new Error(`Unknown cache mode: ${mode}`)
}
