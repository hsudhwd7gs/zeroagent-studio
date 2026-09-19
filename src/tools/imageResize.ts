export async function runImageResize(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('No image URL')

  const width = parseInt(config.width ?? '800')
  const height = parseInt(config.height ?? '600')

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = url
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/png')
  )
  const outputUrl = URL.createObjectURL(blob)

  return JSON.stringify({ ok: true, url: outputUrl, width, height, size: blob.size })
}
