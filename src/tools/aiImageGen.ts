// AI Image Generation node — uses Workers AI Stable Diffusion XL by default.

export async function runAiImageGen(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const prompt = config.prompt?.trim() || input.trim()
  if (!prompt) throw new Error('prompt required')

  const provider = config.provider ?? 'workers-ai'

  if (provider === 'workers-ai') {
    const res = await fetch(`${workerUrl}/api/ai/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) throw new Error(`Workers AI image gen failed: ${res.status} ${await res.text()}`)
    // Response is binary PNG; return a blob URL JSON
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    return JSON.stringify({
      ok: true,
      provider,
      prompt,
      url,
      size: blob.size,
      contentType: blob.type,
    }, null, 2)
  }

  throw new Error(`Unknown provider: ${provider}`)
}
