// Cloud Speech-to-Text — Groq Whisper or OpenAI Whisper via the worker's
// /api/groq/audio multipart pass-through (api.groq.com and api.openai.com
// do not allow direct browser calls, and JSON bodies cannot carry multipart
// file uploads — so the worker forwards the raw multipart body server-side).

export async function runSpeechToTextCloud(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  // input is a URL to an audio file (or use config.audioUrl)
  const audioUrl = config.audioUrl?.trim() || input.trim()
  if (!audioUrl) throw new Error('audio URL required (wire upstream URL into this node, or set audioUrl in config)')
  const provider = config.provider ?? 'groq'
  const language = config.language?.trim() ?? 'en'
  const model = config.model?.trim()

  if (provider !== 'groq' && provider !== 'openai') {
    throw new Error(`Unknown provider: ${provider} (supported: groq, openai)`)
  }

  // 1. Download the audio bytes (this URL must be CORS-readable or same-origin).
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.status}`)
  const audioBlob = await audioRes.blob()

  // 2. Build a real multipart form (same shape the Whisper APIs expect).
  const formData = new FormData()
  const filename = audioUrl.split('/').pop()?.split('?')[0] || 'audio.mp3'
  formData.append('file', audioBlob, filename || 'audio.mp3')
  formData.append('model', model || (provider === 'groq' ? 'whisper-large-v3' : 'whisper-1'))
  if (language) formData.append('language', language)
  if (config.prompt?.trim()) formData.append('prompt', config.prompt.trim())

  // 3. POST the multipart body to the worker pass-through. The worker adds
  //    the provider API key server-side and forwards the bytes untouched.
  const endpoint = provider === 'openai' ? '/api/groq/audio?provider=openai' : '/api/groq/audio'
  const res = await fetch(`${workerUrl}${endpoint}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    throw new Error(`${provider} STT failed: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json()) as { text?: string }
  return JSON.stringify(
    { ok: true, provider, model: model || (provider === 'groq' ? 'whisper-large-v3' : 'whisper-1'), language, text: data.text ?? '' },
    null,
    2
  )
}
