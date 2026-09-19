import { useRef, useState, useEffect, useMemo, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useExecutionStore } from '../../stores/executionStore'
import { navigateTo } from '../../lib/appRoute'
import { useTutorialStore } from '../../stores/tutorialStore'
import { useConfirmStore } from '../../stores/confirmStore'
import { parseWorkflowExport } from '../../lib/workflowIo'
import { runWithDiscardGuard } from '../../lib/workflowGuard'
import { requestLoadExampleWorkflow } from '../../lib/exampleWorkflowLoad'
import {
  groupExampleWorkflows,
  getExampleKeyBadgeLabel,
  type ExampleWorkflowId,
} from '../../lib/exampleWorkflows'
import HeaderQuestMenu from './HeaderQuestMenu'
import ProjectSwitcher from './ProjectSwitcher'

export default function Header() {
  const workflowName = useWorkflowStore((s) => s.workflowName)
  const workflowId = useWorkflowStore((s) => s.workflowId)
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName)
  const isDirty = useWorkflowStore((s) => s.isDirty)
  const saveCurrentWorkflow = useWorkflowStore((s) => s.saveCurrentWorkflow)
  const newWorkflow = useWorkflowStore((s) => s.newWorkflow)
  const getWorkflowList = useWorkflowStore((s) => s.getWorkflowList)
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow)
  const exportWorkflowFile = useWorkflowStore((s) => s.exportWorkflowFile)
  const importWorkflowDocument = useWorkflowStore((s) => s.importWorkflowDocument)
  const openSettings = useSettingsStore((s) => s.openSettings)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const tutorialActive = useTutorialStore((s) => s.active)
  const alert = useConfirmStore((s) => s.alert)

  const importInputRef = useRef<HTMLInputElement>(null)
  const loadMenuRef = useRef<HTMLDivElement>(null)
  const examplesMenuRef = useRef<HTMLDivElement>(null)
  const [showLoadMenu, setShowLoadMenu] = useState(false)
  const [showExamplesMenu, setShowExamplesMenu] = useState(false)
  const [workflows, setWorkflows] = useState<{ id: number; name: string; updatedAt: number }[]>([])
  const exampleGroups = useMemo(() => groupExampleWorkflows(), [])
  const exampleCount = useMemo(
    () => exampleGroups.reduce((sum, group) => sum + group.items.length, 0),
    [exampleGroups]
  )

  const handleSave = async () => {
    await saveCurrentWorkflow()
  }

  const handleLoadList = async () => {
    const list = await getWorkflowList()
    setWorkflows(list)
    setShowLoadMenu(!showLoadMenu)
  }

  const handleLoad = async (id: number) => {
    await runWithDiscardGuard(
      async () => {
        await loadWorkflow(id)
        setShowLoadMenu(false)
      },
      {
        title: 'Load saved workflow?',
        message: 'Loading replaces the current canvas with the saved version.',
        confirmLabel: 'Load workflow',
        skipIf: () => workflowId === id && !isDirty,
      }
    )
  }

  const handleNew = () => {
    void runWithDiscardGuard(() => newWorkflow(), {
      title: 'Start a new workflow?',
      confirmLabel: 'Clear canvas',
    })
  }

  const handleExport = () => {
    exportWorkflowFile()
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    let text: string
    try {
      text = await file.text()
    } catch {
      await alert({
        title: 'Import failed',
        message: 'Could not read that file. Try another .json export.',
      })
      return
    }

    const parsed = parseWorkflowExport(text)
    if (!parsed.ok) {
      await alert({
        title: 'Invalid workflow file',
        message: parsed.error,
      })
      return
    }

    await runWithDiscardGuard(() => importWorkflowDocument(parsed.document), {
      title: 'Import workflow?',
      message: `Import "${parsed.document.workflow.name}" and replace the current canvas?`,
      confirmLabel: 'Import',
    })
  }

  const loadExample = (id: ExampleWorkflowId) => {
    void requestLoadExampleWorkflow(id)
    setShowExamplesMenu(false)
  }

  useEffect(() => {
    if (!showLoadMenu) return
    const onPointerDown = (e: MouseEvent) => {
      if (!loadMenuRef.current?.contains(e.target as Node)) setShowLoadMenu(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLoadMenu(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showLoadMenu])

  useEffect(() => {
    if (!showExamplesMenu) return
    const onPointerDown = (e: MouseEvent) => {
      if (!examplesMenuRef.current?.contains(e.target as Node)) setShowExamplesMenu(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowExamplesMenu(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showExamplesMenu])

  return (
    <header className="app-header">
      <input
        ref={importInputRef}
        type="file"
        accept=".json,.zeroagent.json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void handleImportFile(e)}
      />
      <div className="header-left">
        <motion.div
          className="logo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          role="button"
          tabIndex={0}
          onClick={() => navigateTo('studio')}
          onKeyDown={(e) => e.key === 'Enter' && navigateTo('studio')}
          style={{ cursor: 'pointer' }}
          title="Back to studio"
        >
          <span className="logo-icon">🔥</span>
          <div className="logo-stack">
            <span className="logo-text">ZeroAgent Studio</span>
            <span className="logo-tagline">$0 · runs in your browser</span>
          </div>
        </motion.div>
        <input
          className="workflow-name-input"
          data-tutorial-target="workflow-name"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          placeholder="Workflow name"
        />
        {isDirty && <span className="dirty-indicator">•</span>}
      </div>

      <div className="header-center">
        <ProjectSwitcher />
        <kbd className="header-hint" title="Open command palette">⌘K</kbd>
      </div>

      <div className="header-actions">
        <div className="header-group">
          <button className="header-btn" onClick={handleNew} disabled={isRunning}>
            New
          </button>
          <button className="header-btn" onClick={handleSave} disabled={isRunning}>
            Save
          </button>
          <div className="load-menu-wrapper" ref={loadMenuRef}>
            <button className="header-btn" onClick={handleLoadList} disabled={isRunning}>
              Load
            </button>
            <AnimatePresence>
              {showLoadMenu && (
                <motion.div
                  className="load-menu"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {workflows.length === 0 ? (
                    <div className="load-menu-empty">No saved workflows</div>
                  ) : (
                    workflows.map((w) => (
                      <button
                        key={w.id}
                        className="load-menu-item"
                        onClick={() => void handleLoad(w.id)}
                      >
                        <span>{w.name}</span>
                        <span className="load-menu-date">
                          {new Date(w.updatedAt).toLocaleDateString()}
                        </span>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            className="header-btn"
            onClick={handleImportClick}
            disabled={isRunning}
            title="Import a .zeroagent.json workflow file"
          >
            Import
          </button>
          <button
            className="header-btn"
            onClick={handleExport}
            disabled={isRunning}
            title="Download current canvas as .zeroagent.json"
          >
            Export
          </button>
        </div>
        <span className="header-divider" aria-hidden />
        <div className="header-group">
          <div className="load-menu-wrapper" ref={examplesMenuRef}>
            <button
              type="button"
              className="header-btn header-btn-legendary"
              onClick={() => setShowExamplesMenu((v) => !v)}
              disabled={isRunning || tutorialActive}
              aria-expanded={showExamplesMenu}
              aria-haspopup="true"
              aria-controls="examples-menu-panel"
            >
              Examples
            </button>
            <AnimatePresence>
              {showExamplesMenu && (
                <motion.div
                  id="examples-menu-panel"
                  className="load-menu load-menu--examples"
                  role="region"
                  aria-label="Example workflows"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <p className="load-menu-hint load-menu-hint--sticky">
                    {exampleCount} ready-made flows — replaces your canvas
                  </p>
                  {exampleGroups.map((group) => (
                    <div key={group.label} className="load-menu-section" role="group" aria-label={group.label}>
                      <p className="load-menu-section-label">{group.label}</p>
                      {group.items.map((ex) => {
                        const keyBadge = getExampleKeyBadgeLabel(ex.requiresKey)
                        return (
                          <button
                            key={ex.id}
                            type="button"
                            className={`load-menu-item load-menu-item--stacked ${ex.featured ? 'load-menu-item--featured' : ''}`}
                            onClick={() => loadExample(ex.id)}
                          >
                            <span className="load-menu-item-title-row">
                              <span className="load-menu-item-title">{ex.name}</span>
                              {keyBadge && (
                                <span className="load-menu-item-badge" aria-label={`Requires ${keyBadge}`}>
                                  {keyBadge}
                                </span>
                              )}
                            </span>
                            <span className="load-menu-date">{ex.description}</span>
                            <span className="load-menu-flow">{ex.flow}</span>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <HeaderQuestMenu disabled={isRunning || tutorialActive} />
        </div>
        <span className="header-divider" aria-hidden />
        <div className="header-group">
          <button className="header-btn" onClick={() => navigateTo('guide')}>
            Guide
          </button>
          <button
            className="header-btn header-btn-privacy"
            onClick={() => openSettings('data')}
            title="Privacy, stored data, and optional API keys"
            aria-label="Privacy and keys"
          >
            <span className="header-btn-icon" aria-hidden>
              🛡️
            </span>
            Privacy &amp; keys
          </button>
        </div>
        {isRunning && (
          <motion.span
            className="running-badge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Running...
          </motion.span>
        )}
      </div>
    </header>
  )
}
