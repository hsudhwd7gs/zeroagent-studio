// Scheduler node — registers a cron trigger via the worker.
// The worker stores cron specs in KV; a separate cron handler dispatches them.

export async function runScheduler(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const cron = config.cron?.trim()
  if (!cron) throw new Error('cron expression required')
  const workflowId = config.workflowId?.trim() || input.trim()
  const webhookUrl = config.webhookUrl?.trim()

  // Use the worker's /api/jobs endpoint to create a job entry describing the cron.
  // The actual Cloudflare Cron Trigger needs to be configured via wrangler.toml
  // or the dashboard. This node persists the intent and returns a job ID.
  const jobBody: Record<string, unknown> = {
    status: 'scheduled',
    data: { cron, workflowId, webhookUrl, createdAt: Date.now() },
    ttl: 86400, // 24 hours — refresh by re-running this node
  }
  const res = await fetch(`${workerUrl}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobBody),
  })
  if (!res.ok) throw new Error(`Failed to create job: ${res.status} ${await res.text()}`)
  const jobData = await res.json() as any

  // If a webhook URL is set, fire it now to register the cron with an external service
  let webhookResponse: unknown = null
  if (webhookUrl) {
    try {
      const whRes = await fetch(`${workerUrl}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          method: 'POST',
          body: { cron, workflowId, registeredAt: Date.now() },
        }),
      })
      webhookResponse = whRes.ok ? await whRes.text() : null
    } catch (err) {
      webhookResponse = { error: err instanceof Error ? err.message : String(err) }
    }
  }

  return JSON.stringify({
    ok: true,
    job_id: jobData.job_id,
    cron,
    workflowId,
    webhookResponse,
    note: 'Persisted in worker KV with 24h TTL. To enable real Cloudflare Cron Triggers, add to wrangler.toml [triggers] crons.',
  }, null, 2)
}
