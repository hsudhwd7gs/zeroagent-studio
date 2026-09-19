// Read File Content — lets the user pick any file and returns its content as text
// (or as a base64 data URL for binary files). Re-uses the File System Access API
// with a graceful fallback to <input type="file"> on unsupported browsers.

const BINARY_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg',
  'mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac',
  'mp4', 'webm', 'mov', 'avi', 'mkv',
  'pdf', 'zip', 'tar', 'gz', 'rar', '7z',
  'woff', 'woff2', 'ttf', 'otf',
  'wasm',
  'bin',
])

export async function runReadFileContent(
  _input: string,
  config: Record<string, string>
): Promise<string> {
  const mode = config.mode ?? 'auto'   // 'auto' | 'text' | 'dataurl'
  const accept = config.accept?.trim() || ''

  // Try File System Access API for a richer picker
  // @ts-expect-error showOpenFilePicker not in stable TS lib
  if (typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function') {
    try {
      // @ts-expect-error showOpenFilePicker
      const [handle] = await window.showOpenFilePicker({
        types: accept ? [{ description: 'Files', accept: { '*/*': accept.split(',').map((e) => e.trim()) } }] : undefined,
        multiple: false,
      })
      const file = await handle.getFile()
      return await extractFileContent(file, mode)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('File picker cancelled')
      }
      // Fall through to input fallback
    }
  }

  // Fallback: hidden <input type="file">
  return new Promise<string>((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept
    input.style.display = 'none'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      try {
        const result = await extractFileContent(file, mode)
        resolve(result)
      } catch (err) {
        reject(err)
      } finally {
        input.remove()
      }
    }
    input.oncancel = () => {
      reject(new Error('File picker cancelled'))
      input.remove()
    }
    document.body.appendChild(input)
    input.click()
  })
}

async function extractFileContent(file: File, mode: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const isBinary = BINARY_EXTS.has(ext) || !file.type.startsWith('text/') && file.type !== 'application/json' && file.type !== 'application/xml' && file.type !== 'application/javascript' && file.type !== 'application/yaml' && file.type !== 'text/csv' && file.type !== 'text/markdown'

  if (mode === 'text' || (mode === 'auto' && !isBinary)) {
    const text = await file.text()
    return JSON.stringify({
      ok: true,
      name: file.name,
      size: file.size,
      type: file.type || 'text/plain',
      mode: 'text',
      content: text,
      contentLength: text.length,
    }, null, 2)
  }

  if (mode === 'dataurl' || (mode === 'auto' && isBinary)) {
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    const b64 = bytesToBase64(bytes)
    const dataUrl = `data:${file.type || 'application/octet-stream'};base64,${b64}`
    return JSON.stringify({
      ok: true,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      mode: 'dataurl',
      dataUrl,
      contentLength: dataUrl.length,
    }, null, 2)
  }

  // Default: return metadata only
  return JSON.stringify({
    ok: true,
    name: file.name,
    size: file.size,
    type: file.type,
    mode: 'metadata',
  }, null, 2)
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}
