/**
 * Robust external <script> loader shared by CDN-backed tools
 * (MathJax, Mermaid, Pyodide).
 *
 * Fixes two failure modes the bare onload/onerror pattern has:
 *
 * 1. Hanging forever. Some environments never fire `load` OR `error`
 *    (jsdom without resource loading, captive portals, aggressive
 *    extension blockers). A hard timeout guarantees the promise settles.
 * 2. Reusing a script tag whose `load` event already fired. Attaching a
 *    listener after the fact never resolves — the timeout catches this too.
 *
 * The marker lets subsequent calls reuse an existing tag instead of
 * injecting duplicates.
 */

export interface WaitForScriptOptions {
  /** Script URL to inject when no existing tag is found. */
  src: string
  /** data-* marker attribute used to find/reuse an existing tag. */
  marker: string
  /** Hard cap in ms before giving up. Default 15s. */
  timeoutMs?: number
  /** Human-readable name used in error messages. */
  label: string
}

export function waitForScriptTag({
  src,
  marker,
  timeoutMs = 15_000,
  label,
}: WaitForScriptOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-${marker}]`
    ) as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')
    if (!existing) {
      script.src = src
      script.async = true
      script.dataset[marker] = 'true'
    }

    let settled = false
    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
      if (err) reject(err)
      else resolve()
    }

    const timer = setTimeout(
      () =>
        finish(
          new Error(
            `Timed out loading ${label} from CDN after ${Math.round(timeoutMs / 1000)}s — check your connection and run again`
          )
        ),
      timeoutMs
    )

    const onLoad = () => {
      // Mark the tag as loaded so later calls reuse it instantly.
      script.dataset.loaded = 'true'
      finish()
    }
    const onError = () =>
      finish(
        new Error(
          `Failed to load ${label} from CDN — you may be offline or an extension blocked it. Run again to retry`
        )
      )

    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)

    if (!existing) {
      document.head.appendChild(script)
    } else if (existing.dataset.loaded === 'true') {
      // A previous call already loaded this tag — resolve immediately.
      finish()
    }
  })
}

/**
 * Run `attempt` and cache it. If it fails, clear the cache so the NEXT call
 * retries from scratch instead of reusing the rejected promise forever.
 * (Without this, one offline moment bricks the tool until page reload.)
 */
export function retryableLoad<T>(
  cache: { current: Promise<T> | null },
  attempt: () => Promise<T>
): Promise<T> {
  if (cache.current) return cache.current
  const promise = attempt()
  cache.current = promise
  void promise.catch(() => {
    // Only reset if nobody has started a newer attempt.
    if (cache.current === promise) cache.current = null
  })
  return promise
}

/**
 * Load an HTMLImageElement with a hard timeout.
 *
 * The bare `img.onload = resolve; img.onerror = reject` pattern can hang
 * forever when a host stalls (neither event fires) and often rejects with a
 * raw Event instead of an Error. This always settles within `timeoutMs` and
 * always rejects with a real, descriptive Error.
 */
export function loadImageWithTimeout({
  src,
  timeoutMs = 20_000,
}: {
  src: string
  timeoutMs?: number
}): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    let settled = false
    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      img.onload = null
      img.onerror = null
      if (err) reject(err)
      else resolve(img)
    }
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            `Timed out loading image after ${Math.round(timeoutMs / 1000)}s: ${src.slice(0, 80)}`
          )
        ),
      timeoutMs
    )
    img.onload = () => finish()
    img.onerror = () =>
      finish(new Error(`Failed to load image (bad URL, offline, or CORS-blocked): ${src.slice(0, 80)}`))
    img.src = src
  })
}
