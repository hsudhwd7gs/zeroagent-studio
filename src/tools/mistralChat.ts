// Mistral Chat node — calls Mistral API via the worker proxy.

export async function runMistralChat(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const userMsg = input.trim()
  if (!userMsg && !config.systemPrompt) throw new Error('input or systemPrompt required')

  const body: Record<string, unknown> = {
    model: config.model ?? 'mistral-small-latest',
    messages: [
      ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
      ...(userMsg ? [{ role: 'user', content: userMsg }] : []),
    ],
  }
  if (config.temperature) body.temperature = parseFloat(config.temperature)

  const res = await fetch(`${workerUrl}/api/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://api.mistral.ai/v1/chat/completions',
      method: 'POST',
      body,
    }),
  })
  if (!res.ok) throw new Error(`Mistral call failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as any
  const content = data.choices?.[0]?.message?.content ?? ''
  return JSON.stringify({ ok: true, model: body.model, content, usage: data.usage }, null, 2)
}
