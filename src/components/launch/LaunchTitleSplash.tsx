import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import './launch-splash.css'

interface LaunchTitleSplashProps {
  onDone: () => void
}

export default function LaunchTitleSplash({ onDone }: LaunchTitleSplashProps) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const ms = reduceMotion ? 800 : 2800
    const timer = window.setTimeout(onDone, ms)
    return () => window.clearTimeout(timer)
  }, [onDone, reduceMotion])

  return (
    <motion.div
      className="launch-splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.35 }}
      aria-live="polite"
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-splash-title"
    >
      <div className="launch-splash-glow" aria-hidden />
      <motion.div
        className="launch-splash-card"
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94, y: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.98, y: reduceMotion ? 0 : 6 }}
        transition={{ duration: reduceMotion ? 0.1 : 0.35, ease: 'easeOut' }}
      >
        <p className="launch-splash-welcome">Welcome to</p>
        <h1 id="launch-splash-title" className="launch-splash-title">
          Brainwire
        </h1>
        <p className="launch-splash-tagline">runs in your browser · your workflows, your rules</p>
      </motion.div>
    </motion.div>
  )
}
