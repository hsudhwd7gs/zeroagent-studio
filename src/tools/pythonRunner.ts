// Python Runner — executes Python 3.12 in the browser via Pyodide (WebAssembly).
//
// First run downloads ~20 MB (cached after that).
// Supports 200+ packages: pandas, NumPy, scikit-learn, Pillow, Matplotlib.
//
// Inside Python code:
//   • `input_text` variable = the text wired into this node
//   • Set `result` variable OR use print() to return output

const PYODIDE_VERSION = '0.26.2'
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

let pyodideInstance: unknown = null
let loadingPromise: Promise<unknown> | null = null

async function loadPyodide(): Promise<any> {
  if (pyodideInstance) return pyodideInstance
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    if (!(window as any).loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = `${PYODIDE_CDN}pyodide.js`
        script.onload = () => resolve()
        script.onerror = () =>
          reject(new Error('Failed to load Pyodide from CDN'))
        document.head.appendChild(script)
      })
    }

    const instance = await (window as any).loadPyodide({
      indexURL: PYODIDE_CDN,
    })

    pyodideInstance = instance
    return instance
  })()

  return loadingPromise
}

export async function runPython(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const code = config.code?.trim() || ''
  if (!code) throw new Error('No Python code provided')

  const pyodide = await loadPyodide()

  const packagesRaw = config.packages?.trim() || ''
  if (packagesRaw) {
    const packages = packagesRaw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)

    if (packages.length > 0) {
      try {
        await pyodide.loadPackage(packages)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        throw new Error(`Failed to load packages: ${message}`, { cause: err })
      }
    }
  }

  pyodide.globals.set('input_text', input)

  pyodide.runPython(`
import sys
from io import StringIO
_captured_output = StringIO()
sys.stdout = _captured_output
`)

  let result: unknown = undefined
  let pythonError: unknown = null

  try {
    result = await pyodide.runPythonAsync(code)
  } catch (err) {
    pythonError = err
  } finally {
    try {
      pyodide.runPython('sys.stdout = sys.__stdout__')
    } catch {
      void 0
    }
  }

  let captured = ''
  try {
    captured = pyodide.runPython('_captured_output.getvalue()') || ''
  } catch {
    void 0
  }

  if (pythonError) {
    const message =
      pythonError instanceof Error ? pythonError.message : String(pythonError)
    throw new Error(`Python error: ${message}`, { cause: pythonError })
  }

  if (result !== undefined && result !== null) {
    if (typeof result === 'string') return result
    try {
      return JSON.stringify(result, null, 2)
    } catch {
      return String(result)
    }
  }

  return captured || ''
}
