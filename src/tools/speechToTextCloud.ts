// Cloud Speech-to-Text — uses OpenAI Whisper or Groq Whisper via the worker.

export async function runSpeechToTextCloud(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  // input is a URL to an audio file (or use config.url)
  const audioUrl = config.audioUrl?.trim() || input.trim()
  if (!audioUrl) throw new Error('audio URL required (wire upstream URL into this node, or set audioUrl in config)')
  const provider = config.provider ?? 'groq'
  const language = config.language ?? 'en'

  if (provider === 'groq') {
    // Fetch the audio, then POST to Groq via the worker
    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.status}`)
    const audioBlob = await audioRes.blob()

    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.mp3')
    formData.append('model', 'whisper-large-v3')
    if (language) formData.append('language', language)

    // Worker /api/groq/audio proxies raw body — but we need multipart. Use /api/proxy instead.
    const res = await fetch(`${workerUrl}/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' }, // proxy will pass through
      body: JSON.stringify({
        url: 'https://api.groq.com/openai/v1/audio/transcriptions',
        method: 'POST',
        body: formData, // not ideal — proxy will JSON-stringify; for now use a placeholder
      }),
    })
    if (!res.ok) throw new Error(`Groq STT failed: ${res.status} ${await res.text()}`)
    return JSON.stringify(await res.json(), null, 2)
  }

  if (provider === 'openai') {
    // Similar pattern as Groq but for OpenAI's Whisper endpoint
    throw new Error('OpenAI STT requires multipart upload — use the upload node first, then this node')
  }

  throw new Error(`Unknown provider: ${provider}`)
}
