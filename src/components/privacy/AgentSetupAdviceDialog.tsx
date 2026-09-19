import { motion } from 'framer-motion'
import { KEY_STORAGE_ONBOARDING_NOTE } from '../../lib/keyPersistenceGuidance'

interface AgentSetupAdviceDialogProps {
  onAccept: () => void
  onOpenSettings: () => void
}

export default function AgentSetupAdviceDialog({
  onAccept,
  onOpenSettings,
}: AgentSetupAdviceDialogProps) {
  return (
    <>
      <motion.div
        className="privacy-consent-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <div className="privacy-consent-anchor">
        <motion.div
          className="privacy-consent-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agent-setup-advice-title"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        >
          <h2 id="agent-setup-advice-title">Want fast Agent results? Here&apos;s our honest advice</h2>
          <p className="privacy-consent-lead">
            WebLLM runs entirely in your browser — which sounds great — but for <strong>Agent</strong>{' '}
            steps in real workflows it is usually the slowest option. The first run also downloads a
            large model (often hundreds of MB), so it can feel like installing software before you get
            a single useful reply.
          </p>
          <p className="privacy-consent-note">
            <strong>
              We strongly recommend not using WebLLM for Agent blocks when you care about speed and
              workflow quality.
            </strong>{' '}
            For snappy multi-step workflows, a free cloud key is almost always best — OpenRouter is our
            usual pick. Transformers.js is the honest local path when you skip signup or cloud.
          </p>
          <ul className="privacy-consent-list">
            <li>
              <strong>Free API keys (recommended)</strong> — OpenRouter is our usual free pick for speed
              (no local download). Groq and Gemini also offer free tiers. Read each provider&apos;s
              privacy settings first, then paste a key in <strong>Privacy &amp; keys</strong>.
            </li>
            <li>
              <strong>Transformers.js</strong> — local, no key. First use downloads a small model;
              slower than cloud and can feel sluggish on old hardware, but typically faster than WebLLM.
            </li>
          </ul>
          <ul className="privacy-consent-list privacy-consent-link-list">
            <li>
              <strong>OpenRouter</strong> —{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                openrouter.ai/keys
              </a>
              {' · '}
              <a
                href="https://openrouter.ai/settings/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                privacy settings
              </a>
            </li>
            <li>
              <strong>Groq</strong> —{' '}
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">
                console.groq.com
              </a>
              {' · '}
              <a href="https://console.groq.com/docs/legal" target="_blank" rel="noopener noreferrer">
                legal / terms
              </a>
            </li>
            <li>
              <strong>Gemini</strong> —{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                aistudio.google.com
              </a>
              {' · '}
              <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">
                API terms
              </a>
            </li>
          </ul>
          <p className="privacy-consent-note">{KEY_STORAGE_ONBOARDING_NOTE}</p>
          <p className="privacy-consent-note">
            When you are ready, open <strong>Privacy &amp; keys</strong> in the header to paste a key
            and review cloud provider checklists.
          </p>
          <div className="privacy-consent-actions">
            <button type="button" className="privacy-consent-btn primary" onClick={onAccept}>
              Got it
            </button>
            <button type="button" className="privacy-consent-btn" onClick={onOpenSettings}>
              Open Privacy &amp; keys
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}
