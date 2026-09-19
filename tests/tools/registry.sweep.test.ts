import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY } from '../../src/tools/registry'
import type { ToolDefinition } from '../../src/tools/registryTypes'

/**
 * Node-by-node runtime sweep.
 *
 * Runs EVERY tool that needs no API keys with a sample text input and empty
 * config. A tool "passes" when it either:
 *   - resolves with an output record whose keys match its DECLARED output
 *     port ids (the orchestrator routes by port id — a mismatched key would
 *     silently break downstream wiring), or
 *   - throws a proper Error (legit "needs config / unsupported here").
 *
 * A tool FAILS when it:
 *   - hangs (never settles within the per-tool timeout), or
 *   - resolves with an output record containing keys that are not declared
 *     output ports, or
 *   - resolves with a non-object / garbage shape.
 */

// Tools that open dialogs, grab the mic/camera, start listeners, wait on
// timers, or load heavy WASM/CDN payloads — skipping their run is the repo
// convention (see vitest exclude notes); their manifests are still validated
// by the catalog test.
const RUN_SKIP = new Set([
  'file-reader', // opens the OS file picker
  'speech', // microphone / speechSynthesis
  'browser-login', // window.open
  'terminal', // interactive terminal
  'delay', // sleeps
  'timer', // waits
  'scheduler', // interval
  'cron-trigger', // interval
  'webhook-receiver', // starts a listener
  'read-file-content', // file picker variant
  'clipboard', // clipboard permission prompt
  'audio-worklet', // WebAudio worklet loader
  'web-audio', // WebAudio loader
  'ffmpeg', // CDN wasm loader
  'ffprobe', // CDN wasm loader
  'wasm-runner', // wasm loader
  'rust-lib', // wasm loader
  'tfjs', // CDN tfjs loader
  'python-runner', // pyodide CDN loader
  'trendpy', // pyodide CDN loader
  'kaggle-notebook', // remote kernel
  'ytdlp', // native binary
  'audio-gen', // heavy loader
  'video-gen', // heavy loader
  'model-load', // model loader
  'mermaid-renderer', // CDN script loader (MathJax/mermaid/pyodide loaders are
  'math-latex', // jsdom-incompatible by repo convention; unit-tested in
  // tests/lib/scriptLoader.test.ts instead)
  'image-resize', // jsdom has no Image network loading — would wait on the
  'image-edit', // real-image onload that never fires in tests (canvas tools
  'thumbnail-gen', // throw cleanly via getContext null instead)
])

const SAMPLE_INPUTS: Record<string, string> = {
  default: 'hello world',
  json: '{"a":1,"b":{"c":2}}',
  array: '["a","b","c"]',
  numbers: '[3,1,2]',
  csv: 'name,score\nAda,99\nBob,88',
  html: '<html><body><h1>Title</h1><a href="https://x.com">link</a></body></html>',
  markdown: '# Title\n\nHello **world**',
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
  base64: 'aGkgd29ybGQ=',
}

function sampleInputFor(tool: ToolDefinition): string {
  const id = tool.id
  if (/(json|array|list)/.test(id)) return SAMPLE_INPUTS.json
  if (/csv/.test(id)) return SAMPLE_INPUTS.csv
  if (/html/.test(id)) return SAMPLE_INPUTS.html
  if (/markdown|md-/.test(id)) return SAMPLE_INPUTS.markdown
  if (/jwt/.test(id)) return SAMPLE_INPUTS.jwt
  if (/base64/.test(id)) return SAMPLE_INPUTS.base64
  if (/(math|calc|number|sum|average|clamp|min|max|mod|round|abs)/.test(id)) return '42'
  return SAMPLE_INPUTS.default
}

const PER_TOOL_TIMEOUT = 2000

function withTimeout<T>(promise: Promise<T>, toolId: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT: ${toolId} never settled`)), PER_TOOL_TIMEOUT)
    ),
  ])
}

describe('node-by-node runtime sweep (every keyless tool)', () => {
  it('every runnable tool settles and honors its declared output ports', async () => {
    const runnable = TOOL_REGISTRY.filter(
      (t) => t.requirement.kind === 'none' && !RUN_SKIP.has(t.id)
    )
    // Sanity: the sweep must actually cover the catalog, not silently skip it.
    expect(runnable.length).toBeGreaterThan(250)

    const failures: string[] = []
    let ran = 0
    let threw = 0

    for (const tool of runnable) {
      const input = sampleInputFor(tool)
      try {
        const outputs = await withTimeout(
          tool.run(
            { in: { type: 'text', value: input } },
            {},
            { apiKeys: {}, log: () => undefined }
          ),
          tool.id
        )
        ran++
        if (outputs === null || typeof outputs !== 'object' || Array.isArray(outputs)) {
          failures.push(`${tool.id}: resolved with non-object output ${JSON.stringify(outputs)?.slice(0, 60)}`)
          continue
        }
        const declaredOut = new Set(tool.outputs.map((p) => p.id))
        for (const key of Object.keys(outputs)) {
          if (!declaredOut.has(key)) {
            failures.push(
              `${tool.id}: returned output key "${key}" but declared outputs are [${[...declaredOut].join(', ')}]`
            )
          }
        }
        if (Object.keys(outputs).length === 0) {
          failures.push(`${tool.id}: resolved with an EMPTY output record`)
        }
        for (const [key, value] of Object.entries(outputs)) {
          if (value === null || typeof value !== 'object' || typeof (value as { value?: unknown }).value !== 'string') {
            failures.push(`${tool.id}: output "${key}" is not a PortValue`)
          }
        }
      } catch (err) {
        // A thrown Error is an acceptable outcome (missing config, no canvas
        // in jsdom, etc.) — as long as it is a real Error with a message.
        threw++
        if (!(err instanceof Error) || !err.message) {
          failures.push(`${tool.id}: threw a non-Error garbage value: ${String(err).slice(0, 80)}`)
        }
        if (err instanceof Error && err.message.startsWith('TIMEOUT')) {
          failures.push(`${tool.id}: HUNG — never settled within ${PER_TOOL_TIMEOUT}ms`)
        }
      }
    }

    expect(
      {
        total: runnable.length,
        resolved: ran,
        threwCleanError: threw,
        failures,
      },
      `runtime sweep failures:\n${failures.join('\n')}`
    ).toEqual({ total: runnable.length, resolved: ran, threwCleanError: threw, failures: [] })
  }, 120_000)
})
