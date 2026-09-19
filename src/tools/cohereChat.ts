// Cohere Chat node — calls Cohere v1 chat via the worker proxy.

interface CohereResponse {
  text?: string
  meta?: Record<string, unknown>
}

export async function runCohereChat(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const userMsg = input.trim()
  if (!userMsg && !config.systemPrompt) throw new Error('input or systemPrompt required')

  const body: Record<string, unknown> = {
    model: config.model ?? 'command-r-plus',
    message: userMsg,
  }
  if (config.systemPrompt) body.preamble = config.systemPrompt

  const res = await fetch(`${workerUrl}/api/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://api.cohere.ai/v1/chat',
      method: 'POST',
      body,
    }),
  })
  if (!res.ok) throw new Error(`Cohere call failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as CohereResponse
  return JSON.stringify({ ok: true, model: body.model, text: data.text, meta: data.meta }, null, 2)
}
