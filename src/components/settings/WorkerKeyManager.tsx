// Worker Key Manager — manage dynamic API keys stored in the Cloudflare Worker KV.
// Lets users add many API keys at once, without redeploying.
// Keys stored in KV are auto-injected by the worker when calling matching providers.

import { useEffect, useState } from 'react'
import { useConfirmStore } from '../../stores/confirmStore'

interface WorkerKeyEntry {
  name: string
  masked?: string
  length?: number
}

// Catalog of common API key slots — users can also add custom names
interface KeySlot {
  name: string
  label: string
  description: string
  link: string
  group: string
}

const KEY_CATALOG: KeySlot[] = [
  // LLM / chat
  { name: 'OPENROUTER_API_KEY', label: 'OpenRouter', description: 'Free tier — best for agents. 200+ models.', link: 'https://openrouter.ai/keys', group: 'LLM' },
  { name: 'GROQ_API_KEY', label: 'Groq', description: 'Free, very fast Llama 3.3 70B + Whisper', link: 'https://console.groq.com/keys', group: 'LLM' },
  { name: 'GEMINI_API_KEY', label: 'Google Gemini', description: 'Free AI Studio tier (mind training terms)', link: 'https://aistudio.google.com/apikey', group: 'LLM' },
  { name: 'OPENAI_API_KEY', label: 'OpenAI', description: 'GPT-4o, o1, Whisper, TTS, DALL-E', link: 'https://platform.openai.com/api-keys', group: 'LLM' },
  { name: 'ANTHROPIC_API_KEY', label: 'Anthropic', description: 'Claude 3.5 Sonnet, Opus, Haiku', link: 'https://console.anthropic.com/settings/keys', group: 'LLM' },
  { name: 'MISTRAL_API_KEY', label: 'Mistral', description: 'Mistral Small / Large / Embed', link: 'https://console.mistral.ai/api-keys', group: 'LLM' },
  { name: 'COHERE_API_KEY', label: 'Cohere', description: 'Command R+, Embed v3, Rerank', link: 'https://dashboard.cohere.com/api-keys', group: 'LLM' },
  // Media
  { name: 'YOUTUBE_API_KEY', label: 'YouTube Data API', description: 'Search + video stats', link: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com', group: 'Media' },
  { name: 'PEXELS_API_KEY', label: 'Pexels', description: 'Stock videos & photos (free)', link: 'https://www.pexels.com/api/', group: 'Media' },
  { name: 'PIXABAY_API_KEY', label: 'Pixabay', description: 'Stock videos & photos (free)', link: 'https://pixabay.com/accounts/register/', group: 'Media' },
  { name: 'YOINKU_API_KEY', label: 'Yoinku', description: 'YouTube → MP4 download API', link: 'https://yoinku.com/api', group: 'Media' },
  // Cloud platforms
  { name: 'KAGGLE_USERNAME', label: 'Kaggle username', description: 'For /api/kaggle/* endpoints', link: 'https://www.kaggle.com/settings', group: 'Cloud' },
  { name: 'KAGGLE_KEY', label: 'Kaggle key', description: 'Pair with username', link: 'https://www.kaggle.com/settings', group: 'Cloud' },
  { name: 'KAGGLE_NOTEBOOK_SLUG', label: 'Kaggle notebook slug', description: 'e.g. youruser/your-notebook', link: 'https://www.kaggle.com/code', group: 'Cloud' },
  { name: 'GITHUB_TOKEN', label: 'GitHub token', description: 'ghp_... or github_pat_...', link: 'https://github.com/settings/tokens', group: 'Cloud' },
  { name: 'NOTION_API_KEY', label: 'Notion integration', description: 'ntn_... internal integration token', link: 'https://www.notion.so/my-integrations', group: 'Cloud' },
  { name: 'SLACK_TOKEN', label: 'Slack bot token', description: 'xoxb-... bot OAuth token', link: 'https://api.slack.com/apps', group: 'Cloud' },
  { name: 'RESEND_API_KEY', label: 'Resend', description: 'Email API — free 3k/month', link: 'https://resend.com/api-keys', group: 'Cloud' },
  { name: 'TELEGRAM_BOT_TOKEN', label: 'Telegram bot', description: '123:abc... from @BotFather', link: 'https://t.me/BotFather', group: 'Cloud' },
  { name: 'COLAB_TOKEN', label: 'Colab auth token', description: 'For the Colab node (optional)', link: 'https://colab.research.google.com', group: 'Cloud' },
]

interface Props {
  workerOrigin: string
}

export default function WorkerKeyManager({ workerOrigin }: Props) {
  const confirm = useConfirmStore((s) => s.confirm)
  const [storedKeys, setStoredKeys] = useState<WorkerKeyEntry[]>([])
  // Start in loading state — the initial fetch kicks off from the mount effect.
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  // Bulk add form state
  const [bulkText, setBulkText] = useState('')
  const [customName, setCustomName] = useState('')
  const [customValue, setCustomValue] = useState('')

  /**
   * Refresh the stored-key list. Safe to call from effects: every state update
   * happens after the first `await`, so nothing runs synchronously on mount.
   * Event handlers that want an immediate loading indicator should call
   * `beginAction()` before awaiting this.
   */
  const refresh = async () => {
    try {
      const res = await fetch(`${workerOrigin}/api/keys`)
      if (!res.ok) throw new Error(`Worker ${res.status}`)
      const data = await res.json() as { keys: string[] }
      // Fetch masked value for each key (best-effort)
      const withMeta: WorkerKeyEntry[] = await Promise.all(
        (data.keys ?? []).map(async (name) => {
          try {
            const r = await fetch(`${workerOrigin}/api/keys/get?name=${encodeURIComponent(name)}`)
            if (r.ok) {
              const d = await r.json() as { masked?: string; length?: number }
              return { name, masked: d.masked, length: d.length }
            }
          } catch { /* ignore */ }
          return { name }
        })
      )
      setStoredKeys(withMeta)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const beginAction = () => {
    setLoading(true)
    setError(null)
  }

  useEffect(() => {
    // Defer one tick so every state update inside refresh() happens outside
    // the synchronous effect body (avoids cascading renders on mount).
    const t = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addKey = async (name: string, value: string) => {
    if (!name.trim() || !value.trim()) return
    beginAction()
    try {
      const res = await fetch(`${workerOrigin}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), value: value.trim() }),
      })
      if (!res.ok) throw new Error(`Worker ${res.status}`)
      setFlash(`Saved ${name}`)
      setTimeout(() => setFlash(null), 1500)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const deleteKey = async (name: string) => {
    const ok = await confirm({
      title: `Delete key "${name}"?`,
      message: 'This removes the key from the worker KV. Tools that depend on it will be locked again.',
      confirmLabel: 'Delete key',
      variant: 'danger',
    })
    if (!ok) return
    beginAction()
    try {
      const res = await fetch(`${workerOrigin}/api/keys?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Worker ${res.status}`)
      setFlash(`Deleted ${name}`)
      setTimeout(() => setFlash(null), 1500)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAdd = async () => {
    // Parse KEY=value lines, comma-separated, or JSON object
    const lines = bulkText.split('\n')
    const entries: Array<{ name: string; value: string }> = []
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      // Try KEY=value
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const name = trimmed.slice(0, eqIdx).trim()
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
        if (name && value) entries.push({ name, value })
        continue
      }
      // Try comma-separated value pairs
      const parts = trimmed.split(',').map((p) => p.trim())
      if (parts.length >= 2) {
        const name = parts[0]
        const value = parts.slice(1).join(',').trim()
        if (name && value) entries.push({ name, value })
      }
    }
    if (entries.length === 0) {
      setError('No KEY=value lines detected. Put one key per line like: OPENAI_API_KEY=sk-...')
      return
    }
    beginAction()
    let ok = 0
    let fail = 0
    for (const e of entries) {
      try {
        const res = await fetch(`${workerOrigin}/api/keys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(e),
        })
        if (res.ok) { ok++ } else { fail++ }
      } catch {
        fail++
      }
    }
    setBulkText('')
    setFlash(`Saved ${ok} keys${fail > 0 ? `, ${fail} failed` : ''}`)
    setTimeout(() => setFlash(null), 2000)
    await refresh()
    setLoading(false)
  }

  const handleCustomAdd = async () => {
    if (!customName.trim() || !customValue.trim()) return
    await addKey(customName, customValue)
    setCustomName('')
    setCustomValue('')
  }

  const handleQuickAdd = async (slot: KeySlot) => {
    const value = prompt(`Enter your ${slot.label} key (stored in worker KV):`)
    if (!value?.trim()) return
    await addKey(slot.name, value)
  }

  const storedKeyNames = new Set(storedKeys.map((k) => k.name))

  return (
    <div className="worker-key-manager">
      <div className="wkm-section">
        <p className="wkm-section-title">Quick add</p>
        <p className="wkm-section-hint">
          Click any provider to add its key. Keys are stored in the Cloudflare Worker KV
          (encrypted at rest) and auto-injected when calling matching APIs — no redeploy needed.
        </p>
        {KEY_CATALOG.reduce<Record<string, KeySlot[]>>((groups, slot) => {
          (groups[slot.group] = groups[slot.group] ?? []).push(slot)
          return groups
        }, {}) && (
          <div className="wkm-catalog">
            {Object.entries(
              KEY_CATALOG.reduce<Record<string, KeySlot[]>>((acc, s) => {
                ;(acc[s.group] = acc[s.group] ?? []).push(s)
                return acc
              }, {})
            ).map(([group, slots]) => (
              <div key={group} className="wkm-catalog-group">
                <p className="wkm-catalog-group-label">{group}</p>
                <div className="wkm-catalog-grid">
                  {slots.map((slot) => {
                    const stored = storedKeyNames.has(slot.name)
                    return (
                      <button
                        key={slot.name}
                        type="button"
                        className={`wkm-catalog-chip ${stored ? 'wkm-catalog-chip--stored' : ''}`}
                        title={slot.description}
                        onClick={() => void handleQuickAdd(slot)}
                      >
                        <span className="wkm-catalog-chip-label">{slot.label}</span>
                        {stored ? (
                          <span className="wkm-catalog-chip-status">✓ stored</span>
                        ) : (
                          <span className="wkm-catalog-chip-status">+ add</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="wkm-section">
        <p className="wkm-section-title">Bulk add</p>
        <p className="wkm-section-hint">
          Paste multiple keys at once — one per line, in <code>NAME=value</code> format.
          Lines starting with <code>#</code> are ignored (use them for comments).
        </p>
        <textarea
          className="wkm-bulk-input"
          rows={6}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={`# Add your keys here, one per line\nOPENAI_API_KEY=sk-...\nANTHROPIC_API_KEY=sk-ant-...\nPEXELS_API_KEY=...`}
          disabled={loading}
        />
        <button
          type="button"
          className="wkm-action-btn"
          disabled={loading || !bulkText.trim()}
          onClick={() => void handleBulkAdd()}
        >
          {loading ? 'Saving…' : 'Save all to worker'}
        </button>
      </div>

      <div className="wkm-section">
        <p className="wkm-section-title">Custom name</p>
        <p className="wkm-section-hint">
          For any provider not in the catalog (or any <code>SECRET_*</code> generic name).
        </p>
        <div className="wkm-custom-row">
          <input
            className="wkm-custom-name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="MY_CUSTOM_API_KEY"
            disabled={loading}
          />
          <input
            className="wkm-custom-value"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="paste the key value"
            type="password"
            disabled={loading}
          />
          <button
            type="button"
            className="wkm-action-btn"
            disabled={loading || !customName.trim() || !customValue.trim()}
            onClick={() => void handleCustomAdd()}
          >
            Add
          </button>
        </div>
      </div>

      <div className="wkm-section">
        <div className="wkm-section-header">
          <p className="wkm-section-title">Stored on worker ({storedKeys.length})</p>
          <button
            type="button"
            className="wkm-link-btn"
            disabled={loading}
            onClick={() => void refresh()}
          >
            Refresh
          </button>
        </div>
        {loading && <p className="wkm-section-hint">Loading…</p>}
        {error && <p className="wkm-error">Error: {error}</p>}
        {storedKeys.length === 0 && !loading && (
          <p className="wkm-section-hint">No keys stored yet. Use Quick add or Bulk add above.</p>
        )}
        <ul className="wkm-key-list">
          {storedKeys.map((k) => (
            <li key={k.name} className="wkm-key-row">
              <div className="wkm-key-info">
                <span className="wkm-key-name">{k.name}</span>
                {k.masked && <span className="wkm-key-masked">{k.masked}</span>}
                {k.length !== undefined && <span className="wkm-key-length">{k.length} chars</span>}
              </div>
              <button
                type="button"
                className="wkm-key-delete"
                title="Delete key"
                disabled={loading}
                onClick={() => void deleteKey(k.name)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>

      {flash && <p className="wkm-flash">{flash}</p>}
    </div>
  )
}
