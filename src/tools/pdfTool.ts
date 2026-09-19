import { PDFDocument } from 'modern-pdf-lib'

export async function runPdfTool(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const mode = config.mode || 'create'

  if (mode === 'create') {
    const doc = await PDFDocument.create()
    const page = doc.addPage([600, 400])
    page.drawText(config.text || 'Hello from ZeroAgent!', { x: 50, y: 350 })
    const bytes = await doc.save()
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const outputUrl = URL.createObjectURL(blob)
    return JSON.stringify({ ok: true, url: outputUrl, size: blob.size })
  }

  if (mode === 'merge') {
    const urls = (config.urls || '').split(',').map((u) => u.trim()).filter(Boolean)
    const merged = await PDFDocument.create()
    for (const url of urls) {
      const res = await fetch(url)
      const buf = await res.arrayBuffer()
      const doc = await PDFDocument.load(buf)
      const pages = await merged.copyPages(doc, doc.getPageIndices())
      pages.forEach((p) => merged.addPage(p))
    }
    const bytes = await merged.save()
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const outputUrl = URL.createObjectURL(blob)
    return JSON.stringify({ ok: true, url: outputUrl, size: blob.size })
  }

  throw new Error(`Unknown mode: ${mode}`)
}
