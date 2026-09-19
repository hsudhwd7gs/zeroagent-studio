import { Studio } from '@diffusionstudio/core'

export async function runDiffusionStudio(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const studio = new Studio()
  const videoUrl = config.videoUrl?.trim() || input.trim()
  if (!videoUrl) throw new Error('No video URL')

  const composition = studio.createComposition()
  const videoClip = await composition.addVideo(videoUrl)
  videoClip.setStart(0)
  videoClip.setDuration(parseFloat(config.duration || '10'))

  const output = await studio.render(composition)
  const blob = new Blob([output], { type: 'video/mp4' })
  const outputUrl = URL.createObjectURL(blob)

  return JSON.stringify({ ok: true, url: outputUrl, size: blob.size })
}
