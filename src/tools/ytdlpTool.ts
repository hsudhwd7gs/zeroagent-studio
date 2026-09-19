// yt-dlp via Cloudflare Worker proxy.
// Requires the Worker endpoint /api/ytdlp

export async function runYtDlp(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const videoUrl = config.url?.trim() || input.trim()
  if (!videoUrl) throw new Error('No video URL')

  const workerUrl = window.location.origin
  const action = config.action ?? 'info'

  const res = await fetch(`${workerUrl}/api/ytdlp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: videoUrl,
      action,
      format: config.format ?? 'best',
      cookies: config.cookies ?? '',
    }),
  })

  if (!res.ok) {
    throw new Error(`yt-dlp proxy failed: ${res.status}`)
  }

  return await res.text()
}
