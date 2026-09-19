// Math LaTeX — render LaTeX math expressions to an SVG/PNG data URL.
// Uses MathJax from CDN.

import { waitForScriptTag, retryableLoad } from '../lib/scriptLoader'

interface MathJaxApi {
  tex2svgPromise: (expr: string) => Promise<HTMLElement>
}

const MATHJAX_SRC = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js'
const MATHJAX_LOAD_TIMEOUT_MS = 15_000

const mathjaxCache = { current: null as Promise<MathJaxApi> | null }

function getMathJaxFromWindow(): MathJaxApi | undefined {
  const w = window as unknown as { MathJax?: MathJaxApi }
  return w.MathJax
}

async function loadMathJax(): Promise<MathJaxApi> {
  const already = getMathJaxFromWindow()
  if (already) return already
  return retryableLoad(mathjaxCache, async () => {
    await waitForScriptTag({
      src: MATHJAX_SRC,
      marker: 'mathjax',
      label: 'MathJax',
      timeoutMs: MATHJAX_LOAD_TIMEOUT_MS,
    })
    // Wait for MathJax to be available (script loaded ≠ initialized)
    let tries = 0
    while (!getMathJaxFromWindow() && tries < 50) {
      await new Promise((r) => setTimeout(r, 100))
      tries++
    }
    const mj = getMathJaxFromWindow()
    if (!mj) throw new Error('MathJax failed to initialize')
    return mj
  })
}

export async function runMathLatex(input: string): Promise<string> {
  const expr = (input || '').trim()
  if (!expr) return '[math-latex error: empty input]'

  try {
    const MathJax = await loadMathJax()
    const result = await MathJax.tex2svgPromise(expr)
    const svg = result.querySelector('svg')
    if (!svg) return '[math-latex error: no SVG output]'
    const svgString = new XMLSerializer().serializeToString(svg)
    const encoded = encodeURIComponent(svgString)
    return `data:image/svg+xml,${encoded}`
  } catch (err) {
    return `[math-latex error: ${err instanceof Error ? err.message : String(err)}]`
  }
}
