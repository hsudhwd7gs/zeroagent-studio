// Python Runner — executes Python 3.12 in the browser via Pyodide (WebAssembly).
//
// First run downloads ~20 MB (cached after that).
// Supports 200+ packages: pandas, NumPy, scikit-learn, Pillow, Matplotlib.
//
// Inside Python code:
//   • `input_text` variable = the text wired into this node
//   • Set `result` variable OR use print() to return output

import { waitForScriptTag, retryableLoad } from '../lib/scriptLoader'

const PYODIDE_VERSION = '0.26.2'
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`
const PYODIDE_SCRIPT_TIMEOUT_MS = 20_000
const PYODIDE_INIT_TIMEOUT_MS = 180_000 // first run downloads ~20 MB

// Minimal Pyodide interface — only the methods we actually call
interface PyodideInstance {
  loadPackage: (packages: string[]) => Promise<void>
  globals: {
    set: (name: string, value: unknown) => void
  }
  runPython: (code: string) => unknown
  runPythonAsync: (code: string) => Promise<unknown>
}

// Augment window with loadPyodide
interface WindowWithPyodide extends Window {
  loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInstance>
}

let pyodideInstance: PyodideInstance | null = null
const pyodideCache = { current: null as Promise<PyodideInstance> | null }

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

async function loadPyodide(): Promise<PyodideInstance> {
  if (pyodideInstance) return pyodideInstance
  return retryableLoad(pyodideCache, async (): Promise<PyodideInstance> => {
    const win = window as WindowWithPyodide

    if (!win.loadPyodide) {
      await waitForScriptTag({
        src: `${PYODIDE_CDN}pyodide.js`,
        marker: 'pyodide',
        label: 'Pyodide',
        timeoutMs: PYODIDE_SCRIPT_TIMEOUT_MS,
      })
    }

    if (!win.loadPyodide) {
      throw new Error('Pyodide script loaded but loadPyodide is not defined')
    }

    const instance = await withTimeout(
      win.loadPyodide({ indexURL: PYODIDE_CDN }),
      PYODIDE_INIT_TIMEOUT_MS,
      'Pyodide took too long to start (first run downloads ~20 MB) — check your connection and run again'
    )

    pyodideInstance = instance
    return instance
  })
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
    const capturedRaw = pyodide.runPython('_captured_output.getvalue()')
    captured = typeof capturedRaw === 'string' ? capturedRaw : ''
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
