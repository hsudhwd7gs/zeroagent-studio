// Kaggle Notebook node — connects to the worker's /api/kaggle/* endpoints.
// Worker resolves KAGGLE_USERNAME, KAGGLE_KEY, KAGGLE_NOTEBOOK_SLUG from KV or env.

export async function runKaggleNotebook(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const action = config.action ?? 'status'

  if (action === 'generate') {
    const promptsRaw = config.prompts?.trim() || input.trim()
    let prompts: string[]
    try {
      const parsed = JSON.parse(promptsRaw)
      prompts = Array.isArray(parsed) ? parsed : [String(parsed)]
    } catch {
      prompts = promptsRaw.split('\n').map((p) => p.trim()).filter(Boolean)
    }
    if (prompts.length === 0) throw new Error('prompts required')

    const body: Record<string, unknown> = { prompts }
    if (config.outputType) body.outputType = config.outputType
    if (config.steps) body.steps = parseInt(config.steps, 10)
    if (config.gpu !== undefined) body.gpu = config.gpu === 'true'

    const res = await fetch(`${workerUrl}/api/kaggle/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Kaggle generate failed: ${res.status} ${await res.text()}`)
    return JSON.stringify(await res.json(), null, 2)
  }

  if (action === 'status') {
    const res = await fetch(`${workerUrl}/api/kaggle/status`)
    if (!res.ok) throw new Error(`Kaggle status failed: ${res.status} ${await res.text()}`)
    return JSON.stringify(await res.json(), null, 2)
  }

  if (action === 'output') {
    const res = await fetch(`${workerUrl}/api/kaggle/output`)
    if (!res.ok) throw new Error(`Kaggle output failed: ${res.status} ${await res.text()}`)
    return JSON.stringify(await res.json(), null, 2)
  }

  throw new Error(`Unknown action: ${action}`)
}
