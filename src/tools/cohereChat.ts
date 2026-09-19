// Cohere Chat node — calls Cohere v2 chat via the worker proxy.
// v2 uses OpenAI-style messages; auth is injected by the worker from
// COHERE_API_KEY in KV (or the user's own Bearer key passed through).

interface CohereV2Response {
  message?: { content?: Array<{ text?: string }> }
  usage?: Record<string, unknown>
  finish_reason?: string
}

export async function runCohereChat(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const userMsg = input.trim()
  if (!userMsg && !config.systemPrompt) throw new Error('input or systemPrompt required')

  const messages: Array<{ role: string; content: string }> = []
  if (config.systemPrompt) messages.push({ role: 'system', content: config.systemPrompt })
  if (userMsg) messages.push({ role: 'user', content: userMsg })

  const body: Record<string, unknown> = {
    model: config.model ?? 'command-r-plus-08-2024',
    messages,
  }
  if (config.temperature) body.temperature = parseFloat(config.temperature)
  if (config.maxTokens) body.max_tokens = parseInt(config.maxTokens, 10)

  const res = await fetch(`${workerUrl}/api/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://api.cohere.com/v2/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }),
  })
  if (!res.ok) throw new Error(`Cohere call failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as CohereV2Response
  const content = data.message?.content?.[0]?.text ?? ''
  return JSON.stringify({ ok: true, model: body.model, content, usage: data.usage }, null, 2)
}
