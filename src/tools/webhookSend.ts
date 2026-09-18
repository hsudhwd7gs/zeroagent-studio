// Webhook Send — POST the input to a URL.
//
// Config:
//   url     — target URL (falls back to input if empty)
//   method  — POST (default) | PUT | PATCH
//   headers — JSON object string
//   body    — if empty, uses input
//   contentType — "json" (default) | "text"

export async function runWebhookSend(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = (config.url ?? '').trim() || input.trim()
  if (!url) throw new Error('No URL provided')
  if (!/^https?:\/\//i.test(url)) throw new Error('URL must start with http:// or https://')

  const method = (config.method ?? 'POST').toUpperCase()
  if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') {
    throw new Error('Only POST, PUT, PATCH are supported')
  }

  const headers: Record<string, string> = {}
  if (config.headers?.trim()) {
    let parsed: unknown
    try {
      parsed = JSON.parse(config.headers)
    } catch (err) {
      throw new Error('Headers must be valid JSON', { cause: err })
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'string') headers[k] = v
      }
    }
  }

  const contentType = config.contentType ?? 'json'
  if (!Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = contentType === 'text' ? 'text/plain' : 'application/json'
  }

  const body = (config.body?.trim() || input).trim()

  let response: Response
  try {
    response = await fetch(url, { method, headers, body })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Webhook failed: ${msg}`, { cause: err })
  }

  let text: string
  try {
    text = await response.text()
  } catch (err) {
    throw new Error('Failed to read response body', { cause: err })
  }

  return JSON.stringify(
    {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: text.slice(0, 2000),
    },
    null,
    2
  )
}
