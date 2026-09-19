// Throttle node — pass through at most one message per N ms.
// Drops intermediate messages (configurable: drop or queue).

export interface ThrottleConfig {
  ms?: string
  mode?: 'drop' | 'queue'
}

let lastEmitAt = 0
const queue: Array<{ value: string; resolve: (v: string) => void }> = []
let queueTimer: ReturnType<typeof setTimeout> | null = null

export async function runThrottle(input: string, config: ThrottleConfig = {}): Promise<string> {
  const ms = Math.max(0, Math.min(60_000, parseInt(config.ms || '1000', 10) || 1000))
  const mode = config.mode || 'drop'
  const now = Date.now()

  if (now - lastEmitAt >= ms) {
    lastEmitAt = now
    return input
  }

  if (mode === 'drop') {
    return '' // dropped
  }

  // Queue mode — wait until next slot
  return new Promise<string>((resolve) => {
    queue.push({ value: input, resolve })
    if (!queueTimer) {
      const drain = () => {
        const elapsed = Date.now() - lastEmitAt
        const wait = Math.max(0, ms - elapsed)
        queueTimer = setTimeout(() => {
          queueTimer = null
          if (queue.length === 0) return
          lastEmitAt = Date.now()
          const next = queue.shift()!
          next.resolve(next.value)
          if (queue.length > 0) drain()
        }, wait)
      }
      drain()
    }
  })
}
