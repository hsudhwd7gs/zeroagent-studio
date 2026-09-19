// Extract metadata + auto-cookies from Fusion Media Provider endpoints.
// Browser-friendly: uses public metadata endpoints.

export async function runFusionMeta(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('No URL')

  // Fusion Media uses oEmbed-style endpoints for public metadata
  const oembedUrl = config.oembedUrl?.trim()
  if (!oembedUrl) throw new Error('oembedUrl required (e.g. https://provider.com/oembed)')

  const endpoint = `${oembedUrl}?url=${encodeURIComponent(url)}&format=json`

  const res = await fetch(endpoint)
  if (!res.ok) throw new Error(`Fusion oEmbed failed: ${res.status}`)

  const data = await res.json()

  return JSON.stringify({
    ok: true,
    source: url,
    metadata: data,
  }, null, 2)
}
