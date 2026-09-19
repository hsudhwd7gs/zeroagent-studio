/**
 * Brainwire — Universal Worker v2 (Production Ready, Cloud-Sync Edition)
 * ============================================================================
 *
 * Pure relay + dynamic API key management via KV + multi-project cloud sync via D1.
 *
 * Features:
 *   • Universal proxy — any API, any method, any auth
 *   • Dynamic API keys — add/update from Brainwire UI, stored in KV
 *   • All Cloudflare free features (KV, R2, D1, Workers AI, Cron)
 *   • Auto-secret injection for 15+ providers
 *   • Multi-project + multi-workflow cloud sync (D1-backed)
 *   • Webhook receiver + replay (KV-backed)
 *   • yt-dlp proxy (via cobalt.tools — free, no key)
 *   • Text-to-workflow AI generator (via Groq / Workers AI)
 *   • Zero computation — all heavy work on your PC or external APIs
 *
 * Endpoints (existing — kept for back-compat):
 *   GET  /api/health                    → Status + enabled features
 *   POST /api/proxy                     → Universal proxy (POST body)
 *   GET  /api/proxy?url=...             → Simple GET proxy
 *   POST /api/multi                     → Parallel requests (max 10)
 *   GET  /api/cached-proxy?url=...      → Cached GET via Cache API
 *   POST /api/keys                      → Store API key in KV
 *   GET  /api/keys                      → List stored key names
 *   DELETE /api/keys?name=...           → Delete stored key
 *   POST /api/kaggle/generate           → Trigger Kaggle notebook
 *   GET  /api/kaggle/status             → Kaggle run status
 *   GET  /api/kaggle/output             → Kaggle output download
 *   POST /api/groq                      → Groq chat completions
 *   POST /api/groq/audio                → Groq Whisper transcription
 *   GET  /api/youtube/search?q=...      → YouTube HTML search
 *   GET  /api/youtube/autocomplete?q=.. → YouTube real keywords
 *   GET  /api/youtube/videos?ids=...    → YouTube Data API
 *   GET  /api/yoinku?video_id=...       → Yoinku MP4 links
 *   POST /api/ai/generate               → Workers AI text generation
 *   POST /api/ai/image                  → Workers AI image generation
 *   POST /api/ai/embed                   → Workers AI embeddings
 *   POST /api/storage/upload?key=...    → R2 upload
 *   GET  /api/storage/download/{key}    → R2 download
 *   POST /api/db/save                   → D1 save key/value
 *   GET  /api/db/get?key=...            → D1 retrieve value
 *
 * New endpoints (v2):
 *   POST /api/ytdlp                     → yt-dlp proxy via cobalt.tools
 *   GET  /api/projects                  → List all projects
 *   POST /api/projects                   → Create project {name, color?}
 *   GET  /api/projects/{id}              → Get one project
 *   PUT  /api/projects/{id}              → Rename / update project
 *   DELETE /api/projects/{id}            → Delete project (and its workflows)
 *   GET  /api/projects/{id}/workflows   → List workflows in project
 *   POST /api/projects/{id}/workflows   → Upsert workflow in project
 *   GET  /api/workflows/{id}             → Get single workflow
 *   DELETE /api/workflows/{id}          → Delete workflow
 *   POST /api/ai/workflow               → Text → workflow JSON (Groq or Workers AI)
 *   POST /api/webhook/{id}              → Webhook receiver (writes body to KV)
 *   GET  /api/webhook/{id}              → Get latest webhook payload
 *   GET  /api/webhooks                  → List all webhook IDs
 *   POST /api/sync                      → Bulk push state {projects, workflows}
 *   GET  /api/sync                       → Bulk pull state (all projects + workflows)
 *   GET  /api/db/list?prefix=...        → List D1 keys by prefix
 *   DELETE /api/db?key=...              → Delete D1 row
 *   GET  /api/storage/list              → List R2 objects (last 100)
 *   DELETE /api/storage/{key}            → Delete R2 object
 *   POST /api/jobs                      → Create background job (writes to KV with TTL)
 *   GET  /api/jobs/{id}                 → Get job status
 *   GET  /api/keys/get?name=...         → Get a stored key's value (masked)
 *   *    /*                             → Static assets (Brainwire UI)
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Env {
  ASSETS: Fetcher
  CACHE?: KVNamespace
  STORAGE?: R2Bucket
  DB?: D1Database
  AI?: Ai
  ANALYTICS?: AnalyticsEngineDataset
  KAGGLE_USERNAME?: string
  KAGGLE_KEY?: string
  KAGGLE_NOTEBOOK_SLUG?: string
  GROQ_API_KEY?: string
  YOUTUBE_API_KEY?: string
  YOINKU_API_KEY?: string
  OPENROUTER_API_KEY?: string
  GEMINI_API_KEY?: string
  NOTION_API_KEY?: string
  GITHUB_TOKEN?: string
  SLACK_TOKEN?: string
  RESEND_API_KEY?: string
  TELEGRAM_BOT_TOKEN?: string
  [key: string]: string | Fetcher | KVNamespace | R2Bucket | D1Database | Ai | AnalyticsEngineDataset | undefined
}

interface ProjectRow {
  id: string
  name: string
  color: string
  created_at: number
  updated_at: number
}

interface WorkflowRow {
  id: string
  project_id: string
  name: string
  nodes: string
  edges: string
  created_at: number
  updated_at: number
}

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': '*',
  'Access-Control-Max-Age': '86400',
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS })
}

function textResponse(body: string, status = 200, contentType = 'text/plain; charset=utf-8'): Response {
  return new Response(body, { status, headers: { ...CORS_HEADERS, 'Content-Type': contentType } })
}

function notFound(msg = 'Not found'): Response {
  return json({ error: msg }, 404)
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function uuid(): string {
  // Crypto.randomUUID is available in Workers
  return crypto.randomUUID()
}

function now(): number {
  return Date.now()
}

async function ensureSchema(env: Env): Promise<void> {
  if (!env.DB) return
  // Idempotent — D1 supports CREATE TABLE IF NOT EXISTS
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#8b5cf6',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        nodes TEXT NOT NULL DEFAULT '[]',
        edges TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )`
    ),
    env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows(project_id)`
    ),
    env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_workflows_updated ON workflows(updated_at DESC)`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS webhook_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hook_id TEXT NOT NULL,
        body TEXT NOT NULL,
        received_at INTEGER NOT NULL
      )`
    ),
    env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_webhook_log_hook ON webhook_log(hook_id, received_at DESC)`
    ),
  ])
}

// ─────────────────────────────────────────────────────────────
// Dynamic key resolution — KV first, then env
// ─────────────────────────────────────────────────────────────

async function getKey(env: Env, name: string): Promise<string | undefined> {
  if (env.CACHE) {
    try {
      const kvValue = await env.CACHE.get(`apikey:${name}`)
      if (kvValue) return kvValue
    } catch {
      /* ignore */
    }
  }
  const envValue = env[name]
  return typeof envValue === 'string' ? envValue : undefined
}

// ─────────────────────────────────────────────────────────────
// Auto-inject provider auth based on target hostname
// ─────────────────────────────────────────────────────────────

async function injectProviderAuth(
  env: Env,
  targetUrl: string,
  headers: Record<string, string>
): Promise<void> {
  let host: string
  try {
    host = new URL(targetUrl).hostname
  } catch {
    return
  }

  if (host.endsWith('groq.com')) {
    const key = await getKey(env, 'GROQ_API_KEY')
    if (key) headers['Authorization'] = `Bearer ${key}`
  }
  if (host.endsWith('openrouter.ai')) {
    const key = await getKey(env, 'OPENROUTER_API_KEY')
    if (key) headers['Authorization'] = `Bearer ${key}`
  }
  if (host.endsWith('googleapis.com')) {
    const key = await getKey(env, 'GEMINI_API_KEY')
    if (key) headers['x-goog-api-key'] = key
  }
  if (host.endsWith('yoinku.com')) {
    const key = await getKey(env, 'YOINKU_API_KEY')
    if (key) headers['x-api-key'] = key
  }
  if (host.endsWith('kaggle.com')) {
    const username = await getKey(env, 'KAGGLE_USERNAME')
    const key = await getKey(env, 'KAGGLE_KEY')
    if (username && key) {
      headers['Authorization'] = `Basic ${btoa(`${username}:${key}`)}`
    }
  }
  if (host.endsWith('notion.com')) {
    const key = await getKey(env, 'NOTION_API_KEY')
    if (key) {
      headers['Authorization'] = `Bearer ${key}`
      headers['Notion-Version'] = '2022-06-28'
    }
  }
  if (host.endsWith('slack.com')) {
    const key = await getKey(env, 'SLACK_TOKEN')
    if (key) headers['Authorization'] = `Bearer ${key}`
  }
  if (host.endsWith('github.com') || host.endsWith('api.github.com')) {
    const key = await getKey(env, 'GITHUB_TOKEN')
    if (key) {
      headers['Authorization'] = `Bearer ${key}`
      headers['Accept'] = 'application/vnd.github+json'
      headers['X-GitHub-Api-Version'] = '2022-11-28'
    }
  }
  if (host.endsWith('resend.com')) {
    const key = await getKey(env, 'RESEND_API_KEY')
    if (key) headers['Authorization'] = `Bearer ${key}`
  }

  // Generic: any SECRET_<HOST_WITH_UNDERSCORES> in KV or env
  const normalizedHost = host.replace(/\./g, '_').toUpperCase()
  const genericKey = await getKey(env, `SECRET_${normalizedHost}`)
  if (genericKey && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${genericKey}`
  }
}

// ─────────────────────────────────────────────────────────────
// Universal proxy core
// ─────────────────────────────────────────────────────────────

async function proxyRequest(
  env: Env,
  request: Request,
  targetUrl: string,
  bodyOverride?: BodyInit | null
): Promise<Response> {
  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    return json({ error: 'Invalid target URL', targetUrl }, 400)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return json({ error: 'Only http/https URLs supported' }, 400)
  }

  const headers: Record<string, string> = {}
  const safeHeaders = ['accept', 'accept-language', 'content-type', 'cache-control', 'if-none-match', 'range', 'user-agent']
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase()
    if (safeHeaders.includes(lower)) headers[key] = value
    if (lower.startsWith('x-') && !lower.startsWith('x-secret-')) headers[key] = value
  }
  if (!headers['User-Agent']) headers['User-Agent'] = 'Brainwire-Studio/1.0'

  await injectProviderAuth(env, targetUrl, headers)

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'follow',
  }

  if (bodyOverride !== undefined) {
    init.body = bodyOverride
  } else if (request.method !== 'GET' && request.method !== 'HEAD') {
    const buf = await request.arrayBuffer()
    if (buf.byteLength > 0) init.body = buf
  }

  try {
    const upstream = await fetch(targetUrl, init)
    const respHeaders = new Headers(upstream.headers)
    for (const [k, v] of Object.entries(CORS_HEADERS)) respHeaders.set(k, v)
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: respHeaders,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return json({ error: 'Upstream fetch failed', detail: message, targetUrl }, 502)
  }
}

// ─────────────────────────────────────────────────────────────
// yt-dlp proxy — info via YouTube oEmbed (always free, no key),
// download via cobalt.tools (requires their JWT — fall back gracefully)
// ─────────────────────────────────────────────────────────────

async function handleYtDlp(env: Env, request: Request): Promise<Response> {
  const body = await request.json() as { url?: string; action?: string; format?: string; cookies?: string }
  const videoUrl = body.url?.trim()
  if (!videoUrl) return json({ error: 'url required' }, 400)

  const action = body.action ?? 'info'

  if (action === 'info') {
    // Use YouTube oEmbed for video metadata — always free, no key needed.
    // Works for youtube.com/watch?v=... and youtu.be/...
    // Try noembed.com first (aggregator that works reliably from CF Workers),
    // then fall back to direct YouTube oEmbed, then cobalt.tools.
    const encodedUrl = encodeURIComponent(videoUrl)
    const triedSources: Array<{ source: string; status: number; body?: string }> = []

    // 1. noembed.com — works reliably from CF Workers IPs
    try {
      const noembedRes = await fetch(`https://noembed.com/embed?url=${encodedUrl}`, {
        headers: { 'User-Agent': 'Brainwire-Studio/2.0' },
      })
      triedSources.push({ source: 'noembed.com', status: noembedRes.status })
      if (noembedRes.ok) {
        const data = await noembedRes.json() as any
        if (data && !data.error) {
          return json({
            ok: true,
            source: 'noembed.com',
            info: {
              title: data.title,
              author_name: data.author_name,
              author_url: data.author_url,
              thumbnail_url: data.thumbnail_url,
              provider_name: data.provider_name,
              provider_url: data.provider_url,
              type: data.type,
              url: videoUrl,
            },
          })
        }
      }
    } catch (err) {
      triedSources.push({ source: 'noembed.com', status: 0, body: String(err) })
    }

    // 2. Direct YouTube oEmbed
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodedUrl}&format=json`, {
        headers: { 'User-Agent': 'Brainwire-Studio/2.0' },
      })
      triedSources.push({ source: 'youtube-oembed', status: oembedRes.status })
      if (oembedRes.ok) {
        const data = await oembedRes.json() as any
        return json({
          ok: true,
          source: 'youtube-oembed',
          info: {
            title: data.title,
            author_name: data.author_name,
            author_url: data.author_url,
            thumbnail_url: data.thumbnail_url,
            provider_name: data.provider_name,
            provider_url: data.provider_url,
            type: data.type,
            version: data.version,
            url: videoUrl,
          },
        })
      }
    } catch (err) {
      triedSources.push({ source: 'youtube-oembed', status: 0, body: String(err) })
    }

    // 3. cobalt.tools fallback
    try {
      const cobaltRes = await fetch('https://api.cobalt.tools/', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl }),
      })
      const data = await cobaltRes.json() as any
      return json({ ok: true, source: 'cobalt.tools', info: data, tried: triedSources })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return json({ ok: false, error: 'Could not fetch video info', detail: message, tried: triedSources }, 502)
    }
  }

  if (action === 'download') {
    // Try cobalt.tools first; if it requires JWT, return a helpful error.
    try {
      const cobaltRes = await fetch('https://api.cobalt.tools/', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: videoUrl,
          videoQuality: body.format ?? '720',
          filenamePattern: 'basic',
        }),
      })
      const data = await cobaltRes.json() as any
      if (data?.status === 'error' && data?.error?.code === 'error.api.auth.jwt.missing') {
        return json({
          ok: false,
          error: 'cobalt.tools public instance now requires authentication. Self-host cobalt.tools or use the "info" action.',
          detail: data,
        }, 502)
      }
      return json({ ok: true, source: 'cobalt.tools', result: data })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return json({ ok: false, error: 'cobalt.tools fetch failed', detail: message }, 502)
    }
  }

  return json({ error: `Unknown action: ${action}` }, 400)
}

// ─────────────────────────────────────────────────────────────
// Projects / Workflows (D1-backed)
// ─────────────────────────────────────────────────────────────

async function handleProjects(env: Env, request: Request, url: URL): Promise<Response> {
  await ensureSchema(env)
  if (!env.DB) return json({ error: 'D1 not bound' }, 500)

  const path = url.pathname

  // GET /api/projects — list all
  if (request.method === 'GET' && path === '/api/projects') {
    const rows = await env.DB.prepare(
      'SELECT id, name, color, created_at, updated_at FROM projects ORDER BY updated_at DESC'
    ).all()
    return json({ ok: true, projects: rows.results ?? [] })
  }

  // POST /api/projects — create
  if (request.method === 'POST' && path === '/api/projects') {
    const body = await request.json() as { name?: string; color?: string }
    if (!body.name?.trim()) return json({ error: 'name required' }, 400)
    const id = uuid()
    const ts = now()
    await env.DB.prepare(
      'INSERT INTO projects (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, body.name.trim(), body.color ?? '#8b5cf6', ts, ts).run()
    return json({ ok: true, project: { id, name: body.name.trim(), color: body.color ?? '#8b5cf6', created_at: ts, updated_at: ts } })
  }

  // /api/projects/{id}
  const match = path.match(/^\/api\/projects\/([\w-]+)$/)
  if (match) {
    const id = match[1]

    if (request.method === 'GET') {
      const row = await env.DB.prepare(
        'SELECT id, name, color, created_at, updated_at FROM projects WHERE id = ?'
      ).bind(id).first()
      if (!row) return notFound('Project not found')
      return json({ ok: true, project: row })
    }

    if (request.method === 'PUT' || request.method === 'PATCH') {
      const body = await request.json() as { name?: string; color?: string }
      const updates: string[] = []
      const binds: (string | number)[] = []
      if (body.name) { updates.push('name = ?'); binds.push(body.name.trim()) }
      if (body.color) { updates.push('color = ?'); binds.push(body.color) }
      if (updates.length === 0) return json({ error: 'No fields to update' }, 400)
      updates.push('updated_at = ?')
      binds.push(now())
      binds.push(id)
      await env.DB.prepare(
        `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...binds).run()
      return json({ ok: true, updated: id })
    }

    if (request.method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM workflows WHERE project_id = ?').bind(id),
        env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id),
      ])
      return json({ ok: true, deleted: id })
    }
  }

  // GET /api/projects/{id}/workflows — list workflows in project
  const workflowsMatch = path.match(/^\/api\/projects\/([\w-]+)\/workflows$/)
  if (workflowsMatch) {
    const projectId = workflowsMatch[1]
    if (request.method === 'GET') {
      const rows = await env.DB.prepare(
        'SELECT id, project_id, name, created_at, updated_at FROM workflows WHERE project_id = ? ORDER BY updated_at DESC'
      ).bind(projectId).all()
      return json({ ok: true, workflows: rows.results ?? [] })
    }
    if (request.method === 'POST') {
      const body = await request.json() as { id?: string; name?: string; nodes?: unknown; edges?: unknown }
      if (!body.name?.trim()) return json({ error: 'name required' }, 400)
      const id = body.id ?? uuid()
      const ts = now()
      // Upsert
      await env.DB.prepare(
        `INSERT INTO workflows (id, project_id, name, nodes, edges, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           nodes = excluded.nodes,
           edges = excluded.edges,
           updated_at = excluded.updated_at`
      ).bind(
        id,
        projectId,
        body.name.trim(),
        JSON.stringify(body.nodes ?? []),
        JSON.stringify(body.edges ?? []),
        ts,
        ts
      ).run()
      return json({ ok: true, workflow: { id, project_id: projectId, name: body.name.trim(), updated_at: ts } })
    }
  }

  // /api/workflows/{id}
  const wfMatch = path.match(/^\/api\/workflows\/([\w-]+)$/)
  if (wfMatch) {
    const id = wfMatch[1]
    if (request.method === 'GET') {
      const row = await env.DB.prepare(
        'SELECT * FROM workflows WHERE id = ?'
      ).bind(id).first() as WorkflowRow | null
      if (!row) return notFound('Workflow not found')
      return json({
        ok: true,
        workflow: {
          ...row,
          nodes: JSON.parse(row.nodes),
          edges: JSON.parse(row.edges),
        },
      })
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM workflows WHERE id = ?').bind(id).run()
      return json({ ok: true, deleted: id })
    }
  }

  return notFound('Unknown projects route')
}

// ─────────────────────────────────────────────────────────────
// Webhook receiver (KV + D1)
// ─────────────────────────────────────────────────────────────

async function handleWebhook(env: Env, request: Request, url: URL): Promise<Response> {
  const path = url.pathname
  // GET /api/webhooks — list all webhook IDs (from KV)
  if (path === '/api/webhooks' && request.method === 'GET') {
    if (!env.CACHE) return json({ error: 'KV not bound' }, 500)
    const list = await env.CACHE.list({ prefix: 'webhook:' })
    const ids = list.keys.map((k) => k.name.replace('webhook:', ''))
    return json({ ok: true, webhooks: ids })
  }

  const match = path.match(/^\/api\/webhook\/([\w-]+)$/)
  if (!match) return notFound('Unknown webhook route')

  const id = match[1]

  if (request.method === 'POST' || request.method === 'PUT') {
    // Store last 10 payloads in D1, plus latest in KV
    const body = await request.text()
    const ts = now()
    if (env.DB) {
      try {
        await env.DB.prepare(
          'INSERT INTO webhook_log (hook_id, body, received_at) VALUES (?, ?, ?)'
        ).bind(id, body, ts).run()
        // Trim to last 50
        await env.DB.prepare(
          `DELETE FROM webhook_log WHERE hook_id = ? AND id NOT IN (
             SELECT id FROM webhook_log WHERE hook_id = ? ORDER BY received_at DESC LIMIT 50
          )`
        ).bind(id, id).run()
      } catch {
        /* ignore — schema may not be ready */
      }
    }
    if (env.CACHE) {
      await env.CACHE.put(`webhook:${id}`, body)
      await env.CACHE.put(`webhook_ts:${id}`, String(ts))
    }
    return json({ ok: true, received: id, ts, size: body.length })
  }

  if (request.method === 'GET') {
    // Return latest payload + recent log
    let latest: string | null = null
    let latestTs: string | null = null
    if (env.CACHE) {
      latest = await env.CACHE.get(`webhook:${id}`)
      latestTs = await env.CACHE.get(`webhook_ts:${id}`)
    }
    let history: { body: string; received_at: number }[] = []
    if (env.DB) {
      const rows = await env.DB.prepare(
        'SELECT body, received_at FROM webhook_log WHERE hook_id = ? ORDER BY received_at DESC LIMIT 20'
      ).bind(id).all()
      history = (rows.results ?? []) as unknown as { body: string; received_at: number }[]
    }
    return json({ ok: true, hook_id: id, latest, latest_ts: latestTs, history })
  }

  if (request.method === 'DELETE') {
    if (env.CACHE) {
      await env.CACHE.delete(`webhook:${id}`)
      await env.CACHE.delete(`webhook_ts:${id}`)
    }
    if (env.DB) {
      await env.DB.prepare('DELETE FROM webhook_log WHERE hook_id = ?').bind(id).run()
    }
    return json({ ok: true, deleted: id })
  }

  return notFound('Method not allowed')
}

// ─────────────────────────────────────────────────────────────
// Text-to-workflow generator (Groq first, Workers AI fallback)
// ─────────────────────────────────────────────────────────────

const WORKFLOW_GEN_PROMPT = `You are a workflow generator for Brainwire. Output a JSON workflow ONLY.

Schema:
{
  "name": string,
  "nodes": [{ "id": string, "type": "chat"|"agent"|"tool", "toolId"?: string, "data": { "label"?: string, "role"?: string, "prompt"?: string }, "position": { "x": number, "y": number } }],
  "edges": [{ "id": string, "source": string, "target": string }]
}

Common tools: web-scraper, file-reader, speech, text-transform, json-tool, datetime, calculator, fetch-json, custom-script, parse-url, ocr, long-text-gen, pdf-tool, image-resize, thumbnail-gen, chart-js, d3-chart, ffmpeg, ffprobe, ytdlp, discord-send, telegram-send, notion-api, google-sheets, youtube-analytics.

Rules:
- Always include Chat + Agent nodes
- Wire Chat Out → Agent, then Agent Out → next tool
- Spread nodes 300px apart horizontally
- Output ONLY the JSON object, no markdown fences, no explanation

User request:`

async function handleAiWorkflow(env: Env, request: Request): Promise<Response> {
  const body = await request.json() as { prompt?: string; model?: string }
  const prompt = body.prompt?.trim()
  if (!prompt) return json({ error: 'prompt required' }, 400)

  const fullPrompt = `${WORKFLOW_GEN_PROMPT}\n\n${prompt}`

  // Try Groq first (faster + better for code generation)
  const groqKey = await getKey(env, 'GROQ_API_KEY')
  if (groqKey) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: body.model ?? 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: fullPrompt }],
          temperature: 0.4,
          response_format: { type: 'json_object' },
        }),
      })
      const data = await groqRes.json() as any
      const content = data.choices?.[0]?.message?.content
      if (content) {
        try {
          const workflow = JSON.parse(content)
          return json({ ok: true, source: 'groq', workflow })
        } catch {
          /* fall through */
        }
      }
    } catch {
      /* fall through to Workers AI */
    }
  }

  // Fallback to Workers AI — use llama-3.2-3b-instruct (current non-deprecated model)
  if (env.AI) {
    try {
      const aiResponse = await env.AI.run(
        '@cf/meta/llama-3.2-3b-instruct',
        {
          messages: [{ role: 'user', content: fullPrompt }],
          max_tokens: 4096,
        }
      ) as any
      // Workers AI may return either { response: string } or { choices: [{ message: { content: string } }] }
      let content: string | undefined
      if (typeof aiResponse?.response === 'string') {
        content = aiResponse.response
      } else if (typeof aiResponse?.choices?.[0]?.message?.content === 'string') {
        content = aiResponse.choices[0].message.content
      } else if (aiResponse?.response) {
        // Some models return an object — stringify it
        content = JSON.stringify(aiResponse.response)
      }
      if (content) {
        // Strip markdown code fences (```json ... ``` or ``` ... ```)
        const cleaned = content
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/i, '')
          .trim()
        // Extract first JSON object from response
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const workflow = JSON.parse(jsonMatch[0])
            return json({ ok: true, source: 'workers-ai', workflow })
          } catch {
            return json({ ok: false, error: 'Could not parse AI output as JSON', raw: cleaned })
          }
        }
      }
      return json({ ok: false, error: 'Workers AI returned no usable content', raw: aiResponse })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return json({ ok: false, error: 'Workers AI failed', detail: message }, 502)
    }
  }

  return json({ error: 'No AI backend available — set GROQ_API_KEY or bind Workers AI' }, 500)
}

// ─────────────────────────────────────────────────────────────
// Bulk sync (push/pull entire state)
// ─────────────────────────────────────────────────────────────

async function handleSync(env: Env, request: Request, url: URL): Promise<Response> {
  await ensureSchema(env)
  if (!env.DB) return json({ error: 'D1 not bound' }, 500)

  if (request.method === 'GET') {
    const projects = (await env.DB.prepare(
      'SELECT id, name, color, created_at, updated_at FROM projects ORDER BY updated_at DESC'
    ).all()).results ?? []
    const workflows = (await env.DB.prepare(
      'SELECT id, project_id, name, nodes, edges, created_at, updated_at FROM workflows ORDER BY updated_at DESC'
    ).all()).results ?? []

    // Parse nodes/edges back to objects
    const parsedWorkflows = workflows.map((w: any) => ({
      ...w,
      nodes: safeParse(w.nodes, []),
      edges: safeParse(w.edges, []),
    }))

    return json({ ok: true, projects, workflows: parsedWorkflows })
  }

  if (request.method === 'POST') {
    const body = await request.json() as {
      projects?: ProjectRow[]
      workflows?: WorkflowRow[]
    }
    const ts = now()
    const statements: D1PreparedStatement[] = []

    for (const p of body.projects ?? []) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO projects (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color, updated_at = excluded.updated_at`
        ).bind(p.id, p.name, p.color ?? '#8b5cf6', p.created_at ?? ts, ts)
      )
    }

    for (const w of body.workflows ?? []) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO workflows (id, project_id, name, nodes, edges, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             project_id = excluded.project_id,
             name = excluded.name,
             nodes = excluded.nodes,
             edges = excluded.edges,
             updated_at = excluded.updated_at`
        ).bind(
          w.id,
          w.project_id,
          w.name,
          typeof w.nodes === 'string' ? w.nodes : JSON.stringify(w.nodes ?? []),
          typeof w.edges === 'string' ? w.edges : JSON.stringify(w.edges ?? []),
          w.created_at ?? ts,
          ts
        )
      )
    }

    if (statements.length > 0) {
      await env.DB.batch(statements)
    }

    return json({
      ok: true,
      synced: { projects: body.projects?.length ?? 0, workflows: body.workflows?.length ?? 0 },
    })
  }

  return notFound('Method not allowed')
}

function safeParse(s: string, fallback: unknown): unknown {
  try { return JSON.parse(s) } catch { return fallback }
}

// ─────────────────────────────────────────────────────────────
// Background jobs (KV with TTL)
// ─────────────────────────────────────────────────────────────

async function handleJobs(env: Env, request: Request, url: URL): Promise<Response> {
  if (!env.CACHE) return json({ error: 'KV not bound' }, 500)
  const path = url.pathname

  if (request.method === 'POST' && path === '/api/jobs') {
    const body = await request.json() as { id?: string; status?: string; data?: unknown; ttl?: number }
    const id = body.id ?? uuid()
    const payload = JSON.stringify({ status: body.status ?? 'pending', data: body.data, updated_at: now() })
    const ttl = body.ttl ? Math.min(body.ttl, 86400) : 3600
    await env.CACHE.put(`job:${id}`, payload, { expirationTtl: ttl })
    return json({ ok: true, job_id: id })
  }

  const match = path.match(/^\/api\/jobs\/([\w-]+)$/)
  if (match) {
    const id = match[1]
    if (request.method === 'GET') {
      const raw = await env.CACHE.get(`job:${id}`)
      if (!raw) return notFound('Job not found (or expired)')
      return json({ ok: true, job_id: id, ...JSON.parse(raw) })
    }
    if (request.method === 'DELETE') {
      await env.CACHE.delete(`job:${id}`)
      return json({ ok: true, deleted: id })
    }
  }

  return notFound('Unknown jobs route')
}

// ─────────────────────────────────────────────────────────────
// Main Worker
// ─────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // Analytics (non-blocking)
    try {
      env.ANALYTICS?.writeDataPoint({
        blobs: [path, request.method],
        doubles: [Date.now()],
        indexes: [path.split('/')[2] ?? 'root'],
      })
    } catch {
      /* ignore */
    }

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    try {
      // ─── HEALTH ────────────────────────────────────────────
      if (path === '/api/health') {
        const features: Record<string, boolean> = {
          kv: Boolean(env.CACHE),
          r2: Boolean(env.STORAGE),
          d1: Boolean(env.DB),
          ai: Boolean(env.AI),
          analytics: Boolean(env.ANALYTICS),
          projects: Boolean(env.DB),
          webhooks: Boolean(env.CACHE),
          sync: Boolean(env.DB),
          aiWorkflow: Boolean(env.AI) || Boolean(await getKey(env, 'GROQ_API_KEY')),
        }
        const dynamicKeys: string[] = []
        if (env.CACHE) {
          try {
            const list = await env.CACHE.list({ prefix: 'apikey:' })
            for (const k of list.keys) {
              dynamicKeys.push(k.name.replace('apikey:', ''))
            }
          } catch {
            /* ignore */
          }
        }
        return json({
          ok: true,
          worker: 'brainwire',
          version: '2.0.0',
          time: new Date().toISOString(),
          features,
          dynamicKeys,
          hint: 'Multi-project sync enabled. See /api/projects, /api/workflows, /api/sync, /api/ytdlp, /api/ai/workflow, /api/webhook/:id',
        })
      }

      // ─── DYNAMIC KEYS: Store ───────────────────────────────
      if (path === '/api/keys' && request.method === 'POST') {
        if (!env.CACHE) return json({ error: 'KV binding (CACHE) not configured' }, 500)
        const body = await request.json() as { name?: string; value?: string }
        if (!body.name || !body.value) return json({ error: 'name and value required' }, 400)
        await env.CACHE.put(`apikey:${body.name}`, body.value)
        return json({ ok: true, stored: body.name })
      }

      // ─── DYNAMIC KEYS: List ────────────────────────────────
      if (path === '/api/keys' && request.method === 'GET') {
        if (!env.CACHE) return json({ error: 'KV binding (CACHE) not configured' }, 500)
        const list = await env.CACHE.list({ prefix: 'apikey:' })
        const names = list.keys.map((k) => k.name.replace('apikey:', ''))
        return json({ count: names.length, keys: names })
      }

      // ─── DYNAMIC KEYS: Get (masked) ────────────────────────
      if (path === '/api/keys/get' && request.method === 'GET') {
        if (!env.CACHE) return json({ error: 'KV binding (CACHE) not configured' }, 500)
        const name = url.searchParams.get('name')
        if (!name) return json({ error: 'name query param required' }, 400)
        const value = await env.CACHE.get(`apikey:${name}`)
        if (!value) return notFound('Key not found')
        const masked = value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value
        return json({ ok: true, name, masked, length: value.length })
      }

      // ─── DYNAMIC KEYS: Delete ──────────────────────────────
      if (path === '/api/keys' && request.method === 'DELETE') {
        if (!env.CACHE) return json({ error: 'KV binding (CACHE) not configured' }, 500)
        const name = url.searchParams.get('name')
        if (!name) return json({ error: 'name query param required' }, 400)
        await env.CACHE.delete(`apikey:${name}`)
        return json({ ok: true, deleted: name })
      }

      // ─── UNIVERSAL PROXY (POST) ────────────────────────────
      if (path === '/api/proxy' && request.method === 'POST') {
        const body = await request.json() as {
          url?: string
          method?: string
          headers?: Record<string, string>
          body?: unknown
        }
        if (!body.url) return json({ error: 'url required' }, 400)

        const headers: Record<string, string> = { ...(body.headers ?? {}) }
        const method = (body.method ?? 'GET').toUpperCase()
        await injectProviderAuth(env, body.url, headers)

        const init: RequestInit = { method, headers, redirect: 'follow' }
        if (method !== 'GET' && method !== 'HEAD' && body.body !== undefined) {
          init.body = typeof body.body === 'string' ? body.body : JSON.stringify(body.body)
        }

        try {
          const upstream = await fetch(body.url, init)
          const respHeaders = new Headers(upstream.headers)
          for (const [k, v] of Object.entries(CORS_HEADERS)) respHeaders.set(k, v)
          return new Response(upstream.body, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers: respHeaders,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return json({ error: 'Upstream failed', detail: message }, 502)
        }
      }

      // ─── UNIVERSAL PROXY (GET) ─────────────────────────────
      if (path === '/api/proxy' && request.method === 'GET') {
        const target = url.searchParams.get('url')
        if (!target) return json({ error: 'url query param required' }, 400)
        return proxyRequest(env, request, target)
      }

      // ─── PARALLEL MULTI ────────────────────────────────────
      if (path === '/api/multi' && request.method === 'POST') {
        const body = await request.json() as {
          requests?: Array<{ url: string; method?: string; headers?: Record<string, string>; body?: unknown }>
        }
        if (!Array.isArray(body.requests)) return json({ error: 'requests array required' }, 400)

        const limited = body.requests.slice(0, 10)
        const results = await Promise.all(
          limited.map(async (req) => {
            const headers: Record<string, string> = { ...(req.headers ?? {}) }
            await injectProviderAuth(env, req.url, headers)
            const method = (req.method ?? 'GET').toUpperCase()
            const init: RequestInit = { method, headers, redirect: 'follow' }
            if (method !== 'GET' && method !== 'HEAD' && req.body !== undefined) {
              init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
            }
            try {
              const up = await fetch(req.url, init)
              const text = await up.text()
              return { url: req.url, ok: up.ok, status: up.status, body: text.slice(0, 100_000) }
            } catch (err) {
              return { url: req.url, ok: false, error: err instanceof Error ? err.message : String(err) }
            }
          })
        )
        return json({ count: results.length, results })
      }

      // ─── CACHED PROXY ──────────────────────────────────────
      if (path === '/api/cached-proxy') {
        const target = url.searchParams.get('url')
        if (!target) return json({ error: 'url required' }, 400)
        const cache = caches.default
        const cacheKey = new Request(`https://cache.internal/${encodeURIComponent(target)}`)
        let response = await cache.match(cacheKey)
        if (!response) {
          response = await fetch(target)
          response = new Response(response.body, response)
          response.headers.set('Cache-Control', 'public, max-age=3600')
          await cache.put(cacheKey, response.clone())
        }
        return withCors(response)
      }

      // ─── YTDLP ─────────────────────────────────────────────
      if (path === '/api/ytdlp' && request.method === 'POST') {
        return handleYtDlp(env, request)
      }

      // ─── KAGGLE: Trigger ───────────────────────────────────
      if (path === '/api/kaggle/generate' && request.method === 'POST') {
        const username = await getKey(env, 'KAGGLE_USERNAME')
        const key = await getKey(env, 'KAGGLE_KEY')
        const slug = await getKey(env, 'KAGGLE_NOTEBOOK_SLUG')
        if (!username || !key || !slug) {
          return json({ error: 'Kaggle keys not configured. POST /api/keys to add them.' }, 500)
        }
        const body = await request.json() as {
          prompts: string[]
          outputType?: 'image' | 'video'
          steps?: number
          gpu?: boolean
        }
        const auth = btoa(`${username}:${key}`)
        const response = await fetch('https://www.kaggle.com/api/v1/kernels/push', {
          method: 'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            newTitle: `Brainwire ${Date.now()}`,
            text: '',
            language: 'python',
            kernelType: 'notebook',
            datasetDataSources: [],
            competitionDataSources: [],
            kernelDataSources: [],
            categoryIds: [],
            dockerImage: '',
            isPrivate: true,
            enableGpu: body.gpu !== false,
            enableInternet: true,
            enableTpu: false,
            environmentVariables: {
              PROMPTS: JSON.stringify(body.prompts ?? []),
              OUTPUT_TYPE: body.outputType ?? 'image',
              NUM_STEPS: String(body.steps ?? 30),
            },
          }),
        })
        return withCors(response)
      }

      // ─── KAGGLE: Status ────────────────────────────────────
      if (path === '/api/kaggle/status') {
        const username = await getKey(env, 'KAGGLE_USERNAME')
        const key = await getKey(env, 'KAGGLE_KEY')
        const slug = await getKey(env, 'KAGGLE_NOTEBOOK_SLUG')
        if (!username || !key || !slug) return json({ error: 'Kaggle keys not configured' }, 500)
        const auth = btoa(`${username}:${key}`)
        const response = await fetch(
          `https://www.kaggle.com/api/v1/kernels/status?kernelName=${slug}`,
          { headers: { Authorization: `Basic ${auth}` } }
        )
        return withCors(response)
      }

      // ─── KAGGLE: Output ────────────────────────────────────
      if (path === '/api/kaggle/output') {
        const username = await getKey(env, 'KAGGLE_USERNAME')
        const key = await getKey(env, 'KAGGLE_KEY')
        const slug = await getKey(env, 'KAGGLE_NOTEBOOK_SLUG')
        if (!username || !key || !slug) return json({ error: 'Kaggle keys not configured' }, 500)
        const auth = btoa(`${username}:${key}`)
        const response = await fetch(
          `https://www.kaggle.com/api/v1/kernels/output?kernelName=${slug}`,
          { headers: { Authorization: `Basic ${auth}` } }
        )
        return withCors(response)
      }

      // ─── GROQ: Chat ────────────────────────────────────────
      if (path === '/api/groq' && request.method === 'POST') {
        const key = await getKey(env, 'GROQ_API_KEY')
        const body = await request.text()
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key ?? ''}`,
            'Content-Type': 'application/json',
          },
          body,
        })
        return withCors(response)
      }

      // ─── GROQ: Audio ───────────────────────────────────────
      if (path === '/api/groq/audio' && request.method === 'POST') {
        const key = await getKey(env, 'GROQ_API_KEY')
        const body = await request.arrayBuffer()
        const contentType = request.headers.get('content-type') ?? 'audio/mpeg'
        const response = await fetch(
          'https://api.groq.com/openai/v1/audio/transcriptions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key ?? ''}`,
              'Content-Type': contentType,
            },
            body,
          }
        )
        return withCors(response)
      }

      // ─── YOUTUBE: Search ───────────────────────────────────
      if (path === '/api/youtube/search') {
        const q = url.searchParams.get('q')
        if (!q) return json({ error: 'q required' }, 400)
        const response = await fetch(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Cookie': 'SOCS=CAI; CONSENT=YES+cb',
            },
          }
        )
        return withCors(response)
      }

      // ─── YOUTUBE: Autocomplete ─────────────────────────────
      if (path === '/api/youtube/autocomplete') {
        const q = url.searchParams.get('q')
        if (!q) return json({ error: 'q required' }, 400)
        const response = await fetch(
          `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}`
        )
        return withCors(response)
      }

      // ─── YOUTUBE: Videos ───────────────────────────────────
      if (path === '/api/youtube/videos') {
        const key = await getKey(env, 'YOUTUBE_API_KEY')
        if (!key) return json({ error: 'YOUTUBE_API_KEY not set. POST /api/keys to add it.' }, 500)
        const ids = url.searchParams.get('ids') ?? ''
        const part = url.searchParams.get('part') ?? 'snippet,statistics,contentDetails,status'
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=${part}&id=${ids}&key=${key}`
        )
        return withCors(response)
      }

      // ─── YOINKU ────────────────────────────────────────────
      if (path === '/api/yoinku') {
        const key = await getKey(env, 'YOINKU_API_KEY')
        if (!key) return json({ error: 'YOINKU_API_KEY not set' }, 500)
        const videoId = url.searchParams.get('video_id')
        if (!videoId) return json({ error: 'video_id required' }, 400)
        const response = await fetch(
          `https://yoinku.com/api/v1/info?url=https://www.youtube.com/watch?v=${videoId}`,
          { headers: { 'x-api-key': key, 'Accept': 'application/json' } }
        )
        return withCors(response)
      }

      // ─── WORKERS AI: Text ──────────────────────────────────
      if (path === '/api/ai/generate' && request.method === 'POST') {
        if (!env.AI) return json({ error: 'Workers AI not bound' }, 500)
        const { prompt, model } = await request.json() as { prompt: string; model?: string }
        const response = await env.AI.run(
          model ?? '@cf/meta/llama-3.2-3b-instruct',
          { prompt }
        )
        return json(response)
      }

      // ─── WORKERS AI: Image ─────────────────────────────────
      if (path === '/api/ai/image' && request.method === 'POST') {
        if (!env.AI) return json({ error: 'Workers AI not bound' }, 500)
        const { prompt } = await request.json() as { prompt: string }
        const image = await env.AI.run(
          '@cf/stabilityai/stable-diffusion-xl-base-1.0',
          { prompt }
        )
        return new Response(image as ReadableStream, {
          headers: { ...CORS_HEADERS, 'Content-Type': 'image/png' },
        })
      }

      // ─── WORKERS AI: Embed ─────────────────────────────────
      if (path === '/api/ai/embed' && request.method === 'POST') {
        if (!env.AI) return json({ error: 'Workers AI not bound' }, 500)
        const { text } = await request.json() as { text: string }
        const response = await env.AI.run(
          '@cf/baai/bge-base-en-v1.5',
          { text: [text] }
        )
        return json(response)
      }

      // ─── AI WORKFLOW GENERATOR ────────────────────────────
      if (path === '/api/ai/workflow' && request.method === 'POST') {
        return handleAiWorkflow(env, request)
      }

      // ─── R2: Upload ────────────────────────────────────────
      if (path === '/api/storage/upload' && request.method === 'POST') {
        if (!env.STORAGE) return json({ error: 'R2 not bound' }, 500)
        const key = url.searchParams.get('key') ?? `file-${Date.now()}`
        const body = await request.arrayBuffer()
        await env.STORAGE.put(key, body)
        return json({ ok: true, key, size: body.byteLength })
      }

      // ─── R2: Download ──────────────────────────────────────
      if (path.startsWith('/api/storage/download/')) {
        if (!env.STORAGE) return json({ error: 'R2 not bound' }, 500)
        const key = path.replace('/api/storage/download/', '')
        const object = await env.STORAGE.get(key)
        if (!object) return json({ error: 'Not found' }, 404)
        return new Response(object.body, {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
          },
        })
      }

      // ─── R2: List ─────────────────────────────────────────
      if (path === '/api/storage/list' && request.method === 'GET') {
        if (!env.STORAGE) return json({ error: 'R2 not bound' }, 500)
        const cursor = url.searchParams.get('cursor') ?? undefined
        const listed = await env.STORAGE.list({ limit: 100, cursor })
        return json({
          ok: true,
          objects: listed.objects.map((o) => ({
            key: o.key,
            size: o.size,
            uploaded: o.uploaded.toISOString(),
          })),
          truncated: listed.truncated,
          cursor: listed.cursor,
        })
      }

      // ─── R2: Delete ───────────────────────────────────────
      if (path.startsWith('/api/storage/delete/') && request.method === 'DELETE') {
        if (!env.STORAGE) return json({ error: 'R2 not bound' }, 500)
        const key = path.replace('/api/storage/delete/', '')
        await env.STORAGE.delete(key)
        return json({ ok: true, deleted: key })
      }

      // ─── D1: Save ──────────────────────────────────────────
      if (path === '/api/db/save' && request.method === 'POST') {
        if (!env.DB) return json({ error: 'D1 not bound' }, 500)
        await ensureSchema(env)
        const { key, value } = await request.json() as { key: string; value: unknown }
        await env.DB.prepare(
          'INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, ?)'
        ).bind(key, JSON.stringify(value), Date.now()).run()
        return json({ ok: true })
      }

      // ─── D1: Get ───────────────────────────────────────────
      if (path === '/api/db/get') {
        if (!env.DB) return json({ error: 'D1 not bound' }, 500)
        const key = url.searchParams.get('key')
        const row = await env.DB.prepare(
          'SELECT value FROM kv WHERE key = ?'
        ).bind(key).first()
        return json(row ? JSON.parse(String(row.value)) : null)
      }

      // ─── D1: List ─────────────────────────────────────────
      if (path === '/api/db/list' && request.method === 'GET') {
        if (!env.DB) return json({ error: 'D1 not bound' }, 500)
        await ensureSchema(env)
        const prefix = url.searchParams.get('prefix') ?? ''
        const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500)
        const rows = prefix
          ? await env.DB.prepare(
              `SELECT key, updated_at FROM kv WHERE key LIKE ? ORDER BY updated_at DESC LIMIT ?`
            ).bind(`${prefix}%`, limit).all()
          : await env.DB.prepare(
              `SELECT key, updated_at FROM kv ORDER BY updated_at DESC LIMIT ?`
            ).bind(limit).all()
        return json({ ok: true, keys: rows.results ?? [] })
      }

      // ─── D1: Delete ───────────────────────────────────────
      if (path === '/api/db' && request.method === 'DELETE') {
        if (!env.DB) return json({ error: 'D1 not bound' }, 500)
        const key = url.searchParams.get('key')
        if (!key) return json({ error: 'key query param required' }, 400)
        await env.DB.prepare('DELETE FROM kv WHERE key = ?').bind(key).run()
        return json({ ok: true, deleted: key })
      }

      // ─── PROJECTS / WORKFLOWS (D1) ─────────────────────────
      if (path.startsWith('/api/projects') || path.startsWith('/api/workflows')) {
        return handleProjects(env, request, url)
      }

      // ─── WEBHOOKS ─────────────────────────────────────────
      if (path.startsWith('/api/webhook')) {
        return handleWebhook(env, request, url)
      }

      // ─── SYNC ─────────────────────────────────────────────
      if (path === '/api/sync') {
        return handleSync(env, request, url)
      }

      // ─── JOBS ─────────────────────────────────────────────
      if (path.startsWith('/api/jobs')) {
        return handleJobs(env, request, url)
      }

      // ─── STATIC ASSETS ─────────────────────────────────────
      return env.ASSETS.fetch(request)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return json({ error: 'Worker crash', detail: message }, 500)
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Cron Handler — periodic tasks
  // ─────────────────────────────────────────────────────────────
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const cronTime = new Date(controller.scheduledTime).toISOString()
    console.log(`Cron fired: ${controller.cron} at ${cronTime}`)

    ctx.waitUntil(
      (async () => {
        try {
          // Refresh daily data cache + cleanup expired jobs
          if (env.DB) {
            await env.DB.prepare(
              `DELETE FROM webhook_log WHERE received_at < ?`
            ).bind(Date.now() - 7 * 24 * 60 * 60 * 1000).run()
          }
          console.log('Daily maintenance completed')
        } catch (err) {
          console.error('Cron job failed:', err)
        }
      })()
    )
  },
}
