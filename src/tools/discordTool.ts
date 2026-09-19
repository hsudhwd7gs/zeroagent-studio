// Send messages to Discord via webhook (no bot needed).

export async function runDiscord(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const webhookUrl = config.webhookUrl?.trim()
  if (!webhookUrl) throw new Error('webhookUrl required')

  const content = config.content?.trim() || input.trim()
  if (!content) throw new Error('No content to send')

  const payload: Record<string, unknown> = { content }

  // Optional: embed
  if (config.embedTitle?.trim()) {
    payload.embeds = [{
      title: config.embedTitle,
      description: config.embedDescription ?? '',
      color: config.embedColor ? parseInt(config.embedColor, 16) : 0x5865f2,
      image: config.embedImage ? { url: config.embedImage } : undefined,
      thumbnail: config.embedThumbnail ? { url: config.embedThumbnail } : undefined,
      timestamp: new Date().toISOString(),
    }]
  }

  // Optional: username/avatar override
  if (config.username) payload.username = config.username
  if (config.avatarUrl) payload.avatar_url = config.avatarUrl

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Discord webhook failed: ${res.status} — ${errText.slice(0, 200)}`)
  }

  return JSON.stringify({ ok: true, status: res.status })
}
