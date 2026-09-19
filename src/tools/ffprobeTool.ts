// FFprobe — read media metadata via ffmpeg.wasm (v0.12 API).
// Reuses the same loader as ffmpegTool.ts so we never load ffmpeg-core twice.

const FFMPEG_URL = 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10'
const FFMPEG_UTIL_URL = 'https://esm.sh/@ffmpeg/util@0.12.1'

interface FFmpegLike {
  writeFile: (name: string, data: Uint8Array) => Promise<boolean>
  exec: (args: string[]) => Promise<number>
  readFile: (name: string) => Promise<Uint8Array | string>
  deleteFile: (name: string) => Promise<boolean>
  on: (event: string, cb: (e: { message?: string }) => void) => void
  load: (opts: { coreURL: string; wasmURL: string }) => Promise<boolean>
}

let ffmpegInstance: FFmpegLike | null = null
let fetchFileFn: ((url: string) => Promise<Uint8Array>) | null = null

async function loadFFmpeg(): Promise<FFmpegLike> {
  if (ffmpegInstance) return ffmpegInstance
  const ffmpegMod = await import(/* @vite-ignore */ FFMPEG_URL)
  const utilMod = await import(/* @vite-ignore */ FFMPEG_UTIL_URL)
  const FFmpegCtor = ffmpegMod.FFmpeg
  const toBlobURL = utilMod.toBlobURL
  const fetchFile = utilMod.fetchFile
  const ff = new FFmpegCtor()
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ff.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  ffmpegInstance = ff
  // expose fetchFile for the run function
  fetchFileFn = fetchFile as (url: string) => Promise<Uint8Array>
  return ff
}

export async function runFFprobe(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const ff = await loadFFmpeg()
  if (!fetchFileFn) throw new Error('FFmpeg helpers not ready — try again')
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('No input URL')

  await ff.writeFile('input.bin', await fetchFileFn(url))

  let metadata = ''
  ff.on('log', (e) => {
    const message: string = e?.message ?? ''
    if (message.includes('Stream') || message.includes('Duration') || message.includes('Input')) {
      metadata += message + '\n'
    }
  })

  // -i prints metadata to stderr (captured by log handler); -f null - discards output
  await ff.exec(['-i', 'input.bin', '-f', 'null', '-'])

  return JSON.stringify({ ok: true, metadata: metadata.trim() })
}
