// Anthropic Chat node — calls Anthropic Messages API via the worker proxy.

interface AnthropicResponse {
  content?: Array<{ text?: string }>
  usage?: Record<string, unknown>
}

export async function runAnthropicChat(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const userMsg = input.trim()
  if (!userMsg && !config.systemPrompt) throw new Error('input or systemPrompt required')

  const body: Record<string, unknown> = {
    model: config.model ?? 'claude-3-5-sonnet-20241022',
    max_tokens: parseInt(config.maxTokens ?? '1024', 10),
    messages: [{ role: 'user', content: userMsg }],
  }
  if (config.systemPrompt) body.system = config.systemPrompt

  const res = await fetch(`${workerUrl}/api/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body,
    }),
  })
  if (!res.ok) throw new Error(`Anthropic call failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as AnthropicResponse
  const content = data.content?.[0]?.text ?? ''
  return JSON.stringify({ ok: true, model: body.model, content, usage: data.usage }, null, 2)
}
