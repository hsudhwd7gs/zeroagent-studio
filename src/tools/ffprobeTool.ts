import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'

let ffmpegInstance: any = null

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance
  ffmpegInstance = createFFmpeg({
    log: false,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
  })
  await ffmpegInstance.load()
  return ffmpegInstance
}

export async function runFFprobe(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('No input URL')

  const ff = await getFFmpeg()
  ff.FS('writeFile', 'input.mp4', await fetchFile(url))

  let metadata = ''
  ff.setLogger(({ message }: { message: string }) => {
    if (message.includes('Stream') || message.includes('Duration')) {
      metadata += message + '\n'
    }
  })

  await ff.run('-i', 'input.mp4', '-f', 'null', '-')

  return JSON.stringify({ ok: true, metadata: metadata.trim() })
}
