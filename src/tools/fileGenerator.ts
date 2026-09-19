// File Generator — takes any input and saves it as a downloadable file.
//
// Supports 4 content modes:
//   • text      — input is plain text; save as .txt/.md/.csv/.html/.json/.log/...
//   • json      — input is JSON (string or already-parsed); pretty-print + save .json
//   • dataurl   — input is a data: URL (base64 PNG, JPEG, PDF, ...); decode + save binary
//   • url       — input is a URL; fetch the bytes via /api/proxy and save with the right extension
//
// Config:
//   • filename  — required. Auto-adds extension from MIME if missing
//   • mime      — optional, e.g. "application/pdf", "image/png"
//   • format    — optional, file extension hint (txt/json/csv/png/pdf/...) used when mime missing
//
// Uses the File System Access API when available (Chrome, Edge, Brave) so the user
// gets a real "Save As" dialog. Falls back to <a download> on Firefox/Safari.

interface FileGenResult {
  ok: boolean
  filename: string
  mime: string
  size: number
  saved: boolean
  downloadUrl?: string
  mode: string
  error?: string
}

const FORMAT_TO_MIME: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  ts: 'text/typescript',
  json: 'application/json',
  xml: 'application/xml',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  pdf: 'application/pdf',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  webm: 'video/webm',
}

const MIME_TO_EXT: Record<string, string> = Object.entries(FORMAT_TO_MIME).reduce(
  (acc, [ext, mime]) => { acc[mime] = ext; return acc },
  {} as Record<string, string>,
)

export async function runFileGenerator(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const mode = config.mode ?? 'text'
  let filename = config.filename?.trim()
  const mimeHint = config.mime?.trim()
  const formatHint = config.format?.trim().toLowerCase().replace(/^\./, '')

  // Resolve content + final mime
  let blob: Blob
  let finalMime: string
  let finalExt: string

  if (mode === 'text') {
    const content = config.content?.trim() ?? input
    if (!content) throw new Error('no content (wire upstream text into this node, or set content in config)')
    finalMime = mimeHint ?? (formatHint ? FORMAT_TO_MIME[formatHint] ?? 'text/plain' : 'text/plain')
    finalExt = formatHint ?? MIME_TO_EXT[finalMime] ?? 'txt'
    blob = new Blob([content], { type: `${finalMime};charset=utf-8` })
  } else if (mode === 'json') {
    const content = config.content?.trim() ?? input
    if (!content) throw new Error('no JSON content')
    let pretty: string
    try {
      const parsed = JSON.parse(content)
      pretty = JSON.stringify(parsed, null, 2)
    } catch {
      pretty = content // already a string or malformed; save as-is
    }
    finalMime = 'application/json'
    finalExt = 'json'
    blob = new Blob([pretty], { type: 'application/json;charset=utf-8' })
  } else if (mode === 'dataurl') {
    const dataUrl = config.content?.trim() || input.trim()
    if (!dataUrl?.startsWith('data:')) throw new Error('input must be a data: URL (e.g. data:image/png;base64,...)')
    const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s)
    if (!match) throw new Error('invalid data URL format')
    const [, mimeFromUrl, isBase64, data] = match
    finalMime = mimeHint ?? mimeFromUrl ?? 'application/octet-stream'
    finalExt = formatHint ?? MIME_TO_EXT[finalMime] ?? (mimeFromUrl?.split('/')[1] ?? 'bin')
    if (isBase64) {
      const bytes = base64ToBytes(data)
      blob = new Blob([bytes as unknown as ArrayBuffer], { type: finalMime })
    } else {
      blob = new Blob([decodeURIComponent(data)], { type: `${finalMime};charset=utf-8` })
    }
  } else if (mode === 'url') {
    const url = config.content?.trim() || input.trim()
    if (!url) throw new Error('no URL to fetch')
    // Use the worker proxy to bypass CORS for cross-origin URLs
    const workerUrl = window.location.origin
    const res = await fetch(`${workerUrl}/api/proxy?url=${encodeURIComponent(url)}`)
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
    blob = await res.blob()
    finalMime = mimeHint ?? (blob.type || 'application/octet-stream')
    finalExt = formatHint ?? MIME_TO_EXT[finalMime] ?? (url.split('.').pop() ?? 'bin').split('?')[0]
  } else {
    throw new Error(`Unknown mode: ${mode}`)
  }

  // Auto-append extension if missing
  if (!filename) {
    filename = `file-${Date.now()}.${finalExt}`
  } else if (!/\.[a-z0-9]+$/i.test(filename)) {
    filename = `${filename}.${finalExt}`
  }

  const result: FileGenResult = {
    ok: true,
    filename,
    mime: finalMime,
    size: blob.size,
    saved: false,
    mode,
  }

  // Try File System Access API (Chrome / Edge / Brave) — true "Save As" dialog
  // @ts-expect-error showSaveFilePicker is not yet in stable TS DOM lib
  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    try {
      // @ts-expect-error showSaveFilePicker
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: finalExt.toUpperCase(),
          accept: { [finalMime]: [`.${finalExt}`] },
        }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      result.saved = true
      result.downloadUrl = `file-system-access://${filename}`
      return JSON.stringify(result, null, 2)
    } catch (err) {
      // User cancelled, or feature blocked — fall back to anchor download
      if (err instanceof DOMException && err.name === 'AbortError') {
        result.saved = false
        result.error = 'User cancelled the save dialog'
        return JSON.stringify(result, null, 2)
      }
      // Fall through to anchor download
    }
  }

  // Fallback: <a download="..."> click
  const downloadUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  // Clean up after a tick (give the browser time to start the download)
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(downloadUrl)
  }, 1000)
  result.saved = true
  result.downloadUrl = downloadUrl
  return JSON.stringify(result, null, 2)
}

function base64ToBytes(b64: string): Uint8Array {
  // Decode base64 to a Uint8Array (handles URL-safe and missing padding)
  const clean = b64.replace(/-/g, '+').replace(/_/g, '/')
  const padded = clean.padEnd(clean.length + (4 - (clean.length % 4)) % 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
