import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null

async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg
  ffmpeg = new FFmpeg()
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  return ffmpeg
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
  await ff.writeFile('input.mp4', await fetchFile(url))

  const args = config.args?.trim().split(' ') || ['-i', 'input.mp4', outputName]
  await ff.exec(args)

  const data = await ff.readFile(outputName)
  const blob = new Blob([data], { type: `video/${outputFormat}` })
  const outputUrl = URL.createObjectURL(blob)

  return JSON.stringify({ ok: true, url: outputUrl, size: blob.size })
}
