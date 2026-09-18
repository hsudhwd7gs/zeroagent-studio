// Notion API — create or update pages via the Notion API.
//
// Config:
//   apiKey     — Notion integration token (required)
//   action     — create (default) | query
//   databaseId — target database (required for create/query)
//   title      — page title (for create)
//   body       — page body content (falls back to input)

interface NotionResponse {
  object: string
  id?: string
  [key: string]: unknown
}

export async function runNotionApi(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const apiKey = (config.apiKey ?? '').trim()
  if (!apiKey) throw new Error('Notion API key is required')

  const action = config.action ?? 'create'
  const databaseId = (config.databaseId ?? '').trim()
  if (!databaseId) throw new Error('databaseId is required')

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }

  if (action === 'query') {
    const url = `https://api.notion.com/v1/databases/${databaseId}/query`
    let response: Response
    try {
      response = await fetch(url, { method: 'POST', headers, body: '{}' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Notion request failed: ${msg}`, { cause: err })
    }

    let text = ''
    try {
      text = await response.text()
    } catch {
      void 0
    }

    if (!response.ok) {
      throw new Error(`Notion API ${response.status}: ${text.slice(0, 500)}`)
    }

    try {
      return JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      return text
    }
  }

  // create
  const title = (config.title ?? '').trim() || 'New page'
  const body = config.body?.trim() || input

  const payload = {
    parent: { database_id: databaseId },
    properties: {
      title: {
        title: [{ text: { content: title } }],
      },
    },
    children: body
      ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: body.slice(0, 2000) } }],
            },
          },
        ]
      : undefined,
  }

  let response: Response
  try {
    response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Notion request failed: ${msg}`, { cause: err })
  }

  let text = ''
  try {
    text = await response.text()
  } catch {
    void 0
  }

  if (!response.ok) {
    throw new Error(`Notion API ${response.status}: ${text.slice(0, 500)}`)
  }

  try {
    const json = JSON.parse(text) as NotionResponse
    return JSON.stringify({ ok: true, id: json.id, response: json }, null, 2)
  } catch {
    return text
  }
}
