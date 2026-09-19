// Browser Login — manage session cookies + credentials for real-user requests.
//
// Stores cookies in localStorage and includes them in requests.
// Never sends credentials to any server — everything stays in your browser.

interface StoredSession {
  cookies: string
  userAgent: string
  headers: Record<string, string>
  createdAt: number
}

const STORAGE_KEY = 'zeroagent.session'

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export async function runBrowserLogin(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const action = config.action ?? 'status'

  if (action === 'set') {
    const session: StoredSession = {
      cookies: config.cookies ?? '',
      userAgent: config.userAgent ?? navigator.userAgent,
      headers: config.headers ? JSON.parse(config.headers) : {},
      createdAt: Date.now(),
    }
    saveSession(session)
    return JSON.stringify({ ok: true, action: 'set', savedAt: session.createdAt })
  }

  if (action === 'get') {
    const session = loadSession()
    return JSON.stringify({ ok: true, session })
  }

  if (action === 'clear') {
    localStorage.removeItem(STORAGE_KEY)
    return JSON.stringify({ ok: true, action: 'clear' })
  }

  if (action === 'request') {
    const session = loadSession()
    if (!session) throw new Error('No session stored. Use action=set first.')

    const url = config.url?.trim() || input.trim()
    if (!url) throw new Error('No URL')

    const res = await fetch(url, {
      method: config.method ?? 'GET',
      headers: {
        ...session.headers,
        'Cookie': session.cookies,
        'User-Agent': session.userAgent,
        'Accept': 'application/json, text/html, */*',
      },
      body: config.body,
    })

    const text = await res.text()
    return JSON.stringify({
      ok: res.ok,
      status: res.status,
      headers: Object.fromEntries(res.headers),
      body: text.slice(0, 100_000),
    })
  }

  // status
  const session = loadSession()
  return JSON.stringify({
    ok: true,
    hasSession: !!session,
    createdAt: session?.createdAt,
    userAgent: session?.userAgent,
    cookieCount: session?.cookies ? session.cookies.split(';').length : 0,
  })
}
