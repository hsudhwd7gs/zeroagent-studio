// API Key Manager — add/update/delete API keys in the Worker's KV store.
//
// The Worker stores keys in KV, and uses them immediately for proxy requests.
// No Cloudflare dashboard access needed.
//
// Input handling: if text is wired into this node, it's used as the key value
// fallback (useful for piping keys from a file reader or chat).

export async function runApiKeyManager(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = config.workerUrl?.trim() || window.location.origin
  const action = config.action ?? 'list'
  const name = config.keyName?.trim() || ''
  const value = config.keyValue?.trim() || input.trim()

  const baseUrl = workerUrl.replace(/\/+$/, '')

  try {
    if (action === 'list') {
      const response = await fetch(`${baseUrl}/api/keys`)
      if (!response.ok) {
        throw new Error(`List failed: HTTP ${response.status}`)
      }
      const data = (await response.json()) as { count: number; keys: string[] }
      const lines =
        data.keys.length > 0
          ? data.keys.map((k) => `  • ${k}`).join('\n')
          : '  (none)'
      return `Stored keys (${data.count}):\n${lines}`
    }

    if (action === 'set') {
      if (!name) throw new Error('keyName required')
      if (!value) throw new Error('keyValue required (set in inspector or wire input)')

      const response = await fetch(`${baseUrl}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value }),
      })
      if (!response.ok) {
        throw new Error(`Set failed: HTTP ${response.status}`)
      }
      const data = (await response.json()) as { ok: boolean; stored: string }
      return `✅ Stored: ${data.stored}\nThe Worker will use it immediately.`
    }

    if (action === 'delete') {
      if (!name) throw new Error('keyName required')

      const response = await fetch(
        `${baseUrl}/api/keys?name=${encodeURIComponent(name)}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        throw new Error(`Delete failed: HTTP ${response.status}`)
      }
      return `🗑️ Deleted: ${name}`
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`API Key Manager: ${message}`, { cause: err })
  }
}
