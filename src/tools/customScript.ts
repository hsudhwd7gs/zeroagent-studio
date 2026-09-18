// Custom Script sandbox — PERMISSIVE MODE
//
// Everything is allowed EXCEPT the safety guards.
//   • Network: fetch, XMLHttpRequest, WebSocket, EventSource — ALLOWED
//   • Dynamic loading: importScripts, dynamic import() — ALLOWED
//   • Nesting: Worker, SharedWorker — ALLOWED
//   • Reflection: eval, Function constructor — ALLOWED
//   • Size limit: 256 KB
//   • Timeout: 10 minutes
//   • Memory guard: 500 MB (auto-kill)
//
// WARNING: CORS still applies to network calls. This worker runs on
// the same origin as your site (e.g. github.io), so most third-party
// APIs will still refuse the request unless they emit CORS headers.

export const CUSTOM_SCRIPT_MAX_BYTES = 256 * 1024
export const CUSTOM_SCRIPT_TIMEOUT_MS = 600_000
export const CUSTOM_SCRIPT_MAX_MEMORY_BYTES = 500 * 1024 * 1024
export const CUSTOM_SCRIPT_MEMORY_CHECK_MS = 1_000

export interface CustomScriptHelpers {
  jsonParse: (text: string) => unknown
  jsonStringify: (value: unknown) => string
  trim: (text: string) => string
  regex: (pattern: string, flags?: string) => RegExp
  sleep: (ms: number) => Promise<void>
  fetchText: (url: string, init?: RequestInit) => Promise<string>
  fetchJson: <T = unknown>(url: string, init?: RequestInit) => Promise<T>
}

export const CUSTOM_SCRIPT_HELPERS: CustomScriptHelpers = {
  jsonParse: (text) => JSON.parse(text),
  jsonStringify: (value) => JSON.stringify(value),
  trim: (text) => text.trim(),
  regex: (pattern, flags) => new RegExp(pattern, flags),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  fetchText: async (url, init) => {
    const r = await fetch(url, init)
    if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`)
    return r.text()
  },
  fetchJson: async <T = unknown>(url: string, init?: RequestInit) => {
    const r = await fetch(url, init)
    if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`)
    return (await r.json()) as T
  },
}

const encoder = new TextEncoder()

function byteLength(text: string): number {
  return encoder.encode(text).length
}

const WORKER_SOURCE = `
const SafePostMessage = self.postMessage.bind(self);
const SafeClose = self.close.bind(self);

let memoryTimer = null;
let isClosing = false;

const stopAll = (delayClose) => {
  if (memoryTimer !== null) {
    clearInterval(memoryTimer);
    memoryTimer = null;
  }
  if (isClosing) return;
  isClosing = true;
  if (delayClose) {
    // Give postMessage a tick to flush before we terminate.
    setTimeout(function () { try { SafeClose(); } catch (e) {} }, 50);
  } else {
    try { SafeClose(); } catch (e) {}
  }
};

const startMemoryGuard = (maxBytes, checkMs) => {
  if (typeof performance === 'undefined' || !performance.memory) return;
  memoryTimer = setInterval(function () {
    const used = performance.memory.usedJSHeapSize || 0;
    if (used > maxBytes) {
      SafePostMessage({
        ok: false,
        error: 'Memory limit exceeded (' + Math.round(used / 1048576) + ' MB > '
              + Math.round(maxBytes / 1048576) + ' MB)'
      });
      stopAll(true);
    }
  }, checkMs);
};

const capturedLogs = [];
const captureConsole = () => {
  const wrap = (level) => (...args) => {
    try {
      capturedLogs.push({
        level,
        args: args.map((a) => {
          if (a === null) return 'null';
          if (a === undefined) return 'undefined';
          if (typeof a === 'object') {
            try { return JSON.stringify(a); } catch (e) { return String(a); }
          }
          return String(a);
        })
      });
    } catch (e) {}
  };
  self.console = {
    log:   wrap('log'),
    info:  wrap('info'),
    warn:  wrap('warn'),
    error: wrap('error'),
    debug: wrap('debug'),
  };
};

self.onmessage = async (event) => {
  const data = event.data || {};
  const code = data.code;
  const input = data.input;
  const config = data.config;
  const maxMemoryBytes = data.maxMemoryBytes;
  const memoryCheckMs = data.memoryCheckMs;

  capturedLogs.length = 0;
  captureConsole();

  const helpers = {
    jsonParse: (text) => JSON.parse(text),
    jsonStringify: (value) => JSON.stringify(value),
    trim: (text) => text.trim(),
    regex: (pattern, flags) => new RegExp(pattern, flags),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    fetchText: async (url, init) => {
      const r = await self.fetch(url, init);
      if (!r.ok) throw new Error('HTTP ' + r.status + ' from ' + url);
      return r.text();
    },
    fetchJson: async (url, init) => {
      const r = await self.fetch(url, init);
      if (!r.ok) throw new Error('HTTP ' + r.status + ' from ' + url);
      return r.json();
    },
  };

  startMemoryGuard(maxMemoryBytes, memoryCheckMs);

  const startTime = performance.now();

  try {
    const fn = new Function(
      'input', 'config', 'helpers',
      'return (async () => {\\n' + code + '\\n})();'
    );

    const result = await fn(input, config, helpers);

    let out;
    if (result == null) out = '';
    else if (typeof result === 'string') out = result;
    else {
      try { out = JSON.stringify(result); }
      catch (e) { out = String(result); }
    }

    SafePostMessage({ ok: true, result: out });
    stopAll(true);
  } catch (err) {
    SafePostMessage({
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
    stopAll(true);
  }
};
`

export function validateCustomScript(script: string): void {
  if (!script.trim()) {
    throw new Error('Custom script is empty')
  }
  const bytes = byteLength(script)
  if (bytes > CUSTOM_SCRIPT_MAX_BYTES) {
    const kb = (CUSTOM_SCRIPT_MAX_BYTES / 1024).toFixed(0)
    throw new Error(
      `Script exceeds ${kb} KB limit (got ${(bytes / 1024).toFixed(1)} KB)`
    )
  }
}

export function runCustomScriptInWorker(
  script: string,
  input: string,
  config: Record<string, string>
): Promise<string> {
  validateCustomScript(script)

  return new Promise((resolve, reject) => {
    let worker: Worker | null = null
    let blobUrl: string | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let settled = false

    const cleanup = () => {
      if (timer !== null) { clearTimeout(timer); timer = null }
      try { if (worker) worker.terminate() } catch (e) {}
      try { if (blobUrl) URL.revokeObjectURL(blobUrl) } catch (e) {}
      worker = null
      blobUrl = null
    }

    const fail = (message: string) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(message))
    }

    const succeed = (value: string) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(value)
    }

    try {
      const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' })
      blobUrl = URL.createObjectURL(blob)
      worker = new Worker(blobUrl)
    } catch (err) {
      fail('Failed to create Custom Script worker: ' +
        (err instanceof Error ? err.message : String(err)))
      return
    }

    const minutes = Math.round(CUSTOM_SCRIPT_TIMEOUT_MS / 60_000)
    timer = setTimeout(() => {
      fail(`Custom script timed out after ${minutes} minutes`)
    }, CUSTOM_SCRIPT_TIMEOUT_MS)

    worker.onmessage = (event: MessageEvent<{
      ok: boolean
      result?: string
      error?: string
    }>) => {
      const data = event.data || { ok: false }
      if (data.ok) {
        succeed(data.result ?? '')
      } else {
        fail(data.error || 'Custom script failed')
      }
    }

    worker.onerror = (event: ErrorEvent) => {
      const detail = event && typeof event.message === 'string' && event.message
        ? event.message : 'unknown worker error'
      fail('Custom script worker error: ' + detail)
    }

    worker.onmessageerror = () => {
      fail('Custom script worker could not deserialize a message')
    }

    try {
      worker.postMessage({
        code: script,
        input,
        config,
        maxMemoryBytes: CUSTOM_SCRIPT_MAX_MEMORY_BYTES,
        memoryCheckMs: CUSTOM_SCRIPT_MEMORY_CHECK_MS,
      })
    } catch (err) {
      fail('Failed to send data to Custom Script worker: ' +
        (err instanceof Error ? err.message : String(err)))
    }
  })
}

export async function runCustomScript(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const script = config.script ?? ''
  return runCustomScriptInWorker(script, input, config)
}
