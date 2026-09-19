// PDF Tool — create or merge PDFs in-browser via pdf-lib (CDN-loaded).

const PDF_LIB_URL = 'https://esm.sh/pdf-lib@1.17.1'

let PdfRef: any | null = null
async function loadPdfLib(): Promise<any> {
  if (PdfRef) return PdfRef
  PdfRef = await import(/* @vite-ignore */ PDF_LIB_URL)
  return PdfRef
}

export async function runPdfTool(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const { PDFDocument } = await loadPdfLib()
  const mode = config.mode || 'create'

  if (mode === 'create') {
    const doc = await PDFDocument.create()
    const page = doc.addPage([600, 400])
    page.drawText(config.text || input || 'Hello from ZeroAgent!', { x: 50, y: 350, size: 16 })
    const bytes = await doc.save()
    const blob = new Blob([bytes as ArrayBuffer], { type: 'application/pdf' })
    const outputUrl = URL.createObjectURL(blob)
    return JSON.stringify({ ok: true, url: outputUrl, size: blob.size })
  }

  if (mode === 'merge') {
    const urls = (config.urls || input || '').split(',').map((u) => u.trim()).filter(Boolean)
    if (urls.length === 0) throw new Error('No PDF URLs provided')
    const merged = await PDFDocument.create()
    for (const url of urls) {
      const res = await fetch(url)
      const buf = await res.arrayBuffer()
      const doc = await PDFDocument.load(buf)
      const pages = await merged.copyPages(doc, doc.getPageIndices())
      pages.forEach((p: any) => merged.addPage(p))
    }
    const bytes = await merged.save()
    const blob = new Blob([bytes as ArrayBuffer], { type: 'application/pdf' })
    const outputUrl = URL.createObjectURL(blob)
    return JSON.stringify({ ok: true, url: outputUrl, size: blob.size })
  }

  throw new Error(`Unknown mode: ${mode}`)
}
