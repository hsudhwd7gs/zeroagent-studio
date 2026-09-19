import { fileSave } from 'browser-fs-access'

export async function runFileDownload(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('No file URL')

  const filename = config.filename?.trim() || 'download.bin'

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)

  const blob = await response.blob()
  await fileSave(blob, { fileName: filename })

  return JSON.stringify({ ok: true, filename, size: blob.size })
}
