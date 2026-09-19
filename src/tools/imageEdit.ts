// Image Edit — Canvas-based image manipulation. No external deps.
// Operations: crop, rotate, flipH, flipV, grayscale, blur, brightness, contrast, overlay-text, watermark.

import { loadImageWithTimeout } from '../lib/scriptLoader'

export async function runImageEdit(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('image URL required')

  const operation = config.operation ?? 'crop'

  // Load image
  const img = await loadImageWithTimeout({ src: url })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // Compute output dimensions
  if (operation === 'crop') {
    const x = parseInt(config.x ?? '0', 10)
    const y = parseInt(config.y ?? '0', 10)
    const w = parseInt(config.width ?? '400', 10)
    const h = parseInt(config.height ?? '400', 10)
    canvas.width = w
    canvas.height = h
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h)
  } else if (operation === 'rotate') {
    const angle = parseInt(config.angle ?? '90', 10) * Math.PI / 180
    const cos = Math.abs(Math.cos(angle))
    const sin = Math.abs(Math.sin(angle))
    canvas.width = img.width * sin + img.height * cos
    canvas.height = img.width * cos + img.height * sin
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(angle)
    ctx.drawImage(img, -img.width / 2, -img.height / 2)
  } else if (operation === 'flipH' || operation === 'flipV') {
    canvas.width = img.width
    canvas.height = img.height
    ctx.translate(operation === 'flipH' ? canvas.width : 0, operation === 'flipV' ? canvas.height : 0)
    ctx.scale(operation === 'flipH' ? -1 : 1, operation === 'flipV' ? -1 : 1)
    ctx.drawImage(img, 0, 0)
  } else if (operation === 'grayscale' || operation === 'blur' || operation === 'brightness' || operation === 'contrast') {
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    if (operation === 'grayscale') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3
        imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = avg
      }
      ctx.putImageData(imageData, 0, 0)
    } else if (operation === 'blur') {
      // Cheap blur via CSS filter (works on most browsers)
      // For real blur, use ctx.filter = 'blur(Npx)' before drawing
      canvas.style.filter = 'blur(4px)'
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.filter = `blur(${config.level ?? '4'}px)`
      ctx.drawImage(img, 0, 0)
      ctx.filter = 'none'
    } else if (operation === 'brightness') {
      const level = parseInt(config.level ?? '50', 10)
      ctx.filter = `brightness(${level}%)`
      ctx.drawImage(img, 0, 0)
      ctx.filter = 'none'
    } else if (operation === 'contrast') {
      const level = parseInt(config.level ?? '50', 10)
      ctx.filter = `contrast(${level}%)`
      ctx.drawImage(img, 0, 0)
      ctx.filter = 'none'
    }
  } else if (operation === 'overlay-text' || operation === 'watermark') {
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    const text = config.text ?? (operation === 'watermark' ? '@Brainwire' : 'Hello')
    const fontSize = parseInt(config.fontSize ?? '48', 10)
    const color = config.color ?? '#ffffff'
    ctx.font = `${operation === 'watermark' ? 'bold ' : ''}${fontSize}px Inter, Arial, sans-serif`
    ctx.fillStyle = color
    if (operation === 'watermark') {
      ctx.globalAlpha = 0.5
      // Diagonal watermark repeated
      ctx.textAlign = 'center'
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(-Math.PI / 6)
      for (let y = -canvas.height; y < canvas.height; y += fontSize * 3) {
        for (let x = -canvas.width; x < canvas.width; x += text.length * fontSize * 0.6) {
          ctx.fillText(text, x, y)
        }
      }
    } else {
      // Bottom-left overlay
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 8
      ctx.textAlign = 'left'
      ctx.fillText(text, 30, canvas.height - 30 - fontSize)
    }
  } else {
    throw new Error(`Unknown operation: ${operation}`)
  }

  const dataUrl = canvas.toDataURL('image/png')
  return JSON.stringify({
    ok: true,
    operation,
    url,
    outputUrl: dataUrl,
    width: canvas.width,
    height: canvas.height,
  }, null, 2)
}
