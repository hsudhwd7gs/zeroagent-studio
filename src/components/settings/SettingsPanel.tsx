import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '../../stores/settingsStore'
import { useConfirmStore } from '../../stores/confirmStore'
import { AVAILABLE_LOCAL_MODELS, isWebGPUAvailable } from '../../engines/webllm'
import {
  OPENROUTER_FREE_ROUTER,
  getCachedOpenRouterFreeModels,
} from '../../engines/openrouter'
import { GROQ_MODELS } from '../../engines/groq'
import { TRANSFORMERS_MODELS } from '../../engines/transformers'
import { GEMINI_MODELS } from '../../engines/gemini'
import { getDefaultAgentBrain } from '../../lib/brainResolver'
import { getBrainDisplayName } from '../../lib/brainLabels'
import { listTools, isToolRequirementMet } from '../../tools/registry'
import { CloudPrivacyGuide } from './CloudPrivacyGuide'
import DataInventorySection from './DataInventorySection'
import WorkerKeyManager from './WorkerKeyManager'
import {
  KEY_PERSISTENCE_LOCAL_DESCRIPTION,
  KEY_PERSISTENCE_SESSION_DESCRIPTION,
} from '../../lib/keyPersistenceGuidance'
import {
  SETTINGS_HERO_RECOMMENDED,
  SETTINGS_LOCAL_FALLBACK_NOTE,
  SETTINGS_SKIP_KEYS_NOTE,
  TRANSFORMERS_SETTINGS_HINT,
  TRANSFORMERS_SETTINGS_SUBHEAD,
} from '../../lib/brainChoiceGuidance'

export default function SettingsPanel() {
  const isOpen = useSettingsStore((s) => s.isSettingsOpen)
  const closeSettings = useSettingsStore((s) => s.closeSettings)
  const apiKeys = useSettingsStore((s) => s.apiKeys)
  const keyPersistence = useSettingsStore((s) => s.keyPersistence)
  const settingsFocus = useSettingsStore((s) => s.settingsFocus)
  const setApiKey = useSettingsStore((s) => s.setApiKey)
  const setKeyPersistence = useSettingsStore((s) => s.setKeyPersistence)
  const clearApiKeys = useSettingsStore((s) => s.clearApiKeys)
  const replayPrivacyConsent = useSettingsStore((s) => s.openPrivacyConsentDialog)
  const replayAgentAdvice = useSettingsStore((s) => s.openAgentSetupAdviceDialog)
  const confirm = useConfirmStore((s) => s.confirm)
  const [savedFlash, setSavedFlash] = useState(false)

  const recommended = getDefaultAgentBrain(apiKeys)
  const freeModelCount = getCachedOpenRouterFreeModels().length

  const flashSaved = () => {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const handleKeyChange = (provider: keyof typeof apiKeys, value: string) => {
    setApiKey(provider, value)
    flashSaved()
  }

  const handlePersistenceChange = async (mode: 'session' | 'local') => {
    await setKeyPersistence(mode)
    flashSaved()
  }

  const handleClearKeys = async () => {
    const ok = await confirm({
      title: 'Clear all API keys?',
      message: 'This removes every key from this browser. You can paste them again anytime.',
      confirmLabel: 'Clear keys',
      variant: 'danger',
    })
    if (!ok) return
    await clearApiKeys()
    flashSaved()
  }

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, closeSettings])

  useEffect(() => {
    if (!isOpen || !settingsFocus) return
    const targetId =
      settingsFocus === 'privacy'
        ? 'settings-privacy-title'
        : settingsFocus === 'data'
          ? 'settings-data-section'
          : settingsFocus === 'keys'
            ? 'settings-api-keys-section'
            : null
    if (!targetId) return
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      useSettingsStore.setState({ settingsFocus: null })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [isOpen, settingsFocus])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSettings}
          />
          <motion.div
            className="settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-panel-title"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <div className="settings-header">
              <h2 id="settings-panel-title">Privacy &amp; keys</h2>
              <button className="close-btn" onClick={closeSettings} aria-label="Close">✕</button>
            </div>

            <div className="settings-body">
              <DataInventorySection
                onReplayPrivacyConsent={() => {
                  closeSettings()
                  replayPrivacyConsent()
                }}
                onReplayAgentAdvice={() => {
                  closeSettings()
                  replayAgentAdvice()
                }}
              />

              <div className="settings-hero">
                <strong>{SETTINGS_HERO_RECOMMENDED}</strong> {SETTINGS_LOCAL_FALLBACK_NOTE}
              </div>

              <section className="settings-section settings-free">
                <h3>Runs on your device — $0 forever</h3>
                <p className="settings-hint">
                  Use this section when you cannot or will not use a cloud key. For most people we still
                  recommend a free OpenRouter key in the section below for speed.
                </p>
                <p className="settings-recommended">
                  Best match for this computer:{' '}
                  <strong>{getBrainDisplayName(recommended.brain)}</strong>
                  {recommended.model ? (
                    <span className="settings-hint"> · model: {recommended.model}</span>
                  ) : null}
                </p>

                <h4 className="settings-subhead">{TRANSFORMERS_SETTINGS_SUBHEAD}</h4>
                <p className="settings-hint">{TRANSFORMERS_SETTINGS_HINT}</p>
                <ul className="model-list">
                  {TRANSFORMERS_MODELS.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>

                <h4 className="settings-subhead">WebLLM — slow local fallback (not recommended)</h4>
                <div className="webgpu-status">
                  Graphics acceleration:{' '}
                  {isWebGPUAvailable() ? (
                    <span className="status-ok">Available — you can use the faster local AI</span>
                  ) : (
                    <span className="status-warn">
                      Not available — use Transformers.js above (still $0)
                    </span>
                  )}
                </div>
                <ul className="model-list">
                  {AVAILABLE_LOCAL_MODELS.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </section>

              <section className="settings-section settings-security">
                <h3>How long should keys stay on this computer?</h3>
                <p className="settings-hint">
                  These are optional free-tier keys — not bank passwords — but it is still smart to
                  pick what fits where you are working. New users start on session storage (forget on
                  close) unless you change it here.
                </p>

                <label className="settings-radio">
                  <input
                    type="radio"
                    name="key-persistence"
                    checked={keyPersistence === 'session'}
                    onChange={() => void handlePersistenceChange('session')}
                  />
                  <span className="settings-radio-body">
                    <strong>Forget when I close the browser</strong>
                    <span className="settings-radio-badge">Recommended · default</span>
                    <p>{KEY_PERSISTENCE_SESSION_DESCRIPTION}</p>
                  </span>
                </label>

                <label className="settings-radio">
                  <input
                    type="radio"
                    name="key-persistence"
                    checked={keyPersistence === 'local'}
                    onChange={() => void handlePersistenceChange('local')}
                  />
                  <span className="settings-radio-body">
                    <strong>Remember on this device</strong>
                    <p>{KEY_PERSISTENCE_LOCAL_DESCRIPTION}</p>
                  </span>
                </label>
              </section>

              <section className="settings-section" id="settings-api-keys-section">
                <h3>API keys — optional cloud tiers</h3>
                <p className="settings-hint">
                  {SETTINGS_SKIP_KEYS_NOTE} Keys are stored only in <em>your</em> browser and sent to the
                  provider you chose when a cloud step runs — never to ZeroAgent Studio (we have no
                  servers).
                </p>

                <h4 className="settings-subhead">OpenRouter — recommended ($0 with free key)</h4>
                <p className="settings-hint">
                  Free account at{' '}
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                    openrouter.ai/keys
                  </a>
                  . Use <code>{OPENROUTER_FREE_ROUTER}</code> for auto-rotation across {freeModelCount}+
                  free models.
                </p>
                <input
                  type="password"
                  className="settings-input"
                  placeholder="sk-or-... (optional)"
                  value={apiKeys.openrouter ?? ''}
                  onChange={(e) => handleKeyChange('openrouter', e.target.value)}
                />
                <p className="settings-hint">
                  Free models cached: {OPENROUTER_FREE_ROUTER}, {getCachedOpenRouterFreeModels().slice(0, 3).join(', ')}…
                  {' · '}
                  <a href="https://openrouter.ai/settings/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy settings on OpenRouter
                  </a>
                </p>

                <h4 className="settings-subhead">Groq — fast responses, generous free tier</h4>
                <p className="settings-hint">
                  <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">
                    console.groq.com
                  </a>
                </p>
                <input
                  type="password"
                  className="settings-input"
                  placeholder="gsk_... (optional)"
                  value={apiKeys.groq ?? ''}
                  onChange={(e) => handleKeyChange('groq', e.target.value)}
                />
                <p className="settings-hint">
                  {GROQ_MODELS.join(', ')}
                  {' · '}
                  <a href="https://console.groq.com/docs/legal" target="_blank" rel="noopener noreferrer">
                    Groq legal &amp; privacy
                  </a>
                </p>

                <h4 className="settings-subhead">Gemini — Google&apos;s free API tier</h4>
                <p className="settings-hint">
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                    aistudio.google.com
                  </a>
                </p>
                <input
                  type="password"
                  className="settings-input"
                  placeholder="AIza... (optional)"
                  value={apiKeys.gemini ?? ''}
                  onChange={(e) => handleKeyChange('gemini', e.target.value)}
                />
                <p className="settings-hint">
                  {GEMINI_MODELS.join(', ')}
                  {' · '}
                  <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">
                    Gemini API terms (paid vs unpaid)
                  </a>
                </p>
              </section>

              <CloudPrivacyGuide />

              <section className="settings-section">
                <h3>Worker key vault — bulk add + sync</h3>
                <p className="settings-hint">
                  The keys above are stored in your browser only. The Worker Key Vault
                  below stores keys in the Cloudflare Worker KV (encrypted at rest) so
                  that any node — including the 30+ new ones (OpenAI, Anthropic, Mistral,
                  Cohere, GitHub, Notion, Slack, Kaggle, Colab, Pexels, Pixabay, etc.) —
                  can use them automatically when calling those providers.
                </p>
                <p className="settings-hint">
                  <strong>How it works:</strong> the worker auto-injects the matching
                  Authorization header based on the target hostname. Add as many keys
                  as you want — no redeploy needed.
                </p>
                <WorkerKeyManager workerOrigin={window.location.origin} />
              </section>

              <section className="settings-section">
                <h3>Tools using your keys</h3>
                <p className="settings-hint">
                  Cloud tools unlock when you paste the matching key above. Browser and Custom Script
                  tools always work without keys.
                </p>
                <ul className="model-list">
                  {listTools()
                    .filter((t) => t.requirement.kind === 'apiKey')
                    .map((t) => (
                      <li key={t.id}>
                        {t.label}
                        {isToolRequirementMet(t.requirement, apiKeys) ? (
                          <span className="status-ok"> — unlocked</span>
                        ) : (
                          <span className="status-warn"> — locked</span>
                        )}
                      </li>
                    ))}
                </ul>
              </section>

              <div className="settings-notice">
                <strong>Export reminder:</strong> Workflow <strong>Export</strong> never includes keys
                from this panel. It can still contain chat text and custom scripts — treat exports
                like sharing a diary.
              </div>
            </div>

            <div className="settings-footer settings-footer--split">
              <button type="button" className="settings-clear-btn" onClick={() => void handleClearKeys()}>
                Clear all keys
              </button>
              <button type="button" className="settings-save-btn" onClick={closeSettings}>
                {savedFlash ? '✓ Saved' : 'Done'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
