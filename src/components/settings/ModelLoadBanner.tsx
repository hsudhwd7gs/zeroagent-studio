import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useModelLoadStore } from '../../stores/modelLoadStore'

/**
 * Banner that shows progress when Transformers.js / WebLLM is downloading
 * a model on first use.
 *
 * Adds:
 *  - Dismiss button — hides the banner without cancelling the download.
 *    The download continues in the background so the next attempt to use
 *    the model still works.
 *  - Stuck detection — if progress hasn't moved in 60s, surface a hint
 *    to refresh or switch engines.
 */
export default function ModelLoadBanner() {
  const isLoading = useModelLoadStore((s) => s.isLoading)
  const engineName = useModelLoadStore((s) => s.engineName)
  const progress = useModelLoadStore((s) => s.progress)
  const statusText = useModelLoadStore((s) => s.statusText)
  const reset = useModelLoadStore((s) => s.reset)

  const [userDismissed, setUserDismissed] = useState(false)
  const [stuckSeconds, setStuckSeconds] = useState(0)

  // Track progress changes to detect stalls. Timestamps live in refs (never in
  // render state) so nothing impure runs during render and no setState fires
  // synchronously inside effects.
  const lastProgressRef = useRef(-1)
  const lastProgressAtRef = useRef(0)

  useEffect(() => {
    if (progress !== lastProgressRef.current) {
      lastProgressRef.current = progress
      lastProgressAtRef.current = Date.now()
    }
  }, [progress, isLoading])

  // Reset transient state whenever a load finishes (adjust-during-render pattern).
  const [prevLoading, setPrevLoading] = useState(isLoading)
  if (isLoading !== prevLoading) {
    setPrevLoading(isLoading)
    if (!isLoading) {
      setUserDismissed(false)
      setStuckSeconds(0)
    }
  }

  // Tick every second to update stuckSeconds
  useEffect(() => {
    if (!isLoading || userDismissed) return
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastProgressAtRef.current) / 1000)
      setStuckSeconds(elapsed)
    }, 1000)
    return () => window.clearInterval(id)
  }, [isLoading, userDismissed])

  // Auto-dismiss when load completes
  useEffect(() => {
    if (progress >= 1) {
      const t = window.setTimeout(() => setUserDismissed(false), 1500)
      return () => window.clearTimeout(t)
    }
  }, [progress])

  const showStuckWarning = stuckSeconds > 60 && progress < 1

  return (
    <AnimatePresence>
      {isLoading && !userDismissed && (
        <motion.div
          className="model-load-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="model-load-header">
            <span>First-time AI download — {engineName}</span>
            <span className="model-load-percent">{Math.round(progress * 100)}%</span>
            <button
              type="button"
              className="model-load-dismiss"
              aria-label="Hide download banner (download continues in background)"
              title="Hide banner — download continues in background"
              onClick={() => setUserDismissed(true)}
            >
              ✕
            </button>
          </div>
          <div className="model-load-bar">
            <div className="model-load-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          {statusText && <div className="model-load-status">{statusText}</div>}
          {showStuckWarning && (
            <div className="model-load-stuck-warning">
              Download seems stuck (no progress for {stuckSeconds}s). Try refreshing the page,
              or switch to a cloud engine in Privacy &amp; keys for a faster start.
              <button
                type="button"
                className="model-load-stuck-action"
                onClick={() => {
                  setUserDismissed(true)
                  reset()
                }}
              >
                Dismiss
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
