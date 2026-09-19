// Mermaid Renderer — convert Mermaid diagram syntax to an SVG data URL.
// Loads mermaid from CDN via a script tag on first use.

import { waitForScriptTag, retryableLoad } from '../lib/scriptLoader'

interface MermaidApi {
  render: (id: string, code: string) => Promise<{ svg: string }>
  initialize: (config: unknown) => void
}

const MERMAID_SRC = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js'
const MERMAID_LOAD_TIMEOUT_MS = 15_000

const mermaidCache = { current: null as Promise<MermaidApi> | null }

function getMermaidFromWindow(): MermaidApi | undefined {
  const w = window as unknown as { mermaid?: MermaidApi }
  return w.mermaid
}

async function loadMermaid(): Promise<MermaidApi> {
  const already = getMermaidFromWindow()
  if (already) return already
  return retryableLoad(mermaidCache, async () => {
    await waitForScriptTag({
      src: MERMAID_SRC,
      marker: 'mermaid',
      label: 'Mermaid',
      timeoutMs: MERMAID_LOAD_TIMEOUT_MS,
    })

    // Wait for mermaid to be available (script loaded ≠ initialized)
    let tries = 0
    while (!getMermaidFromWindow() && tries < 50) {
      await new Promise((r) => setTimeout(r, 100))
      tries++
    }
    const mermaid = getMermaidFromWindow()
    if (!mermaid) throw new Error('Mermaid failed to initialize')
    mermaid.initialize({ startOnLoad: false, theme: 'dark' })
    return mermaid
  })
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
