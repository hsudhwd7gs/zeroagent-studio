import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/header/Header'
import NodePalette from './components/sidebar/NodePalette'
import NodeInspector from './components/inspector/NodeInspector'
import FlowCanvas from './components/canvas/FlowCanvas'
import SettingsPanel from './components/settings/SettingsPanel'
import ModelLoadBanner from './components/settings/ModelLoadBanner'
import WelcomeBanner from './components/onboarding/WelcomeBanner'
import TutorialOverlay from './components/tutorial/TutorialOverlay'
import PrivacyConsentDialog from './components/privacy/PrivacyConsentDialog'
import AgentSetupAdviceDialog from './components/privacy/AgentSetupAdviceDialog'
import ConfirmDialog from './components/dialog/ConfirmDialog'
import DebugTerminal from './components/debugger/DebugTerminal'
import GuideHeader from './components/guide/GuideHeader'
import GuidePage from './components/guide/GuidePage'
import CommandPalette from './components/cmdk/CommandPalette'
import { useSettingsStore } from './stores/settingsStore'
import { useWorkflowStore } from './stores/workflowStore'
import { useProjectStore } from './stores/projectStore'
import { useTutorialStore } from './stores/tutorialStore'
import { useAppRoute } from './hooks/useAppRoute'
import {
  APP_STORAGE_CLEARED_EVENT,
  WELCOME_DISMISSED_KEY,
  hasPrivacyConsent,
  markPrivacyConsent,
  hasAgentSetupAdvice,
  markAgentSetupAdvice,
} from './lib/appStorage'
import './index.css'

function handleGitHubPagesRedirect() {
  const params = new URLSearchParams(window.location.search)
  const path = params.get('p')
  if (path) {
    const query = params.get('q')
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const newUrl =
      base +
      normalizedPath +
      (query ? '?' + query.replace(/~and~/g, '&') : '') +
      window.location.hash
    window.history.replaceState(null, '', newUrl)
  }
}

export default function App() {
  const route = useAppRoute()
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const openSettings = useSettingsStore((s) => s.openSettings)
  const privacyConsentOpen = useSettingsStore((s) => s.privacyConsentOpen)
  const closePrivacyConsentDialog = useSettingsStore((s) => s.closePrivacyConsentDialog)
  const agentAdviceOpen = useSettingsStore((s) => s.agentAdviceOpen)
  const closeAgentSetupAdviceDialog = useSettingsStore((s) => s.closeAgentSetupAdviceDialog)
  const showLaunchSplash = useTutorialStore((s) => s.showLaunchSplash)
  const showLaunchSplashAction = useTutorialStore((s) => s.showLaunchSplashAction)
  const nodes = useWorkflowStore((s) => s.nodes)
  const saveCurrentWorkflow = useWorkflowStore((s) => s.saveCurrentWorkflow)
  const initProjects = useProjectStore((s) => s.init)
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem(WELCOME_DISMISSED_KEY) === '1'
  )
  const [onboardingReady, setOnboardingReady] = useState(false)
  const [needsFirstConsent, setNeedsFirstConsent] = useState(false)
  const [needsFirstAgentAdvice, setNeedsFirstAgentAdvice] = useState(false)
  const [cmdkOpen, setCmdkOpen] = useState(false)

  const showPrivacyConsent = privacyConsentOpen || needsFirstConsent
  const showAgentAdvice =
    !showPrivacyConsent && (agentAdviceOpen || needsFirstAgentAdvice)

  const proceedAfterOnboardingDialogs = useCallback(() => {
    if (!hasAgentSetupAdvice()) {
      setNeedsFirstAgentAdvice(true)
      return
    }
    setOnboardingReady(true)
  }, [])

  const handleLaunchSplashDone = useCallback(() => {
    if (!hasPrivacyConsent()) {
      setNeedsFirstConsent(true)
      return
    }
    if (!hasAgentSetupAdvice()) {
      setNeedsFirstAgentAdvice(true)
      return
    }
    setOnboardingReady(true)
  }, [])

  const finishPrivacyConsent = useCallback(() => {
    if (needsFirstConsent) {
      markPrivacyConsent()
      setNeedsFirstConsent(false)
      proceedAfterOnboardingDialogs()
    }
    closePrivacyConsentDialog()
  }, [needsFirstConsent, closePrivacyConsentDialog, proceedAfterOnboardingDialogs])

  const finishAgentAdvice = useCallback(() => {
    if (needsFirstAgentAdvice) {
      markAgentSetupAdvice()
      setNeedsFirstAgentAdvice(false)
      setOnboardingReady(true)
    }
    closeAgentSetupAdviceDialog()
  }, [needsFirstAgentAdvice, closeAgentSetupAdviceDialog])

  const handlePrivacyOpenSettings = useCallback(() => {
    finishPrivacyConsent()
    openSettings('data')
  }, [finishPrivacyConsent, openSettings])

  const handleAgentAdviceOpenSettings = useCallback(() => {
    finishAgentAdvice()
    openSettings('keys')
  }, [finishAgentAdvice, openSettings])

  const showWelcome =
    route === 'studio' &&
    onboardingReady &&
    !welcomeDismissed &&
    nodes.length === 0 &&
    !showPrivacyConsent &&
    !showAgentAdvice &&
    !showLaunchSplash

  const suppressCanvasOnboarding =
    showWelcome || showLaunchSplash || showPrivacyConsent || showAgentAdvice

  useEffect(() => {
    handleGitHubPagesRedirect()
    void loadSettings()
    void initProjects()
    showLaunchSplashAction()
  }, [loadSettings, initProjects, showLaunchSplashAction])

  // ── Global keyboard shortcuts ───────────────────────────────────
  // Cmd/Ctrl-K  → command palette
  // Cmd/Ctrl-S  → save (prevent default browser save)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'k') {
        e.preventDefault()
        setCmdkOpen((v) => !v)
      }
      if (meta && e.key === 's') {
        e.preventDefault()
        void saveCurrentWorkflow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveCurrentWorkflow])

  useEffect(() => {
    const onStorageCleared = (event: Event) => {
      const detail = (event as CustomEvent<{ categories: string[] }>).detail
      if (detail.categories.includes('ui-preferences')) {
        setWelcomeDismissed(false)
      }
      if (!hasPrivacyConsent()) {
        setNeedsFirstConsent(true)
      }
      if (!hasAgentSetupAdvice()) {
        setNeedsFirstAgentAdvice(true)
      }
    }
    window.addEventListener(APP_STORAGE_CLEARED_EVENT, onStorageCleared)
    return () => window.removeEventListener(APP_STORAGE_CLEARED_EVENT, onStorageCleared)
  }, [])

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, '1')
    setWelcomeDismissed(true)
  }

  if (route === 'guide') {
    return (
      <div className="app app--guide">
        <div className="bg-gradient" />
        <div className="bg-grid" />
        <GuideHeader />
        <GuidePage />
        <SettingsPanel />
        <ConfirmDialog />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="bg-gradient" />
      <div className="bg-grid" />
      <Header />
      <ModelLoadBanner />
      <TutorialOverlay onLaunchSplashDone={handleLaunchSplashDone} />
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
      <AnimatePresence>
        {showPrivacyConsent && (
          <PrivacyConsentDialog
            key="privacy-consent"
            onAccept={finishPrivacyConsent}
            onOpenSettings={handlePrivacyOpenSettings}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAgentAdvice && (
          <AgentSetupAdviceDialog
            key="agent-setup-advice"
            onAccept={finishAgentAdvice}
            onOpenSettings={handleAgentAdviceOpenSettings}
          />
        )}
      </AnimatePresence>
      {showWelcome && <WelcomeBanner onDismiss={dismissWelcome} />}
      <motion.main
        className="app-main"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <NodePalette />
        <FlowCanvas suppressEmptyState={suppressCanvasOnboarding} />
        <NodeInspector />
      </motion.main>
      <DebugTerminal />
      <SettingsPanel />
      <ConfirmDialog />
    </div>
  )
}
