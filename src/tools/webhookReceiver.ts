// Webhook Receiver — generates a unique URL and stores the latest payload.
// Uses the Brainwire worker's /api/webhook/{id} endpoint.

export interface WebhookConfig {
  path?: string // custom path; if omitted, a UUID is generated
}

export interface WebhookResult {
  url: string
  id: string
  lastPayload?: unknown
  receivedAt?: string
}

export async function runWebhookReceiver(
  _input: string,
  config: WebhookConfig
): Promise<string> {
  const id = config.path?.trim() || crypto.randomUUID().slice(0, 8)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const url = `${origin}/api/webhook/${id}`

  // Try to fetch the latest payload (if any)
  let lastPayload: unknown = null
  let receivedAt: string | undefined
  try {
    const res = await fetch(`/api/webhook/${id}`)
    if (res.ok) {
      const data = await res.json()
      lastPayload = data.body ?? data.payload ?? null
      receivedAt = data.receivedAt
    }
  } catch {
    // Worker not reachable — that's fine, just return the URL
  }

  const result: WebhookResult = {
    url,
    id,
    lastPayload,
    receivedAt,
  }
  return JSON.stringify(result, null, 2)
}
