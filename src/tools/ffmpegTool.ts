// FFmpeg — transcode/clip media in-browser via ffmpeg.wasm (v0.12 API).
// Both the wrapper and core are loaded dynamically from CDN.

const FFMPEG_URL = 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10'
const FFMPEG_UTIL_URL = 'https://esm.sh/@ffmpeg/util@0.12.1'

interface FFmpegLike {
  writeFile: (name: string, data: Uint8Array) => Promise<boolean>
  exec: (args: string[]) => Promise<number>
  readFile: (name: string) => Promise<Uint8Array | string>
  deleteFile: (name: string) => Promise<boolean>
  on: (event: string, cb: (e: unknown) => void) => void
  load: (opts: { coreURL: string; wasmURL: string }) => Promise<boolean>
}

let ffmpegInstance: FFmpegLike | null = null
let FFmpegCtor: new () => FFmpegLike
let toBlobURL: (url: string, mime: string) => Promise<string>
let fetchFile: (url: string) => Promise<Uint8Array>

async function loadFFmpeg(): Promise<FFmpegLike> {
  if (ffmpegInstance) return ffmpegInstance
  const ffmpegMod = await import(/* @vite-ignore */ FFMPEG_URL)
  const utilMod = await import(/* @vite-ignore */ FFMPEG_UTIL_URL)
  FFmpegCtor = ffmpegMod.FFmpeg
  toBlobURL = utilMod.toBlobURL
  fetchFile = utilMod.fetchFile
  const ff = new FFmpegCtor()
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ff.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  ffmpegInstance = ff
  return ff
}

export async function runFFmpeg(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const ff = await loadFFmpeg()
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('No input URL')

  const outputFormat = config.format || 'mp4'
  const outputName = `output.${outputFormat}`
  await ff.writeFile('input.bin', await fetchFile(url))

  const args = config.args?.trim()
    ? config.args.trim().split(/\s+/)
    : ['-i', 'input.bin', outputName]
  await ff.exec(args)

  const data = await ff.readFile(outputName)
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
  // Cast to ArrayBuffer to satisfy BlobPart typing across TS lib versions
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: `video/${outputFormat}` })
  const outputUrl = URL.createObjectURL(blob)

  return JSON.stringify({ ok: true, url: outputUrl, size: blob.size })
}
