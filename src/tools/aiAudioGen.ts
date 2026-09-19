// AI Audio Generation node — uses Workers AI for in-browser audio generation.

export async function runAiAudioGen(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const prompt = config.prompt?.trim() || input.trim()
  if (!prompt) throw new Error('prompt required')

  const provider = config.provider ?? 'workers-ai'

  if (provider === 'workers-ai') {
    // Workers AI text-to-speech / music — the @cf/myshell-ai/melotts model is a TTS,
    // the @cf/lyra/suno-ai-bark is audio gen. We use a generic text-to-audio path.
    const res = await fetch(`${workerUrl}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: config.model || '@cf/myshell-ai/melotts',
      }),
    })
    if (!res.ok) throw new Error(`Workers AI audio gen failed: ${res.status} ${await res.text()}`)
    return JSON.stringify({ ok: true, provider, prompt, response: await res.json() }, null, 2)
  }

  throw new Error(`Unknown provider: ${provider}`)
}
