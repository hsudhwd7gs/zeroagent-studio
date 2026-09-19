import Tesseract from 'tesseract.js'

export async function runOcr(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('No image URL')

  const lang = config.lang || 'eng'
  const result = await Tesseract.recognize(url, lang, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        console.log(`OCR progress: ${Math.round(m.progress * 100)}%`)
      }
    },
  })

  return JSON.stringify({
    ok: true,
    text: result.data.text,
    confidence: result.data.confidence,
    words: result.data.words?.length ?? 0,
  })
}
