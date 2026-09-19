// Math LaTeX — render LaTeX math expressions to an SVG/PNG data URL.
// Uses MathJax from CDN.

interface MathJaxApi {
  tex2svgPromise: (expr: string) => Promise<HTMLElement>
}

let mathjaxLoaded: Promise<MathJaxApi> | null = null

function getMathJaxFromWindow(): MathJaxApi | undefined {
  const w = window as unknown as { MathJax?: MathJaxApi }
  return w.MathJax
}

async function loadMathJax(): Promise<MathJaxApi> {
  if (mathjaxLoaded) return mathjaxLoaded
  mathjaxLoaded = (async () => {
    // Load MathJax v3 from CDN
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-mathjax]') as HTMLScriptElement | null
      if (existing) {
        if (getMathJaxFromWindow()) {
          resolve()
          return
        }
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Failed to load MathJax')))
        return
      }
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js'
      script.async = true
      script.dataset.mathjax = 'true'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load MathJax'))
      document.head.appendChild(script)
    })
    // Wait for MathJax to be available
    let tries = 0
    while (!getMathJaxFromWindow() && tries < 50) {
      await new Promise((r) => setTimeout(r, 100))
      tries++
    }
    const mj = getMathJaxFromWindow()
    if (!mj) throw new Error('MathJax failed to initialize')
    return mj
  })()
  return mathjaxLoaded
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
