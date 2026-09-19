export async function runWebAudio(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('No audio URL')

  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const audioContext = new AudioContext()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  if (config.mode === 'analyze') {
    // Simple frequency analysis
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(analyser)
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length

    return JSON.stringify({
      ok: true,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      averageFrequency: average,
    })
  }

  return JSON.stringify({
    ok: true,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
  })
}
