import { useSettingsStore } from '../../stores/settingsStore'
import { navigateTo } from '../../lib/appRoute'
import { requestLoadQuickStartExample } from '../../lib/exampleWorkflowLoad'
import { getQuestCatalog, type TutorialQuestId } from '../../lib/tutorialQuests'
import { startQuestWithGuard } from '../../lib/startQuestWithGuard'

interface WelcomeBannerProps {
  onDismiss: () => void
}

export default function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  const openSettings = useSettingsStore((s) => s.openSettings)
  const quests = getQuestCatalog()
  const basicsQuests = quests.filter((q) => q.category === 'basics')
  const advancedCount = quests.length - basicsQuests.length

  const startQuest = (questId: TutorialQuestId) => {
    onDismiss()
    void startQuestWithGuard(questId)
  }

  const loadHelloAgent = () => {
    void requestLoadQuickStartExample(onDismiss)
  }

  return (
    <div className="welcome-banner">
      <div className="welcome-hero">
        <span className="welcome-fire" aria-hidden>
          🔥
        </span>
        <div className="welcome-hero-copy">
          <h2 className="welcome-title">You deserve AI that doesn&apos;t cost money</h2>
          <p className="welcome-text">
            <strong>Recommended:</strong> paste a free <strong>OpenRouter</strong> key for fast replies
            — no local model download, works on any computer with internet. Prefer no signup or fully
            local inference? <strong>Transformers.js</strong> runs in your browser; the first
            reply may wait while a small model downloads and older hardware can feel sluggish. Try header{' '}
            <strong>Examples</strong> for ready-made flows, or pick a guided quest below — everything is
            free to start.
          </p>
        </div>
        <button type="button" className="welcome-close" onClick={onDismiss} aria-label="Dismiss welcome">
          ✕
        </button>
      </div>

      <div className="welcome-quest-grid">
        {basicsQuests.map((q) => (
          <button
            key={q.id}
            type="button"
            className={`welcome-quest-card ${q.featured ? 'featured' : ''}`}
            onClick={() => startQuest(q.id)}
          >
            <span className="welcome-quest-step">{q.step}</span>
            <span className="welcome-quest-card-title">{q.shortLabel}</span>
            <span className="welcome-quest-card-flow">{q.flow}</span>
            <span className="welcome-quest-card-desc">{q.description}</span>
          </button>
        ))}
      </div>
      {advancedCount > 0 && (
        <p className="welcome-quest-more">
          +{advancedCount} more in header <strong>Quests</strong> — Writer&apos;s room, URL detective, Voice booth, and Capture desk.
        </p>
      )}

      <div className="welcome-footer">
        <button type="button" className="welcome-footer-btn" onClick={loadHelloAgent}>
          Try Hello, Agent
        </button>
        <span className="welcome-footer-dot" aria-hidden>
          ·
        </span>
        <button type="button" className="welcome-footer-btn" onClick={() => openSettings()}>
          Add OpenRouter key
        </button>
        <span className="welcome-footer-dot" aria-hidden>
          ·
        </span>
        <button type="button" className="welcome-footer-btn" onClick={() => navigateTo('guide')}>
          How does this work?
        </button>
      </div>
    </div>
  )
}
