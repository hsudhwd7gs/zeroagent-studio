// URL Screenshot node — uses a public screenshot API (free, no key).
// Falls back to a generic thumbnail service.

export async function runUrlScreenshot(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('url required')
  const width = config.width ?? '1280'
  const height = config.height ?? '720'
  const format = config.format ?? 'png'

  // Use the free, no-key image-screenshot API
  // Microlink.io free tier: 50 requests/day per IP
  const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot&meta=false&embed=screenshot.url&format=${format}&viewport.width=${width}&viewport.height=${height}`
  const res = await fetch(apiUrl)
  if (!res.ok) throw new Error(`Microlink failed: ${res.status}`)

  // Response is the screenshot binary directly when `embed=screenshot.url`
  const blob = await res.blob()
  const dataUrl = blob.type.startsWith('image/') ? await blobToDataURL(blob) : ''
  return JSON.stringify({
    ok: true,
    url,
    screenshot: dataUrl,
    contentType: blob.type,
    size: blob.size,
  }, null, 2)
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}
