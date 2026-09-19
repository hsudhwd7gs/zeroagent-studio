// Retry with Backoff — fetch a URL with automatic retries.
//
// This tool does the fetch itself and retries on failure.
//
// Config:
//   url         — target URL (falls back to input if empty)
//   method      — GET (default) | POST | PUT | PATCH | DELETE
//   headers     — JSON object string
//   body        — request body
//   maxAttempts — total attempts (default 3)
//   baseDelayMs — initial delay in ms (default 500)
//   maxDelayMs  — cap on delay in ms (default 10000)

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

/** Thrown for HTTP statuses that should never be retried (e.g. 404, 401). */
class NonRetryableHttpError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function runRetryWithBackoff(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = (config.url ?? '').trim() || input.trim()
  if (!url) throw new Error('No URL provided')

  const method = (config.method ?? 'GET').toUpperCase()
  const headers: Record<string, string> = { Accept: 'application/json' }

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

  const methodAllowsBody =
    method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'

  let body: string | undefined
  if (methodAllowsBody && config.body?.trim()) {
    body = config.body
    if (!Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) {
      try {
        JSON.parse(body)
        headers['Content-Type'] = 'application/json'
      } catch {
        void 0
      }
    }
  }

  const maxAttempts = Math.max(1, Math.floor(Number(config.maxAttempts ?? '3')))
  const baseDelayMs = Math.max(50, Math.floor(Number(config.baseDelayMs ?? '500')))
  const maxDelayMs = Math.max(baseDelayMs, Math.floor(Number(config.maxDelayMs ?? '10000')))

  const attempts: Array<{ attempt: number; status?: number; error?: string; delayMs?: number }> = []

  let lastError: string = 'unknown'
  let lastStatus = 0

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, { method, headers, body })
      lastStatus = response.status

      // Success — return immediately
      if (response.ok) {
        let text = ''
        try {
          text = await response.text()
        } catch (err) {
          throw new Error('Failed to read response body', { cause: err })
        }

        attempts.push({ attempt, status: response.status })

        let parsed: unknown = text
        try {
          parsed = JSON.parse(text)
        } catch {
          void 0
        }

        return JSON.stringify(
          {
            ok: true,
            status: response.status,
            attempt,
            totalAttempts: attempts.length,
            attempts,
            data: parsed,
          },
          null,
          2
        )
      }

      // Non-retryable status → fail immediately
      if (!RETRYABLE_STATUS.has(response.status)) {
        let errorBody = ''
        try {
          errorBody = await response.text()
        } catch {
          void 0
        }
        attempts.push({ attempt, status: response.status, error: `HTTP ${response.status}` })

        throw new NonRetryableHttpError(
          `Non-retryable HTTP ${response.status}: ${errorBody.slice(0, 200)}`
        )
      }

      // Retryable status → calculate backoff and continue
      lastError = `HTTP ${response.status}`

      // Honor Retry-After header if present
      let waitMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
      const retryAfter = response.headers.get('retry-after')
      if (retryAfter) {
        const sec = Number(retryAfter)
        if (!Number.isNaN(sec) && sec > 0) {
          waitMs = Math.min(sec * 1000, 60000)
        }
      }

      attempts.push({ attempt, status: response.status, error: lastError, delayMs: waitMs })
      if (attempt < maxAttempts) await sleep(waitMs)
      continue
    } catch (err) {
      // Non-retryable failures must propagate immediately — the surrounding
      // catch must not swallow them into the retry loop.
      if (err instanceof NonRetryableHttpError) throw err
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt >= maxAttempts) {
        attempts.push({ attempt, error: lastError })
        break
      }
      const waitMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
      attempts.push({ attempt, error: lastError, delayMs: waitMs })
      await sleep(waitMs)
    }
  }

  return JSON.stringify(
    {
      ok: false,
      status: lastStatus,
      attempts,
      error: lastError,
    },
    null,
    2
  )
}
