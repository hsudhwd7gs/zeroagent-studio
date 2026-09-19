// Toast shared plumbing — types, context, hook, and imperative emitter.
// Kept separate from ToastProvider.tsx so the component file only exports
// components (react-refresh/only-export-components) and non-React modules
// (stores, lib) can emit toasts without importing React components.

import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'info' | 'warn' | 'error'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
  detail?: string
}

export interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return { toast: () => {} }
  }
  return ctx
}

/** Imperative emit — used by non-React modules (stores, lib). */
export const toastEmitter: { emit: (t: Omit<Toast, 'id'>) => void } = {
  emit: () => {},
}
