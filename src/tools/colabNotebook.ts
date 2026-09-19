// Google Colab Notebook node — start/stop/status/output via Colab's REST endpoints.
// The Colab API is unofficial; this node triggers the worker to proxy Colab's
// internal API. Authentication can be stored in the worker KV as COLAB_TOKEN.

export async function runColabNotebook(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const action = config.action ?? 'status'
  const notebookId = config.notebookId?.trim() || input.trim()
  if (!notebookId && action !== 'status') {
    throw new Error('notebookId required')
  }

  // The worker exposes a generic /api/proxy that can reach any URL with auto-secret
  // injection — we use it to call Colab's internal API.
  // Note: Colab's API requires a cookie/OAuth token, stored as COLAB_TOKEN in KV.

  const body: Record<string, unknown> = {
    url: `https://colab.research.google.com/api/notebooks/${encodeURIComponent(notebookId)}/${action}`,
    method: action === 'start' ? 'POST' : 'GET',
  }
  if (config.vars && action === 'start') {
    try {
      body.body = JSON.parse(config.vars)
    } catch {
      body.body = config.vars
    }
  }
  if (config.token) {
    body.headers = { Authorization: `Bearer ${config.token}` }
  }

  const res = await fetch(`${workerUrl}/api/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Colab ${action} failed: ${res.status} ${detail.slice(0, 200)}`)
  }
  const text = await res.text()
  // Try to parse as JSON; fall back to text
  try {
    return JSON.stringify(await Promise.resolve(JSON.parse(text)), null, 2)
  } catch {
    return text
  }
}
