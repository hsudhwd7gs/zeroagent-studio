// Carousel Generator — produces a multi-slide carousel as data URLs (PNG) via Canvas.
// Each slide is rendered with title + body text on a styled background.

interface Slide {
  title: string
  body: string
}

export async function runCarouselGen(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const topic = config.topic?.trim() || input.trim()
  if (!topic) throw new Error('topic required')

  const slideCount = parseInt(config.slides ?? '5', 10)
  const style = config.style ?? 'gradient'
  const width = parseInt(config.width ?? '1080', 10)
  const height = parseInt(config.height ?? '1080', 10)

  // Generate slide texts deterministically from the topic
  const slides: Slide[] = Array.from({ length: slideCount }, (_, i) => ({
    title: i === 0 ? topic : `${topic} — Part ${i + 1}`,
    body: i === 0
      ? `Swipe through to learn everything about ${topic}.`
      : `Key point ${i} about ${topic} — explain it concisely here.`,
  }))

  // Render each slide to a PNG data URL
  const urls = slides.map((slide) => renderSlide(slide, style, width, height))

  return JSON.stringify({
    ok: true,
    topic,
    slideCount: slides.length,
    slides: slides.map((s, i) => ({ ...s, url: urls[i] })),
  }, null, 2)
}

function renderSlide(slide: Slide, style: string, width: number, height: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Background
  if (style === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, width, height)
    grad.addColorStop(0, '#8b5cf6')
    grad.addColorStop(1, '#06b6d4')
    ctx.fillStyle = grad
  } else if (style === 'bold') {
    ctx.fillStyle = '#111111'
  } else if (style === 'corporate') {
    ctx.fillStyle = '#f8fafc'
  } else {
    ctx.fillStyle = '#0a0a0b'
  }
  ctx.fillRect(0, 0, width, height)

  // Style decorations
  if (style === 'bold') {
    ctx.fillStyle = '#f59e0b'
    ctx.fillRect(0, height - 60, width, 60)
  }

  // Title
  const titleColor = style === 'corporate' ? '#0f172a' : '#ffffff'
  ctx.fillStyle = titleColor
  ctx.font = `bold ${Math.round(width / 14)}px Inter, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  wrapAndDraw(ctx, slide.title.toUpperCase(), width / 2, height / 2 - 80, width - 120, width / 12)

  // Body
  ctx.font = `400 ${Math.round(width / 28)}px Inter, Arial, sans-serif`
  ctx.fillStyle = style === 'corporate' ? '#475569' : '#cbd5e1'
  wrapAndDraw(ctx, slide.body, width / 2, height / 2 + 200, width - 200, width / 26)

  return canvas.toDataURL('image/png')
}

function wrapAndDraw(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  startCy: number,
  maxWidth: number,
  lineHeight: number,
): void {
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
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, startCy + i * lineHeight)
  })
}
