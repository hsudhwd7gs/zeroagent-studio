// OCR — extract text from an image URL via tesseract.js.
// tesseract.js is loaded dynamically from CDN to keep the bundle small.

const TESSERACT_URL = 'https://esm.sh/tesseract.js@5.1.1'

interface TesseractResultData {
  text: string
  confidence: number
  words?: unknown[]
}

interface TesseractModule {
  recognize: (
    url: string,
    lang: string,
    options?: { logger?: (m: { status: string; progress: number }) => void }
  ) => Promise<{ data: TesseractResultData }>
}

let TesseractRef: TesseractModule | null = null
async function loadTesseract(): Promise<TesseractModule> {
  if (TesseractRef) return TesseractRef
  const mod = (await import(/* @vite-ignore */ TESSERACT_URL)) as unknown as TesseractModule
  TesseractRef = mod
  return TesseractRef
}

export async function runOcr(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('No image URL')

  const lang = config.lang || 'eng'
  const Tesseract = await loadTesseract()
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
