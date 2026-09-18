// Email Send — send email via Resend or Postmark.
//
// Config:
//   provider — resend (default) | postmark
//   apiKey   — provider API key (required)
//   from     — sender email (required)
//   to       — recipient email (required, comma-separated OK)
//   subject  — subject line (required)
//   body     — email body (falls back to input)
//   html     — "true" to send as HTML

export async function runEmailSend(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const provider = (config.provider ?? 'resend').toLowerCase()
  const apiKey = (config.apiKey ?? '').trim()
  const from = (config.from ?? '').trim()
  const to = (config.to ?? '').trim()
  const subject = (config.subject ?? '').trim()
  const body = config.body?.trim() || input
  const isHtml = config.html === 'true'

  if (!apiKey) throw new Error('apiKey is required')
  if (!from) throw new Error('"from" is required')
  if (!to) throw new Error('"to" is required')
  if (!subject) throw new Error('"subject" is required')
  if (!body) throw new Error('No email body provided')

  const toList = to.split(',').map((s) => s.trim()).filter(Boolean)

  let url: string
  let payload: Record<string, unknown>
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  
  if (provider === 'postmark') {
    url = 'https://api.postmarkapp.com/email'
    headers['X-Postmark-Server-Token'] = apiKey
    headers['Accept'] = 'application/json'
    payload = {
      From: from,
      To: toList.join(','),
      Subject: subject,
      TextBody: isHtml ? undefined : body,
      HtmlBody: isHtml ? body : undefined,
    }
  } else {
    url = 'https://api.resend.com/emails'
    headers['Authorization'] = `Bearer ${apiKey}`
    payload = {
      from,
      to: toList,
      subject,
      text: isHtml ? undefined : body,
      html: isHtml ? body : undefined,
    }
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Email request failed: ${msg}`, { cause: err })
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
      provider,
      response: text.slice(0, 1000),
    },
    null,
    2
  )
}
