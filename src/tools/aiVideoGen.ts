// AI Video Generation node — calls the worker, which proxies to Workers AI / Groq / OpenRouter.
// Default model: Cloudflare Workers AI text-to-video (when available).

export async function runAiVideoGen(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const prompt = config.prompt?.trim() || input.trim()
  if (!prompt) throw new Error('prompt required (config or input)')

  const provider = config.provider ?? 'workers-ai'

  if (provider === 'workers-ai') {
    // Try Workers AI video models
    const res = await fetch(`${workerUrl}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: config.model || '@cf/bytedance/stable-video-diffusion-1-1',
      }),
    })
    if (!res.ok) throw new Error(`Workers AI video gen failed: ${res.status} ${await res.text()}`)
    return JSON.stringify({ ok: true, provider, prompt, response: await res.json() }, null, 2)
  }

  if (provider === 'groq' || provider === 'openrouter') {
    // Text-to-video via a chat-style prompt (returns script, not video)
    const endpoint = provider === 'groq' ? '/api/groq' : '/api/proxy'
    const targetUrl = provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : ''
    const body: Record<string, unknown> = {
      model: config.model ?? (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.3-70b-instruct'),
      messages: [
        {
          role: 'system',
          content: 'You are a video generation AI. Given a prompt, produce a 30-second video script with shot-by-shot scene descriptions in JSON format.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }
    const res = endpoint === '/api/groq'
      ? await fetch(`${workerUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch(`${workerUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl, method: 'POST', body }),
        })
    if (!res.ok) throw new Error(`${provider} video script failed: ${res.status} ${await res.text()}`)
    return JSON.stringify({ ok: true, provider, prompt, response: await res.json() }, null, 2)
  }

  throw new Error(`Unknown provider: ${provider}`)
}
