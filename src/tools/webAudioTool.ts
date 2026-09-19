// Web Audio — decode an audio URL → info or frequency analysis.
// Uses OfflineAudioContext for analyze mode (no need to actually play).

export async function runWebAudio(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('No audio URL')

  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()

  // Decode + analyze in an OfflineAudioContext — synchronous, no playback needed
  const sampleRate = 44100
  const tmpCtx = new OfflineAudioContext(1, sampleRate, sampleRate)
  const audioBuffer = await tmpCtx.decodeAudioData(arrayBuffer)

  if (config.mode === 'analyze') {
    // Render in offline context with an AnalyserNode — collect spectrum
    const offlineCtx = new OfflineAudioContext(
      1,
      Math.ceil(audioBuffer.duration * sampleRate),
      sampleRate
    )
    const source = offlineCtx.createBufferSource()
    source.buffer = audioBuffer
    const analyser = offlineCtx.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)
    analyser.connect(offlineCtx.destination)
    source.start(0)

    await offlineCtx.startRendering()

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
    const peak = Math.max(...dataArray)

    // Top 5 loudest buckets
    const top = Array.from(dataArray)
      .map((v, i) => ({ freq: Math.round((i * sampleRate) / analyser.fftSize), mag: v }))
      .sort((a, b) => b.mag - a.mag)
      .slice(0, 5)

    return JSON.stringify({
      ok: true,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      averageFrequency: average,
      peakFrequency: peak,
      topFrequencies: top,
    }, null, 2)
  }

  return JSON.stringify({
    ok: true,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
  })
}
