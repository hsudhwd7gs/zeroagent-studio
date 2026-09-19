import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ToastContext, toastEmitter, type Toast, type ToastTone } from './toast'

const TONE_ICONS: Record<ToastTone, string> = {
  success: '✓',
  info: 'ℹ',
  warn: '⚠',
  error: '✕',
}

const TONE_COLORS: Record<ToastTone, string> = {
  success: '#10b981',
  info: '#06b6d4',
  warn: '#f59e0b',
  error: '#ef4444',
}

export function ToastProvider({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { ...t, id }])
    const ttl = t.tone === 'error' ? 6000 : 3500
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, ttl)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  // Wire imperative emitter
  useEffect(() => {
    toastEmitter.emit = toast
    return () => {
      toastEmitter.emit = () => {}
    }
  }, [toast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast--${t.tone}`}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              onClick={() => dismiss(t.id)}
              role="alert"
            >
              <span className="toast-icon" style={{ color: TONE_COLORS[t.tone] }} aria-hidden>
                {TONE_ICONS[t.tone]}
              </span>
              <div className="toast-body">
                <div className="toast-message">{t.message}</div>
                {t.detail && <div className="toast-detail">{t.detail}</div>}
              </div>
              <button
                type="button"
                className="toast-close"
                aria-label="Dismiss"
                onClick={(e) => {
                  e.stopPropagation()
                  dismiss(t.id)
                }}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
