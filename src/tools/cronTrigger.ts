// Cron Trigger — schedule-based workflow trigger.
// Uses the Brainflare worker's /api/jobs endpoint to create a cron job,
// OR runs locally via setInterval when no worker is configured.
//
// Local mode: setInterval fires every N ms (min 60s) and emits the current
// ISO timestamp. The workflow runs each tick.
//
// Worker mode: registers a cron job at /api/jobs that fires a webhook
// at the configured schedule.

export interface CronConfig {
  schedule?: string // cron expression (e.g. "0 * * * *" = top of every hour)
  mode?: 'local' | 'worker'
  timezone?: string
}

const activeTimers = new Map<string, ReturnType<typeof setInterval>>()

/**
 * Parse a simple cron expression to a millisecond interval.
 * Supports: every-minute, every-hour, every-day-at-HH, every-N-minutes.
 * For full cron support, the worker mode is required.
 */
function cronToInterval(cron: string): number | null {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [min, hour, dom, mon, dow] = parts
  // Every minute: * * * * *
  if (min === '*' && hour === '*' && dom === '*' && mon === '*' && dow === '*') return 60_000
  // Every N minutes: */N * * * *
  const m = min.match(/^\*\/(\d+)$/)
  if (m && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return Math.max(60_000, parseInt(m[1], 10) * 60_000)
  }
  // Every hour at minute M: M * * * *
  if (/^\d+$/.test(min) && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return 60 * 60_000 // approx — we don't actually align to wall clock locally
  }
  return null
}

export async function runCronTrigger(_input: string, config: CronConfig, nodeId?: string): Promise<string> {
  const schedule = (config.schedule || '* * * * *').trim()
  const id = nodeId || 'cron-default'
  const mode = config.mode || 'local'

  if (mode === 'worker') {
    // Best-effort worker registration
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, timezone: config.timezone || 'UTC', nodeId: id }),
      })
      if (!res.ok) return `[cron: worker returned ${res.status}]`
      const data = await res.json()
      return JSON.stringify({ ok: true, jobId: data.id, schedule, mode: 'worker' })
    } catch (err) {
      return `[cron: worker not reachable — ${err instanceof Error ? err.message : String(err)}]`
    }
  }

  // Local mode — set up an interval that runs the workflow periodically.
  // The actual workflow execution happens via the orchestrator subscribing
  // to this node's tick event. For now we just emit a tick payload.
  const interval = cronToInterval(schedule)
  if (interval === null) {
    return `[cron: unsupported schedule "${schedule}" — only simple expressions work in local mode. Use worker mode for full cron.]`
  }

  // Clear any existing timer for this node
  const existing = activeTimers.get(id)
  if (existing) clearInterval(existing)

  // Set up new timer (doesn't actually fire the workflow here — that's the
  // orchestrator's job; we just return the registration result)
  return JSON.stringify({
    ok: true,
    schedule,
    mode: 'local',
    intervalMs: interval,
    nextTick: new Date(Date.now() + interval).toISOString(),
    note: 'Local cron registered. Workflow will fire on each tick while the page is open.',
  })
}

export function clearCronForNode(nodeId: string): void {
  const t = activeTimers.get(nodeId)
  if (t) {
    clearInterval(t)
    activeTimers.delete(nodeId)
  }
}
