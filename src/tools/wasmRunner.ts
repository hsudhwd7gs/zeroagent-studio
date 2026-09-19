// WASM Runner — executes pre-compiled WebAssembly modules in the browser.
//
// Loads .wasm files from URLs, provides an import object, calls exported
// functions, and reads results from linear memory. Works with any language
// that compiles to WASM: Rust, C/C++, Go, Zig, AssemblyScript, etc.
//
// Config fields:
//   wasmUrl     — URL to the .wasm file (required)
//   functionName — exported function to call (default: "main")
//   argsJson    — JSON array of arguments (default: "[]")
//   resultType  — "auto" | "i32" | "f64" | "string" | "json" (default: "auto")

interface WasmExport {
  (…args: unknown[]): unknown
  [key: string]: unknown
}

interface WasmInstance {
  exports: WasmExport
  memory?: WebAssembly.Memory
}

interface WasmResult {
  ok: boolean
  result: unknown
  error?: string
  memorySize?: number
}

const DEFAULT_IMPORTS: WebAssembly.Imports = {
  env: {
    // Console logging from WASM (if the module imports it)
    console_log: (value: number) => console.log('[WASM]', value),
    console_log_string: (ptr: number, len: number) => {
      const memory = (window as any).__wasm_memory as WebAssembly.Memory | undefined
      if (!memory) return
      const bytes = new Uint8Array(memory.buffer, ptr, len)
      console.log('[WASM]', new TextDecoder().decode(bytes))
    },
    // Math functions (commonly imported)
    Math_sin: Math.sin,
    Math_cos: Math.cos,
    Math_tan: Math.tan,
    Math_exp: Math.exp,
    Math_log: Math.log,
    Math_sqrt: Math.sqrt,
    Math_pow: Math.pow,
    Math_floor: Math.floor,
    Math_ceil: Math.ceil,
    Math_abs: Math.abs,
    // Memory (WASM may import shared memory)
    memory: new WebAssembly.Memory({ initial: 256, maximum: 1024 }),
  },
}

function parseArgs(argsJson: string): unknown[] {
  if (!argsJson || argsJson.trim() === '') return []
  try {
    const parsed = JSON.parse(argsJson)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch (err) {
    throw new Error(`Invalid argsJson: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
  }
}

function readStringFromMemory(memory: WebAssembly.Memory, ptr: number, len: number): string {
  const bytes = new Uint8Array(memory.buffer, ptr, len)
  return new TextDecoder().decode(bytes)
}

async function loadWasm(wasmUrl: string): Promise<WasmInstance> {
  let response: Response
  try {
    response = await fetch(wasmUrl)
  } catch (err) {
    throw new Error(`Failed to fetch WASM from ${wasmUrl}: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch WASM: HTTP ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/wasm') && !wasmUrl.endsWith('.wasm')) {
    console.warn('WASM content-type may be incorrect:', contentType)
  }

  let instance: WebAssembly.Instance
  try {
    // Try streaming instantiation first (fastest)
    const result = await WebAssembly.instantiateStreaming(response.clone(), DEFAULT_IMPORTS)
    instance = result.instance
  } catch (streamErr) {
    // Fallback to arrayBuffer instantiation (for servers without correct MIME)
    console.warn('Streaming instantiation failed, falling back to buffer:', streamErr)
    const buffer = await response.arrayBuffer()
    const result = await WebAssembly.instantiate(buffer, DEFAULT_IMPORTS)
    instance = result.instance
  }

  const memory = (instance.exports.memory as WebAssembly.Memory) || DEFAULT_IMPORTS.env!.memory as WebAssembly.Memory
  ;(window as any).__wasm_memory = memory

  return {
    exports: instance.exports as unknown as WasmExport,
    memory,
  }
}

export async function runWasm(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const wasmUrl = config.wasmUrl?.trim() || input.trim()
  if (!wasmUrl) throw new Error('No WASM URL provided')

  const functionName = config.functionName?.trim() || 'main'
  const argsJson = config.argsJson?.trim() || '[]'
  const resultType = config.resultType?.trim() || 'auto'

  const wasm = await loadWasm(wasmUrl)

  if (typeof wasm.exports[functionName] !== 'function') {
    const available = Object.keys(wasm.exports).filter((k) => typeof wasm.exports[k] === 'function')
    throw new Error(`Function "${functionName}" not found. Available: ${available.join(', ') || 'none'}`)
  }

  const args = parseArgs(argsJson)

  let rawResult: unknown
  try {
    const fn = wasm.exports[functionName] as (...a: unknown[]) => unknown
    rawResult = fn(...args)
  } catch (err) {
    throw new Error(`WASM function "${functionName}" threw: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
  }

  // Handle string results (ptr + len convention)
  let result: unknown = rawResult

  if (resultType === 'string' || resultType === 'auto') {
    if (typeof rawResult === 'number' && wasm.memory) {
      // Try to read a null-terminated string starting at ptr
      try {
        const bytes = new Uint8Array(wasm.memory.buffer, rawResult, 1024)
        let end = 0
        while (end < bytes.length && bytes[end] !== 0) end++
        if (end > 0) {
          result = readStringFromMemory(wasm.memory, rawResult, end)
        }
      } catch {
        // Not a string pointer — keep as number
      }
    }
  }

  const output: WasmResult = {
    ok: true,
    result,
    memorySize: wasm.memory ? wasm.memory.buffer.byteLength : 0,
  }

  return JSON.stringify(output, null, 2)
}
