import { motion } from 'framer-motion'
import { navigateTo } from '../../lib/appRoute'
import { useSettingsStore } from '../../stores/settingsStore'

export default function GuideHeader() {
  const openSettings = useSettingsStore((s) => s.openSettings)

  return (
    <header className="guide-header">
      <div className="guide-header-left">
        <motion.button
          type="button"
          className="guide-back-btn"
          onClick={() => navigateTo('studio')}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -2 }}
        >
          ← Back to Studio
        </motion.button>
        <div className="guide-header-brand">
          <span className="logo-icon">🔥</span>
          <div className="logo-stack">
            <span className="logo-text">Brainwire</span>
            <span className="guide-header-sub">How to use it</span>
          </div>
        </div>
      </div>
      <div className="guide-header-actions">
        <motion.button
          type="button"
          className="header-btn header-btn-privacy"
          onClick={() => openSettings('data')}
          title="Privacy, stored data, and optional API keys"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="header-btn-icon" aria-hidden>
            🛡️
          </span>
          Privacy &amp; keys
        </motion.button>
        <motion.button
          type="button"
          className="header-btn accent"
          onClick={() => navigateTo('studio')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Open Studio
        </motion.button>
      </div>
    </header>
  )
}
