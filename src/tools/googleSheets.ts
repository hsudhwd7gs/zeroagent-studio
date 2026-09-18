// Google Sheets — append a row to a Google Sheet via Apps Script webhook.
//
// Setup:
//   1. Create a Google Apps Script in your sheet
//   2. Deploy as web app (Anyone can POST)
//   3. Paste the deployment URL in config.url
//
// Config:
//   url     — Apps Script web-app URL (required)
//   sheet   — sheet name (default "Sheet1")
//   values  — JSON array of cell values (falls back to input parsed as JSON array)
//   token   — optional shared secret

export async function runGoogleSheets(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = (config.url ?? '').trim()
  if (!url) throw new Error('Google Sheets webhook URL is required')

  const sheet = (config.sheet ?? 'Sheet1').trim() || 'Sheet1'

  const rawValues = config.values?.trim() || input.trim()
  if (!rawValues) throw new Error('No values provided')

  let values: unknown
  try {
    values = JSON.parse(rawValues)
  } catch {
    values = rawValues
  }

  const payload = {
    sheet,
    values: Array.isArray(values) ? values : [values],
    token: config.token ?? '',
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Google Sheets request failed: ${msg}`, { cause: err })
  }

  let text = ''
  try {
    text = await response.text()
  } catch {
    void 0
  }

  return JSON.stringify(
    {
      ok: response.ok,
      status: response.status,
      response: text.slice(0, 1000),
    },
    null,
    2
  )
}
