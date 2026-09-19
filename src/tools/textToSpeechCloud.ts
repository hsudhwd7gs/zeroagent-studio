// Cloud Text-to-Speech — uses OpenAI or Groq audio APIs via the worker proxy.
// Returns an audio blob URL.

export async function runTextToSpeechCloud(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const text = input.trim()
  if (!text) throw new Error('text required (wire upstream text into this node)')
  const provider = config.provider ?? 'openai'
  const voice = config.voice ?? 'alloy'
  const format = config.format ?? 'mp3'

  if (provider === 'openai') {
    const res = await fetch(`${workerUrl}/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://api.openai.com/v1/audio/speech',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          model: 'tts-1',
          input: text,
          voice,
          response_format: format,
        },
      }),
    })
    if (!res.ok) throw new Error(`OpenAI TTS failed: ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    return JSON.stringify({ ok: true, provider, voice, format, url, size: blob.size }, null, 2)
  }

  if (provider === 'groq') {
    // Groq doesn't have a TTS endpoint yet — use the worker's groq chat as a fallback
    throw new Error('Groq TTS not available — use OpenAI provider')
  }

  throw new Error(`Unknown provider: ${provider}`)
}
