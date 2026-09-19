const MAX_BYTES = 25 * 1024 * 1024

export const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo'

export async function pickAudioFile(): Promise<File> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'audio/*'

  return new Promise((resolve, reject) => {
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No audio file selected'))
        return
      }
      if (file.size > MAX_BYTES) {
        reject(new Error('Audio file exceeds Groq 25MB limit'))
        return
      }
      resolve(file)
    }
    input.click()
  })
}

export async function transcribeWithGroq(
  apiKey: string,
  file: File,
  language?: string
): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('model', GROQ_WHISPER_MODEL)
  if (language?.trim()) form.append('language', language.trim())

  // api.groq.com does not send CORS headers, so a direct browser fetch is
  // blocked. Route the multipart body through the worker's /api/groq/audio
  // pass-through: it forwards the body + Content-Type untouched and adds the
  // Authorization header server-side. The user's own key (when provided)
  // wins over the worker's stored GROQ_API_KEY.
  const headers: Record<string, string> = {}
  if (apiKey.trim()) headers['Authorization'] = `Bearer ${apiKey.trim()}`

  const response = await fetch('/api/groq/audio', {
    method: 'POST',
    headers,
    body: form,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq transcription error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as { text?: string }
  return data.text?.trim() ?? ''
}

export async function runGroqTranscribe(
  apiKey: string,
  config: Record<string, string>
): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error('Add a Groq API key in Settings to use transcription')
  }

  const file = await pickAudioFile()
  const transcript = await transcribeWithGroq(apiKey, file, config.language)
  return `File: ${file.name}\n\nTranscript:\n${transcript}`
}
