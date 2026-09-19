// Mermaid Renderer — convert Mermaid diagram syntax to an SVG data URL.
// Loads mermaid from CDN via a script tag on first use.

interface MermaidApi {
  render: (id: string, code: string) => Promise<{ svg: string }>
  initialize: (config: unknown) => void
}

let mermaidLoaded: Promise<MermaidApi> | null = null

function getMermaidFromWindow(): MermaidApi | undefined {
  const w = window as unknown as { mermaid?: MermaidApi }
  return w.mermaid
}

async function loadMermaid(): Promise<MermaidApi> {
  if (mermaidLoaded) return mermaidLoaded
  mermaidLoaded = (async () => {
    // Load mermaid from CDN via script tag
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-mermaid]') as HTMLScriptElement | null
      if (existing) {
        if (getMermaidFromWindow()) {
          resolve()
          return
        }
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Failed to load Mermaid')))
        return
      }
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js'
      script.async = true
      script.dataset.mermaid = 'true'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Mermaid from CDN'))
      document.head.appendChild(script)
    })

    // Wait for mermaid to be available
    let tries = 0
    while (!getMermaidFromWindow() && tries < 50) {
      await new Promise((r) => setTimeout(r, 100))
      tries++
    }
    const mermaid = getMermaidFromWindow()
    if (!mermaid) throw new Error('Mermaid failed to initialize')
    mermaid.initialize({ startOnLoad: false, theme: 'dark' })
    return mermaid
  })()
  return mermaidLoaded
}

export async function runMermaidRenderer(input: string): Promise<string> {
  const code = (input || '').trim()
  if (!code) return '[mermaid error: empty input]'
  try {
    const mermaid = await loadMermaid()
    const { svg } = await mermaid.render('mmd-' + Date.now(), code)
    const encoded = encodeURIComponent(svg)
    return `data:image/svg+xml,${encoded}`
  } catch (err) {
    return `[mermaid error: ${err instanceof Error ? err.message : String(err)}]`
  }
}
