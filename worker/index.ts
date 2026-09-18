/**
 * ZeroAgent Studio — Universal Worker (Production Ready)
 * ======================================================
 *
 * Pure relay + dynamic API key management via KV.
 *
 * Features:
 *   • Universal proxy — any API, any method, any auth
 *   • Dynamic API keys — add/update from ZeroAgent UI, stored in KV
 *   • All Cloudflare free features (KV, R2, D1, Workers AI, Cron)
 *   • Auto-secret injection for 15+ providers
 *   • Zero computation — all heavy work on your PC or external APIs
 *
 * Endpoints:
 *   GET  /api/health                    → Status + enabled features
 *   POST /api/proxy                     → Universal proxy
 *   GET  /api/proxy?url=...             → Simple GET proxy
 *   POST /api/multi                     → Parallel requests (max 10)
 *   GET  /api/cached-proxy?url=...      → Cached GET via Cache API
 *   POST /api/keys                      → Store API key in KV (dynamic)
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
 *   POST /api/ai/embed                  → Workers AI embeddings
 *   POST /api/storage/upload?key=...    → R2 upload
 *   GET  /api/storage/download/{key}    → R2 download
 *   POST /api/db/save                   → D1 save key/value
 *   GET  /api/db/get?key=...            → D1 retrieve value
 *   *    /*                             → Static assets (ZeroAgent UI)
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Env {
  ASSETS: Fetcher
  // Optional Cloudflare bindings
  CACHE?: KVNamespace
  STORAGE?: R2Bucket
  DB?: D1Database
  AI?: Ai
  ANALYTICS?: AnalyticsEngineDataset
  // Static secrets (from Cloudflare dashboard)
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

// ─────────────────────────────────────────────────────────────
// Dynamic key resolution — KV first, then env
// ─────────────────────────────────────────────────────────────

async function getKey(env: Env, name: string): Promise<string | undefined> {
  // 1. Try KV first (dynamic keys added from ZeroAgent UI)
  if (env.CACHE) {
    try {
      const kvValue = await env.CACHE.get(`apikey:${name}`)
      if (kvValue) return kvValue
    } catch {
      /* ignore */
    }
  }
  // 2. Fall back to env (static dashboard secrets)
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

  // Groq
  if (host.endsWith('groq.com')) {
    const key = await getKey(env, 'GROQ_API_KEY')
    if (key) headers['Authorization'] = `Bearer ${key}`
  }

  // OpenRouter
  if (host.endsWith('openrouter.ai')) {
    const key = await getKey(env, 'OPENROUTER_API_KEY')
    if (key) headers['Authorization'] = `Bearer ${key}`
  }

  // Gemini (Google AI)
  if (host.endsWith('googleapis.com')) {
    const key = await getKey(env, 'GEMINI_API_KEY')
    if (key) headers['x-goog-api-key'] = key
  }

  // Yoinku
  if (host.endsWith('yoinku.com')) {
    const key = await getKey(env, 'YOINKU_API_KEY')
    if (key) headers['x-api-key'] = key
  }

  // Kaggle
  if (host.endsWith('kaggle.com')) {
    const username = await getKey(env, 'KAGGLE_USERNAME')
    const key = await getKey(env, 'KAGGLE_KEY')
    if (username && key) {
      headers['Authorization'] = `Basic ${btoa(`${username}:${key}`)}`
    }
  }

  // Notion
  if (host.endsWith('notion.com')) {
    const key = await getKey(env, 'NOTION_API_KEY')
    if (key) {
      headers['Authorization'] = `Bearer ${key}`
      headers['Notion-Version'] = '2022-06-28'
    }
  }

  // Slack
  if (host.endsWith('slack.com')) {
    const key = await getKey(env, 'SLACK_TOKEN')
    if (key) headers['Authorization'] = `Bearer ${key}`
  }

  // GitHub
  if (host.endsWith('github.com') || host.endsWith('api.github.com')) {
    const key = await getKey(env, 'GITHUB_TOKEN')
    if (key) {
      headers['Authorization'] = `Bearer ${key}`
      headers['Accept'] = 'application/vnd.github+json'
      headers['X-GitHub-Api-Version'] = '2022-11-28'
    }
  }

  // Resend
  if (host.endsWith('resend.com')) {
    const key = await getKey(env, 'RESEND_API_KEY')
    if (key) headers['Authorization'] = `Bearer ${key}`
  }

  // Generic: any SECRET_<hostname_with_underscores> in KV or env
  const normalizedHost = host.replace(/\./g, '_').toUpperCase()
  const genericKey = await getKey(env, `SECRET_${normalizedHost}`)
  if (genericKey) headers['Authorization'] = `Bearer ${genericKey}`
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
  if (!headers['User-Agent']) headers['User-Agent'] = 'ZeroAgent-Studio/1.0'

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
          worker: 'zeroagent-studio',
          time: new Date().toISOString(),
          features,
          dynamicKeys,
          hint: 'POST /api/keys {name, value} to add keys without redeploying',
        })
      }

      // ─── DYNAMIC KEYS: Store ───────────────────────────────
      if (path === '/api/keys' && request.method === 'POST') {
        if (!env.CACHE) return json({ error: 'KV binding (CACHE) not configured' }, 500)
        const body = await request.json() as { name?: string; value?: string }
        if (!body.name || !body.value) {
          return json({ error: 'name and value required' }, 400)
        }
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
            newTitle: `ZeroAgent ${Date.now()}`,
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
          model ?? '@cf/meta/llama-3.1-8b-instruct',
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

      // ─── D1: Save ──────────────────────────────────────────
      if (path === '/api/db/save' && request.method === 'POST') {
        if (!env.DB) return json({ error: 'D1 not bound' }, 500)
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

      // ─── STATIC ASSETS ─────────────────────────────────────
      return env.ASSETS.fetch(request)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return json({ error: 'Worker crash', detail: message }, 500)
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Cron Handler — uses ctx.waitUntil() to fix the lint error
  // ─────────────────────────────────────────────────────────────
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const cronTime = new Date(controller.scheduledTime).toISOString()
    console.log(`Cron fired: ${controller.cron} at ${cronTime}`)

    // ✅ ctx IS now used — via ctx.waitUntil() for background tasks
    ctx.waitUntil(
      (async () => {
        try {
          // Example: refresh a cached dataset daily
          const response = await fetch('https://api.example.com/daily-refresh')
          if (response.ok) {
            const data = await response.text()
            await env.CACHE?.put('daily-data', data, { expirationTtl: 86400 })
            console.log('Daily data cached successfully')
          }
        } catch (err) {
          console.error('Cron job failed:', err)
        }
      })()
    )
  },
}
