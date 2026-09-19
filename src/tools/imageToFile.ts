// Image to File — fetches an image URL (or accepts a data: URL) and saves it
// as a downloadable image file. Useful as the last step of AI Image Gen / Image Edit
// / Carousel Gen / Stock Footage / URL Screenshot workflows.

export async function runImageToFile(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('image URL required (wire upstream URL into this node, or set url in config)')

  let blob: Blob
  let originalExt: string

  if (url.startsWith('data:')) {
    // Decode data URL
    const match = url.match(/^data:([^;,]+)?(;base64)?,(.*)$/s)
    if (!match) throw new Error('invalid data URL')
    const [, mime, isBase64, data] = match
    const finalMime = mime ?? 'image/png'
    originalExt = (finalMime.split('/')[1] ?? 'png').split('+')[0]
    if (isBase64) {
      const bytes = base64ToBytes(data)
      blob = new Blob([bytes as unknown as ArrayBuffer], { type: finalMime })
    } else {
      blob = new Blob([decodeURIComponent(data)], { type: `${finalMime}` })
    }
  } else {
    // Fetch via worker proxy (CORS-safe)
    const workerUrl = window.location.origin
    const res = await fetch(`${workerUrl}/api/proxy?url=${encodeURIComponent(url)}`)
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
    blob = await res.blob()
    originalExt = (blob.type.split('/')[1] ?? 'png').split('+')[0]
  }

  let filename = config.filename?.trim()
  if (!filename) filename = `image-${Date.now()}.${originalExt}`
  else if (!/\.[a-z0-9]+$/i.test(filename)) filename = `${filename}.${originalExt}`

  // Trigger download via anchor
  const downloadUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(downloadUrl)
  }, 1000)

  return JSON.stringify({
    ok: true,
    filename,
    mime: blob.type,
    size: blob.size,
    sourceUrl: url,
    downloadUrl,
  }, null, 2)
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/-/g, '+').replace(/_/g, '/')
  const padded = clean.padEnd(clean.length + (4 - (clean.length % 4)) % 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
