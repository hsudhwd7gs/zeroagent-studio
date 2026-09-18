// Google Analytics — query GA4 via the Data API.
//
// Config:
//   accessToken — OAuth access token (required)
//   propertyId  — GA4 property ID, e.g. "properties/123456789" (required)
//   days        — days back (default 7)
//   metrics     — comma-separated (default "sessions,users")
//   dimensions  — comma-separated (default "date")

export async function runGoogleAnalytics(
  _input: string,
  config: Record<string, string>
): Promise<string> {
  const accessToken = (config.accessToken ?? '').trim()
  const propertyId = (config.propertyId ?? '').trim()
  if (!accessToken) throw new Error('accessToken is required')
  if (!propertyId) throw new Error('propertyId is required')

  const days = Math.max(1, Math.floor(Number(config.days ?? '7')))
  const metrics = (config.metrics ?? 'sessions,users').split(',').map((s) => s.trim()).filter(Boolean)
  const dimensions = (config.dimensions ?? 'date').split(',').map((s) => s.trim()).filter(Boolean)

  const url = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`

  const payload = {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    metrics: metrics.map((name) => ({ name })),
    dimensions: dimensions.map((name) => ({ name })),
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`GA request failed: ${msg}`, { cause: err })
  }

  let text = ''
  try {
    text = await response.text()
  } catch {
    void 0
  }

  if (!response.ok) {
    throw new Error(`GA API ${response.status}: ${text.slice(0, 500)}`)
  }

  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}
