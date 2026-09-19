import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  waitForScriptTag,
  retryableLoad,
  loadImageWithTimeout,
} from '../../src/lib/scriptLoader'

describe('waitForScriptTag', () => {
  let listeners: Record<string, EventListener>
  let created: HTMLScriptElement[]

  beforeEach(() => {
    listeners = {}
    created = []
    document.querySelectorAll('script[data-testlib]').forEach((s) => s.remove())
    // Capture addEventListener on created script elements
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag)
      if (tag === 'script') {
        const origAdd = el.addEventListener.bind(el)
        vi.spyOn(el, 'addEventListener').mockImplementation(
          (type: string, listener: EventListenerOrEventListenerObject) => {
            listeners[type] = listener as EventListener
            origAdd(type, listener)
            return el
          }
        )
        created.push(el as HTMLScriptElement)
      }
      return el
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves when the script fires load', async () => {
    const promise = waitForScriptTag({ src: 'https://x/y.js', marker: 'testlib', label: 'TestLib' })
    expect(created.length).toBe(1)
    expect(created[0].src).toBe('https://x/y.js')
    listeners['load'](new Event('load'))
    await expect(promise).resolves.toBeUndefined()
    // Tag stays in the DOM for reuse
    expect(document.querySelector('script[data-testlib]')).toBeTruthy()
  })

  it('rejects with a clear message when the script fires error', async () => {
    const promise = waitForScriptTag({ src: 'https://x/y.js', marker: 'testlib', label: 'TestLib' })
    listeners['error'](new Event('error'))
    await expect(promise).rejects.toThrow('Failed to load TestLib from CDN')
  })

  it('NEVER hangs: rejects after the timeout when no event ever fires', async () => {
    vi.useFakeTimers()
    try {
      const promise = waitForScriptTag({
        src: 'https://x/y.js',
        marker: 'testlib',
        label: 'TestLib',
        timeoutMs: 1000,
      })
      const assertion = expect(promise).rejects.toThrow('Timed out loading TestLib')
      await vi.advanceTimersByTimeAsync(1100)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('reuses an existing script tag instead of injecting a duplicate', async () => {
    const existing = document.createElement('script')
    existing.dataset.testlib = 'true'
    existing.dataset.loaded = 'true' // marked by a previous successful call
    document.head.appendChild(existing)
    const before = document.querySelectorAll('script').length
    // dataset.loaded === 'true' → resolves immediately, no new tag injected
    await expect(
      waitForScriptTag({ src: 'https://x/y.js', marker: 'testlib', label: 'TestLib' })
    ).resolves.toBeUndefined()
    expect(document.querySelectorAll('script').length).toBe(before)
  })

  it('stops listening after settling (no double-fire errors)', async () => {
    vi.useFakeTimers()
    try {
      const promise = waitForScriptTag({
        src: 'https://x/y.js',
        marker: 'testlib',
        label: 'TestLib',
        timeoutMs: 5000,
      })
      // Attach the rejection handler BEFORE firing anything and before any
      // await — otherwise the rejection is briefly unhandled while the
      // event loop turns, which CI reports as an unhandled error.
      const assertion = expect(promise).rejects.toThrow('Failed to load TestLib')
      listeners['error'](new Event('error'))
      // Fire the timeout too — it must be a no-op after settling.
      await vi.advanceTimersByTimeAsync(6000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('retryableLoad', () => {
  it('caches the in-flight promise (single attempt for concurrent callers)', async () => {
    const cache = { current: null as Promise<number> | null }
    let attempts = 0
    const start = () =>
      new Promise<number>((r) => setTimeout(() => { attempts++; r(7) }, 10))
    const [a, b] = [retryableLoad(cache, start), retryableLoad(cache, start)]
    expect(await a).toBe(7)
    expect(await b).toBe(7)
    expect(attempts).toBe(1)
  })

  it('resets the cache after failure so the next call retries (no bricked tool)', async () => {
    const cache = { current: null as Promise<number> | null }
    let attempts = 0
    const failing = () => {
      attempts++
      return Promise.reject(new Error(`boom ${attempts}`))
    }
    await expect(retryableLoad(cache, failing)).rejects.toThrow('boom 1')
    // Cache must have been cleared — second call starts a NEW attempt
    await expect(retryableLoad(cache, failing)).rejects.toThrow('boom 2')
    expect(attempts).toBe(2)
  })

  it('does not reset a newer attempt when an old failure lands late', async () => {
    const cache = { current: null as Promise<number> | null }
    let attempts = 0
    const slowFail = () => {
      attempts++
      return attempts === 1
        ? new Promise<number>((_, rej) => setTimeout(() => rej(new Error('slow')), 50))
        : Promise.resolve(42)
    }
    const first = retryableLoad(cache, slowFail)
    await expect(first).rejects.toThrow('slow')
    const second = retryableLoad(cache, slowFail)
    expect(await second).toBe(42)
    expect(attempts).toBe(2)
  })
})

describe('loadImageWithTimeout', () => {
  it('rejects with a real Error (not a raw Event) when the image fails', async () => {
    await expect(loadImageWithTimeout({ src: 'not-a-url', timeoutMs: 500 })).rejects.toBeInstanceOf(
      Error
    )
  })

  it('NEVER hangs: rejects after the timeout when the host stalls', async () => {
    vi.useFakeTimers()
    try {
      // jsdom never fires onload/onerror for images — perfect stall simulation
      const promise = loadImageWithTimeout({ src: 'https://slow/stall.png', timeoutMs: 1000 })
      const assertion = expect(promise).rejects.toThrow('Timed out loading image')
      await vi.advanceTimersByTimeAsync(1100)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('resolves with the image element when it loads', async () => {
    // Stub the global Image so we can fire onload manually
    const instances: {
      onload: (() => void) | null
      onerror: (() => void) | null
      src: string
      crossOrigin?: string
    }[] = []
    const OrigImage = globalThis.Image
    class StubImage {
      crossOrigin: string | undefined
      src = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        instances.push(this)
      }
    }
    vi.stubGlobal('Image', StubImage)
    try {
      const promise = loadImageWithTimeout({ src: 'https://x/img.png' })
      expect(instances.length).toBe(1)
      expect(instances[0].src).toBe('https://x/img.png')
      expect(instances[0].crossOrigin).toBe('anonymous')
      instances[0].onload?.()
      const img = await promise
      expect(img).toBe(instances[0] as unknown as HTMLImageElement)
    } finally {
      vi.unstubAllGlobals()
      void OrigImage
    }
  })
})
