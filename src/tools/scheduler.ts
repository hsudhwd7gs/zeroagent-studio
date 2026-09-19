// Scheduler node — REAL cron scheduling via the worker.
//
// The worker runs a cron trigger every 5 minutes. On each tick it scans the
// KV jobs created here, evaluates each job's 5-field cron expression, and
// POSTs the job's webhook URL when the schedule is due.
//
// What can be scheduled honestly: a WEBHOOK call. Browser workflows cannot
// run headless (tools execute in your browser), so the webhook is the real
// delivery mechanism — point it at whatever should react (another service,
// a Zapier/Make hook, your own server, or a Brainwire Webhook Receiver node).

interface JobResponse {
  job_id?: string
}

// Basic client-side validation so obvious typos fail fast with a clear error.
function isValidCron(expr: string): boolean {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) return false
  return fields.every((f) => /^[\d*,\-/]+$/.test(f))
}

export async function runScheduler(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const cron = config.cron?.trim()
  if (!cron) throw new Error('cron expression required (5 fields: minute hour day month weekday)')
  if (!isValidCron(cron)) {
    throw new Error(`invalid cron expression: "${cron}" — use 5 fields like "*/5 * * * *" or "0 9 * * 1-5"`)
  }
  const webhookUrl = config.webhookUrl?.trim() || input.trim()
  if (!webhookUrl || !/^https?:\/\//.test(webhookUrl)) {
    throw new Error('webhook URL required — the scheduler delivers by calling your webhook (browser workflows cannot run headless). Wire a URL into this node or set webhookUrl.')
  }
  const workflowId = config.workflowId?.trim() || ''

  const jobBody: Record<string, unknown> = {
    status: 'scheduled',
    data: {
      cron,
      webhookUrl,
      ...(workflowId ? { workflowId } : {}),
      createdAt: Date.now(),
      fireCount: 0,
    },
    ttl: 7 * 24 * 60 * 60, // 7 days — re-running the node refreshes the TTL
  }
  const res = await fetch(`${workerUrl}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobBody),
  })
  if (!res.ok) throw new Error(`Failed to create job: ${res.status} ${await res.text()}`)
  const jobData = await res.json() as JobResponse

  return JSON.stringify({
    ok: true,
    job_id: jobData.job_id,
    cron,
    webhookUrl,
    workflowId: workflowId || null,
    note: 'Live schedule registered. The worker checks every 5 minutes and POSTs {jobId, cron, workflowId, firedAt} to your webhook when the cron is due. Schedules expire after 7 days unless this node runs again (it refreshes the TTL). Tip: wire a Webhook Receiver node with the same URL pattern to inspect deliveries.',
  }, null, 2)
}
