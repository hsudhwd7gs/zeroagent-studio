// Barcode Generator — uses the free Barcodelookup API or a client-side JsBarcode.
// We use JsBarcode (dynamic CDN import) to avoid any external API calls.

const JSBARCODE_URL = 'https://esm.sh/jsbarcode@3.11.6'

type JsBarcodeFn = (
  svg: Element,
  text: string,
  options: { format?: string; width?: number; height?: number; displayValue?: boolean }
) => void

let JsBarcodeRef: JsBarcodeFn | null = null
async function loadJsBarcode(): Promise<JsBarcodeFn> {
  if (JsBarcodeRef) return JsBarcodeRef
  const mod = (await import(/* @vite-ignore */ JSBARCODE_URL)) as { default?: JsBarcodeFn }
  const fn = mod.default
  if (typeof fn !== 'function') throw new Error('JsBarcode failed to load from CDN')
  JsBarcodeRef = fn
  return JsBarcodeRef
}

export async function runBarcodeGen(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = config.text?.trim() || input.trim()
  if (!text) throw new Error('text required')
  const format = config.format ?? 'CODE128'
  const width = parseInt(config.width ?? '2', 10)
  const height = parseInt(config.height ?? '100', 10)

  const JsBarcode = await loadJsBarcode()

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svgEl.style.position = 'absolute'
  svgEl.style.left = '-9999px'
  document.body.appendChild(svgEl)

  try {
    JsBarcode(svgEl, text, { format, width, height, displayValue: true })
    const svgString = new XMLSerializer().serializeToString(svgEl)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    return JSON.stringify({ ok: true, text, format, url }, null, 2)
  } finally {
    svgEl.remove()
  }
}
