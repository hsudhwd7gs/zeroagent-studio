// OpenAI Chat node — calls OpenAI Chat Completions via the worker proxy.

interface OpenaiChatResponse {
  choices?: Array<{ message?: { content?: string } }>
  usage?: Record<string, unknown>
}

export async function runOpenaiChat(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const userMsg = input.trim()
  if (!userMsg && !config.systemPrompt) throw new Error('input or systemPrompt required')

  const body: Record<string, unknown> = {
    model: config.model ?? 'gpt-4o-mini',
    messages: [
      ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
      ...(userMsg ? [{ role: 'user', content: userMsg }] : []),
    ],
  }
  if (config.temperature) body.temperature = parseFloat(config.temperature)
  if (config.maxTokens) body.max_tokens = parseInt(config.maxTokens, 10)

  // Use the worker proxy with auto-secret injection (OPENAI_API_KEY in KV)
  const res = await fetch(`${workerUrl}/api/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      body,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI call failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as OpenaiChatResponse
  const content = data.choices?.[0]?.message?.content ?? ''
  return JSON.stringify({ ok: true, model: body.model, content, usage: data.usage }, null, 2)
}
