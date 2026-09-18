// Fetch JSON — full HTTP client with method, headers, and body support.
//
// Backward compatible: if no config.method/headers/body are provided,
// behaves exactly like the original GET-only tool.
//
// Supported methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
//
// Config fields (all optional):
//   url      — target URL (falls back to input if empty)
//   method   — HTTP method (default: GET)
//   headers  — JSON object as string, e.g. {"Authorization": "Bearer xxx"}
//   body     — request body (only sent for POST, PUT, PATCH, DELETE)
//
// Notes:
//   • Custom headers and non-GET methods trigger a CORS preflight.
//   • Non-JSON responses are wrapped in { ok, status, rawText }.

const ALLOWED_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const

type AllowedMethod = (typeof ALLOWED_METHODS)[number]

function isAllowedMethod(value: string): value is AllowedMethod {
  return (ALLOWED_METHODS as readonly string[]).includes(value)
}

function truncate(text: string, max = 500): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

export async function fetchJsonTool(
  input: string,
  config: Record<string, string>
): Promise<string> {
  // ── 1. Resolve URL ──────────────────────────────────────────
  const url = (config.url?.trim() || input.trim())
  if (!url) {
    throw new Error('No URL provided — wire upstream or set URL in inspector')
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (err) {
    throw new Error(`Invalid URL: ${url}`, { cause: err })
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are supported')
  }

  // ── 2. Resolve method ───────────────────────────────────────
  const rawMethod = (config.method?.trim() || 'GET').toUpperCase()
  if (!isAllowedMethod(rawMethod)) {
    throw new Error(
      `Unsupported HTTP method: ${rawMethod}. Allowed: ${ALLOWED_METHODS.join(', ')}`
    )
  }
  const method: AllowedMethod = rawMethod

  // ── 3. Parse custom headers ─────────────────────────────────
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (config.headers?.trim()) {
    let parsedHeaders: unknown
    try {
      parsedHeaders = JSON.parse(config.headers)
    } catch (err) {
      throw new Error(
        'Headers must be valid JSON, e.g. {"Authorization": "Bearer xxx"}',
        { cause: err }
      )
    }
    if (
      parsedHeaders === null ||
      typeof parsedHeaders !== 'object' ||
      Array.isArray(parsedHeaders)
    ) {
      throw new Error('Headers must be a JSON object (key-value pairs)')
    }
    for (const [key, value] of Object.entries(
      parsedHeaders as Record<string, unknown>
    )) {
      if (typeof value !== 'string') {
        throw new Error(`Header "${key}" must be a string`)
      }
      headers[key] = value
    }
  }

  // ── 4. Resolve body (only for methods that allow it) ────────
  const methodAllowsBody =
    method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'

  let body: string | undefined
  if (methodAllowsBody && config.body?.trim()) {
    body = config.body

    const hasContentType = Object.keys(headers).some(
      (k) => k.toLowerCase() === 'content-type'
    )
    if (!hasContentType) {
      try {
        JSON.parse(body)
        headers['Content-Type'] = 'application/json'
      } catch {
        void 0
      }
    }
  }

  // ── 5. Perform the request ──────────────────────────────────
  let response: Response
  try {
    response = await fetch(url, { method, headers, body })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Network error: ${msg}. This usually means a CORS block, an offline browser, or an invalid URL.`,
      { cause: err }
    )
  }

  // ── 6. Handle non-OK responses ──────────────────────────────
  if (!response.ok) {
    let errorBody = ''
    try {
      errorBody = await response.text()
    } catch {
      void 0
    }
    const suffix = errorBody ? ` — ${truncate(errorBody)}` : ''
    throw new Error(
      `Fetch failed: ${response.status} ${response.statusText}${suffix}`
    )
  }

  // ── 7. Read response text ───────────────────────────────────
  let text: string
  try {
    text = await response.text()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to read response body: ${msg}`, { cause: err })
  }

  // ── 8. Handle empty responses (204, HEAD, etc.) ─────────────
  if (!text.trim()) {
    return JSON.stringify(
      {
        ok: true,
        status: response.status,
        body: null,
      },
      null,
      2
    )
  }

  // ── 9. Try to parse as JSON ─────────────────────────────────
  try {
    const json = JSON.parse(text)
    return JSON.stringify(json, null, 2)
  } catch {
    return JSON.stringify(
      {
        ok: true,
        status: response.status,
        rawText: text,
      },
      null,
      2
    )
  }
}
