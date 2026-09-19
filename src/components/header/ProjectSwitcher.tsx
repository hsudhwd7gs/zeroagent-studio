import { useRef, useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProjectStore } from '../../stores/projectStore'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useConfirmStore } from '../../stores/confirmStore'
import type { Project } from '../../types'

const PRESET_COLORS = [
  '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#3b82f6', '#14b8a6',
]

export default function ProjectSwitcher() {
  const projects = useProjectStore((s) => s.projects)
  const current = useProjectStore((s) => s.currentProject)
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)
  const createProject = useProjectStore((s) => s.createProject)
  const renameProject = useProjectStore((s) => s.renameProject)
  const removeProject = useProjectStore((s) => s.removeProject)
  const isLoaded = useProjectStore((s) => s.isLoaded)
  const newWorkflow = useWorkflowStore((s) => s.newWorkflow)
  const confirm = useConfirmStore((s) => s.confirm)

  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[1])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleSelect = async (id: string) => {
    if (id === current.id) {
      setOpen(false)
      return
    }
    // Switch the project — and load the latest workflow in the new project (if any)
    await setCurrentProject(id)
    setOpen(false)

    // Try to load the most recent workflow in the new project.
    // If none exists, start a fresh canvas.
    try {
      const { getWorkflowList, loadWorkflow, newWorkflow, hasCanvasWork } =
        await import('../../stores/workflowStore').then((m) => m.useWorkflowStore.getState())
      const list = await getWorkflowList()
      if (list.length > 0) {
        await loadWorkflow(list[0].id)
      } else if (!hasCanvasWork()) {
        newWorkflow()
      } else {
        // User has unsaved work — keep it but it will save into the new project.
        // Clear the workflowId so save creates a new entry in the new project.
        const { useWorkflowStore } = await import('../../stores/workflowStore')
        useWorkflowStore.setState({ workflowId: null, isDirty: true })
      }
    } catch (err) {
      console.warn('Could not auto-load workflow on project switch:', err)
    }
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    await createProject(name, newColor, '◆')
    setNewName('')
    setNewColor(PRESET_COLORS[1])
    setCreating(false)
    setOpen(false)
    // Start a fresh workflow in the new project
    newWorkflow()
  }

  const handleRenameSave = async (id: string) => {
    const name = editName.trim()
    if (name) await renameProject(id, name)
    setEditingId(null)
    setEditName('')
  }

  const handleDelete = async (p: Project) => {
    const confirmed = await confirm({
      title: `Delete project "${p.name}"?`,
      message:
        'All workflows in this project will be moved to your Personal project. This cannot be undone.',
      confirmLabel: 'Delete project',
      variant: 'danger',
    })
    if (!confirmed) return
    await removeProject(p.id)
  }

  const chip = useMemo(() => {
    if (!isLoaded) return null
    return (
      <button
        type="button"
        className="project-chip"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        style={{ '--project-color': current.color } as React.CSSProperties}
        title={`Current project: ${current.name}`}
      >
        <span className="project-chip-emoji">{current.emoji ?? '◆'}</span>
        <span className="project-chip-name">{current.name}</span>
        <span className="project-chip-caret" aria-hidden>▾</span>
      </button>
    )
  }, [current, isLoaded, open])

  return (
    <div className="project-switcher" ref={ref}>
      {chip}
      <AnimatePresence>
        {open && (
          <motion.div
            className="project-switcher-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="project-switcher-header">
              <span>Projects</span>
              <button
                type="button"
                className="project-switcher-add"
                onClick={() => setCreating((v) => !v)}
                aria-label="New project"
              >
                + New
              </button>
            </div>

            <AnimatePresence>
              {creating && (
                <motion.div
                  className="project-create-form"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <input
                    autoFocus
                    type="text"
                    placeholder="Project name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCreate()
                      if (e.key === 'Escape') setCreating(false)
                    }}
                  />
                  <div className="project-color-row">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`color-swatch ${newColor === c ? 'active' : ''}`}
                        style={{ background: c }}
                        onClick={() => setNewColor(c)}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                  <div className="project-create-actions">
                    <button type="button" onClick={() => setCreating(false)}>Cancel</button>
                    <button type="button" className="primary" onClick={() => void handleCreate()} disabled={!newName.trim()}>
                      Create
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <ul className="project-list">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className={`project-list-item ${p.id === current.id ? 'active' : ''}`}
                >
                  {editingId === p.id ? (
                    <div className="project-rename-form">
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleRenameSave(p.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onBlur={() => void handleRenameSave(p.id)}
                      />
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="project-list-item-main"
                        onClick={() => void handleSelect(p.id)}
                        style={{ '--project-color': p.color } as React.CSSProperties}
                      >
                        <span className="project-list-item-emoji">{p.emoji ?? '◆'}</span>
                        <span className="project-list-item-name">{p.name}</span>
                        {p.id === current.id && <span className="project-list-item-current">current</span>}
                      </button>
                      <div className="project-list-item-actions">
                        <button
                          type="button"
                          title="Rename"
                          onClick={() => {
                            setEditingId(p.id)
                            setEditName(p.name)
                          }}
                        >
                          ✎
                        </button>
                        {p.id !== 'personal' && (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => void handleDelete(p)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <p className="project-switcher-hint">
              Switch projects to keep your workflows organized. Workflows save to the current project.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
