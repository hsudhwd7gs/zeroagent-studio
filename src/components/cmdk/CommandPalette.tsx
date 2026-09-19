import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useProjectStore } from '../../stores/projectStore'
import { useExecutionStore } from '../../stores/executionStore'
import { listTools } from '../../tools/registry'
import { navigateTo } from '../../lib/appRoute'
import { createNodeFromPaletteType } from '../../lib/addPaletteNode'

interface PaletteItem {
  id: string
  label: string
  group: string
  icon: string
  description: string
  action: () => void | Promise<void>
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const saveCurrentWorkflow = useWorkflowStore((s) => s.saveCurrentWorkflow)
  const newWorkflow = useWorkflowStore((s) => s.newWorkflow)
  const exportWorkflowFile = useWorkflowStore((s) => s.exportWorkflowFile)
  const setNodes = useWorkflowStore((s) => s.setNodes)
  const nodes = useWorkflowStore((s) => s.nodes)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const createProject = useProjectStore((s) => s.createProject)

  const items = useMemo<PaletteItem[]>(() => {
    const actions: PaletteItem[] = [
      {
        id: 'action-save',
        label: 'Save workflow',
        group: 'Actions',
        icon: '💾',
        description: 'Save the current canvas to this project',
        action: () => void saveCurrentWorkflow(),
      },
      {
        id: 'action-new',
        label: 'New workflow',
        group: 'Actions',
        icon: '✨',
        description: 'Clear the canvas and start fresh',
        action: () => void newWorkflow(),
      },
      {
        id: 'action-export',
        label: 'Export workflow as .zeroagent.json',
        group: 'Actions',
        icon: '📤',
        description: 'Download current canvas as a portable file',
        action: () => exportWorkflowFile(),
      },
      {
        id: 'action-new-project',
        label: 'Create a new project',
        group: 'Actions',
        icon: '📁',
        description: 'Add a new workspace',
        action: async () => {
          const name = prompt('Project name?')
          if (name?.trim()) await createProject(name.trim())
        },
      },
      {
        id: 'action-guide',
        label: 'Open Guide',
        group: 'Actions',
        icon: '📖',
        description: 'Open the in-app manual',
        action: () => navigateTo('guide'),
      },
    ]

    const tools = listTools().map((t) => ({
      id: `tool-${t.id}`,
      label: t.label,
      group: t.paletteGroup === 'cloud' ? 'Cloud Tools' : t.paletteGroup === 'custom' ? 'Custom Tools' : 'Browser Tools',
      icon: t.icon,
      description: t.description,
      action: () => {
        const offset = nodes.length * 40
        const newNode = createNodeFromPaletteType(t.paletteDragType, { x: 200 + offset, y: 200 + offset })
        if (newNode) setNodes([...useWorkflowStore.getState().nodes, newNode])
      },
    }))

    return [...actions, ...tools]
  }, [saveCurrentWorkflow, newWorkflow, exportWorkflowFile, createProject, setNodes, nodes.length])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items.slice(0, 50)
    return items
      .filter((i) => {
        const hay = `${i.label} ${i.description} ${i.group}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 50)
  }, [items, query])

  // Reset search state whenever the palette opens (adjust-during-render pattern).
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setActiveIndex(0)
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[activeIndex]
        if (item) {
          void Promise.resolve(item.action()).then(() => onClose())
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [filtered, activeIndex, onClose]
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cmdk-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="cmdk-panel"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <div className="cmdk-input-wrap">
              <span className="cmdk-icon" aria-hidden>⌘</span>
              <input
                ref={inputRef}
                type="text"
                className="cmdk-input"
                placeholder="Search tools and actions…"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRunning}
              />
              <kbd className="cmdk-esc">Esc</kbd>
            </div>
            <ul className="cmdk-list" role="listbox">
              {filtered.length === 0 && <li className="cmdk-empty">No matches</li>}
              {filtered.map((item, idx) => (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={`cmdk-item ${idx === activeIndex ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    void Promise.resolve(item.action()).then(() => onClose())
                  }}
                >
                  <span className="cmdk-item-icon" aria-hidden>{item.icon}</span>
                  <span className="cmdk-item-main">
                    <span className="cmdk-item-label">{item.label}</span>
                    <span className="cmdk-item-desc">{item.description}</span>
                  </span>
                  <span className="cmdk-item-group">{item.group}</span>
                </li>
              ))}
            </ul>
            <div className="cmdk-footer">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>Esc close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
