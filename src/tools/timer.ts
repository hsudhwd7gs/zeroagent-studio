// Timer — measure elapsed time between runs.
//
// Persists a start timestamp in localStorage under a key.
//
// Config:
//   action — start (default) | stop | reset
//   key    — timer name (default "default")

const PREFIX = 'brainwire.timer.'

export async function runTimer(
  _input: string,
  config: Record<string, string>
): Promise<string> {
  const action = config.action ?? 'start'
  const key = (config.key ?? 'default').trim() || 'default'
  const fullKey = `${PREFIX}${key}`

  if (action === 'start') {
    const start = Date.now()
    try {
      localStorage.setItem(fullKey, String(start))
    } catch {
      void 0
    }
    return JSON.stringify({ ok: true, action: 'start', key, startedAt: start }, null, 2)
  }

  if (action === 'stop') {
    let start: number | null = null
    try {
      const raw = localStorage.getItem(fullKey)
      if (raw) start = Number(raw)
    } catch {
      void 0
    }

    if (start === null || Number.isNaN(start)) {
      throw new Error(`Timer "${key}" was never started`)
    }

    const now = Date.now()
    const elapsedMs = now - start
    return JSON.stringify(
      { ok: true, action: 'stop', key, startedAt: start, stoppedAt: now, elapsedMs },
      null,
      2
    )
  }

  if (action === 'reset') {
    try {
      localStorage.removeItem(fullKey)
    } catch {
      void 0
    }
    return JSON.stringify({ ok: true, action: 'reset', key }, null, 2)
  }

  throw new Error(`Unknown timer action: ${action}`)
}
