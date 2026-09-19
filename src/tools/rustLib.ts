// Rust Library Runner — executes pre-compiled Rust WASM modules.
//
// Loads .wasm files compiled from Rust (via wasm-pack), exposes
// their exported functions to ZeroAgent.

interface RustModule {
  instance: WebAssembly.Instance
  memory: WebAssembly.Memory
}

let cached: RustModule | null = null
let cachedUrl = ''

async function loadRustModule(url: string): Promise<RustModule> {
  if (cached && cachedUrl === url) return cached

  const res = await fetch(url)
  const bytes = await res.arrayBuffer()

  const imports = {
    env: {
      memory: new WebAssembly.Memory({ initial: 256 }),
      console_log: (v: number) => console.log('[Rust]', v),
    },
  }

  const { instance } = await WebAssembly.instantiate(bytes, imports)
  const memory = (instance.exports.memory as WebAssembly.Memory) || imports.env.memory

  cached = { instance, memory }
  cachedUrl = url
  return cached
}

export async function runRustLib(
  _input: string,
  config: Record<string, string>
): Promise<string> {
  const wasmUrl = config.wasmUrl?.trim()
  if (!wasmUrl) throw new Error('wasmUrl required')

  const fnName = config.functionName?.trim() || 'main'
  const argsJson = config.argsJson?.trim() || '[]'

  const mod = await loadRustModule(wasmUrl)

  const wasmExports = mod.instance.exports as Record<string, unknown>
  const fn = wasmExports[fnName]
  if (typeof fn !== 'function') {
    const available = Object.keys(wasmExports).filter((k) => typeof wasmExports[k] === 'function')
    throw new Error(`Function "${fnName}" not found. Available: ${available.join(', ')}`)
  }

  const args = JSON.parse(argsJson)
  const result = fn(...args)

  return JSON.stringify({
    ok: true,
    function: fnName,
    result,
    memorySize: mod.memory.buffer.byteLength,
  }, null, 2)
}
