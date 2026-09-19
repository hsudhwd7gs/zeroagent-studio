// Thumbnail Generation — creates YouTube-style thumbnails via Canvas API.
// No external library needed.

import { loadImageWithTimeout } from '../lib/scriptLoader'

export async function runThumbnailGen(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const title = config.title?.trim() || input.trim()
  const subtitle = config.subtitle ?? ''
  const bgImage = config.bgImage ?? ''
  const titleColor = config.titleColor ?? '#ffffff'
  const bgColor = config.bgColor ?? '#1a1a2e'
  const accentColor = config.accentColor ?? '#e94560'
  const width = parseInt(config.width ?? '1280')
  const height = parseInt(config.height ?? '720')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Background — best effort: if the background image fails to load (bad
  // URL, offline, CORS), fall back to the gradient instead of crashing.
  let bgLoaded = false
  if (bgImage) {
    try {
      const img = await loadImageWithTimeout({ src: bgImage })
      ctx.drawImage(img, 0, 0, width, height)
      bgLoaded = true
    } catch {
      bgLoaded = false
    }
  }
  if (!bgLoaded) {
    const grad = ctx.createLinearGradient(0, 0, width, height)
    grad.addColorStop(0, bgColor)
    grad.addColorStop(1, accentColor)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)
  }
  if (bgLoaded) {
    // Dark overlay for readability
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, width, height)
  }

  // Accent bar
  ctx.fillStyle = accentColor
  ctx.fillRect(0, height - 12, width, 12)

  // Title text
  ctx.fillStyle = titleColor
  ctx.font = `bold ${Math.round(width / 12)}px Inter, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const maxWidth = width - 100
  const lines = wrapText(ctx, title.toUpperCase(), maxWidth)
  const lineHeight = width / 10
  const startY = height / 2 - (lines.length - 1) * lineHeight / 2 - (subtitle ? 40 : 0)

  lines.forEach((line, i) => {
    // Text shadow for readability
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetX = 4
    ctx.shadowOffsetY = 4
    ctx.fillText(line, width / 2, startY + i * lineHeight)
  })

  // Subtitle
  if (subtitle) {
    ctx.shadowBlur = 10
    ctx.font = `500 ${Math.round(width / 24)}px Inter, Arial, sans-serif`
    ctx.fillText(subtitle, width / 2, height - 100)
  }

  const dataUrl = canvas.toDataURL('image/png')
  return JSON.stringify({ ok: true, url: dataUrl, width, height })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}
