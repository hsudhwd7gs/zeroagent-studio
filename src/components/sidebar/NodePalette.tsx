import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { addPaletteNodeAt } from '../../lib/addPaletteNode'
import { getViewportCenterPosition } from '../../lib/flowCanvasRegistry'
import { getQuestSteps } from '../../lib/tutorialQuests'
import { useTutorialStore } from '../../stores/tutorialStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useWorkflowStore } from '../../stores/workflowStore'
import {
  listToolsForPalette,
  getToolBadge,
  getPaletteTutorialTarget,
  getPaletteDragTypeFromTutorialTarget,
  getPaletteItemLock,
  BROWSER_SUBCATEGORY_LABELS,
  getBrowserSubcategorySortIndex,
  type BrowserSubcategory,
} from '../../tools/registry'
import type { ToolDefinition } from '../../tools/registryTypes'
import {
  paletteSectionId,
  readPaletteCollapsedSections,
  writePaletteCollapsedSections,
  togglePaletteCollapsedSection,
  getPaletteRevealSectionsForHighlights,
  resolvePaletteCollapsedSections,
  isPaletteSectionCollapsed,
} from '../../lib/paletteCollapse'
import { APP_STORAGE_CLEARED_EVENT } from '../../lib/appStorage'
import { PaletteAccordionSection } from './PaletteAccordionSection'

const CORE_ITEMS = [
  { type: 'chat', icon: '💬', label: 'Chat', desc: 'Type here to start', badge: '$0', tier: 'legendary' as const },
  { type: 'agent', icon: '🤖', label: 'Agent', desc: 'AI that reads & writes', badge: '$0', tier: 'legendary' as const },
  { type: 'loop', icon: '🔁', label: 'Loop', desc: 'Repeat downstream for each item', badge: '$0', tier: 'epic' as const },
]

const GROUP_LABELS: Record<string, string> = {
  browser: 'Browser tools',
  cloud: 'Cloud tools (API key)',
  custom: 'Custom',
}

const BROWSER_SUBCATEGORIES = (Object.keys(BROWSER_SUBCATEGORY_LABELS) as BrowserSubcategory[]).sort(
  (a, b) => getBrowserSubcategorySortIndex(a) - getBrowserSubcategorySortIndex(b)
)

function paletteTarget(type: string): string {
  return getPaletteTutorialTarget(type)
}

function matchesSearch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

export default function NodePalette() {
  const [search, setSearch] = useState('')
  const [collapsedSections, setCollapsedSections] = useState(readPaletteCollapsedSections)
  const stepIndex = useTutorialStore((s) => s.stepIndex)
  const questId = useTutorialStore((s) => s.questId)
  const tutorialActive = useTutorialStore((s) => s.active)
  const apiKeys = useSettingsStore((s) => s.apiKeys)
  const highlight = useMemo(() => {
    if (!tutorialActive) return undefined
    const step = getQuestSteps(questId)[stepIndex]
    if (step?.highlightPalette?.length) return step.highlightPalette
    const derived = getPaletteDragTypeFromTutorialTarget(step?.target)
    return derived ? [derived] : undefined
  }, [tutorialActive, questId, stepIndex])

  const tools = listToolsForPalette(apiKeys)
  const groups = ['browser', 'cloud', 'custom'] as const
  const query = search.trim()
  const accordionsEnabled = !query

  const filteredTools = useMemo(() => {
    if (!query) return tools
    return tools.filter(
      (t) =>
        matchesSearch(t.label, query) ||
        matchesSearch(t.description, query) ||
        matchesSearch(t.id, query)
    )
  }, [tools, query])

  const revealSections = useMemo(
    () => getPaletteRevealSectionsForHighlights(tools, highlight),
    [tools, highlight]
  )

  const effectiveCollapsed = useMemo(
    () =>
      resolvePaletteCollapsedSections(collapsedSections, {
        accordionsEnabled,
        revealSections,
      }),
    [collapsedSections, accordionsEnabled, revealSections]
  )

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = togglePaletteCollapsedSection(prev, sectionId)
      writePaletteCollapsedSections(next)
      return next
    })
  }, [])

  useEffect(() => {
    const onStorageCleared = (event: Event) => {
      const detail = (event as CustomEvent<{ categories: string[] }>).detail
      if (detail.categories.includes('ui-preferences')) {
        setCollapsedSections(new Set())
      }
    }
    window.addEventListener(APP_STORAGE_CLEARED_EVENT, onStorageCleared)
    return () => window.removeEventListener(APP_STORAGE_CLEARED_EVENT, onStorageCleared)
  }, [])

  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDoubleClickAdd = (type: string) => {
    // Cascade each new block away from the exact center so consecutive adds
    // never stack perfectly on top of each other.
    const center = getViewportCenterPosition()
    const cascade = (useWorkflowStore.getState().nodes.length % 8) * 36
    addPaletteNodeAt(type, { x: center.x + cascade, y: center.y + cascade })
  }

  let itemIndex = 0

  const renderItem = (
    item: { type: string; icon: string; label: string; desc: string; badge: string; tier?: 'legendary' | 'epic' | 'rare' },
    index: number,
    animated = false,
    lockReason?: string
  ) => {
    const locked = !!lockReason
    const tierClass = item.tier ? `palette-item--${item.tier}` : ''
    const className = `palette-item ${tierClass} ${locked ? 'palette-item--locked' : ''} ${highlight?.includes(item.type) ? 'tutorial-palette-highlight' : ''}`
    const props = {
      key: item.type,
      className,
      'data-tutorial-target': paletteTarget(item.type),
      title: locked
        ? lockReason
        : 'Drag onto canvas, or double-click to add at center',
      draggable: !locked,
      onDragStart: locked
        ? (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
          }
        : (e: React.DragEvent) => onDragStart(e, item.type),
      onDoubleClick: locked ? undefined : () => onDoubleClickAdd(item.type),
    }
    const content = (
      <>
        <span className="palette-icon">{item.icon}</span>
        <div className="palette-info">
          <span className="palette-label">
            {locked && <span className="palette-lock-icon" aria-hidden>🔒</span>}
            {item.label}
            <span
              className={`palette-badge ${item.badge.includes('locked') || locked ? 'palette-badge-warn' : ''}`}
            >
              {locked ? 'locked' : item.badge}
            </span>
          </span>
          <span className="palette-desc">{locked ? lockReason : item.desc}</span>
        </div>
      </>
    )
    if (!animated) {
      return <div {...props}>{content}</div>
    }
    return (
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.02, 0.12) }}
      >
        <div {...props}>{content}</div>
      </motion.div>
    )
  }

  const renderToolItem = (tool: ToolDefinition, tier?: 'legendary' | 'epic' | 'rare') => {
    const lock = getPaletteItemLock(tool.paletteDragType, apiKeys)
    return renderItem(
      {
        type: tool.paletteDragType,
        icon: tool.icon,
        label: tool.label,
        desc: tool.description,
        badge: getToolBadge(tool, apiKeys),
        tier,
      },
      itemIndex++,
      false,
      lock.locked ? lock.reason : undefined
    )
  }

  const browserBySub = useMemo(() => {
    const map = new Map<BrowserSubcategory, typeof filteredTools>()
    for (const tool of filteredTools.filter((t) => t.paletteGroup === 'browser')) {
      const sub = tool.browserSubcategory ?? 'curated'
      const list = map.get(sub) ?? []
      list.push(tool)
      map.set(sub, list)
    }
    return map
  }, [filteredTools])

  return (
    <aside className="sidebar palette game-panel" data-tutorial-target="palette">
      <h3 className="sidebar-title game-panel-title">
        <span className="game-panel-title-icon" aria-hidden>⚡</span>
        Building blocks
      </h3>
      <p className="palette-intro">
        Drag onto the canvas, or double-click to add at center. Click category headers to fold sections.
      </p>
      <input
        type="search"
        className="palette-search"
        placeholder="Search tools…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search tools"
      />
      <div className="palette-items">
        {CORE_ITEMS.map((item) => renderItem(item, itemIndex++, !query))}

        {query && filteredTools.length === 0 && (
          <p className="palette-empty">No tools match &ldquo;{query}&rdquo;. Try another keyword.</p>
        )}

        {groups.map((group) => {
          const groupTools = filteredTools.filter((t) => t.paletteGroup === group)
          if (groupTools.length === 0) return null

          const groupSectionId = paletteSectionId('group', group)

          if (group === 'browser' && !query) {
            return (
              <div key={group} className="palette-group">
                <PaletteAccordionSection
                  sectionId={groupSectionId}
                  title={GROUP_LABELS[group]}
                  titleClassName={`palette-group-title--${group}`}
                  count={groupTools.length}
                  collapsed={isPaletteSectionCollapsed(groupSectionId, effectiveCollapsed)}
                  onToggle={() => toggleSection(groupSectionId)}
                >
                  {BROWSER_SUBCATEGORIES.map((sub) => {
                    const subTools = browserBySub.get(sub)
                    if (!subTools?.length) return null
                    const subSectionId = paletteSectionId('sub', sub)
                    return (
                      <PaletteAccordionSection
                        key={sub}
                        sectionId={subSectionId}
                        title={BROWSER_SUBCATEGORY_LABELS[sub]}
                        titleClassName={`palette-subgroup-title--${sub}`}
                        count={subTools.length}
                        collapsed={isPaletteSectionCollapsed(subSectionId, effectiveCollapsed)}
                        onToggle={() => toggleSection(subSectionId)}
                        variant="sub"
                      >
                        {subTools.map((tool) => {
                          const tier =
                            sub === 'output'
                              ? ('legendary' as const)
                              : sub === 'curated'
                                ? ('epic' as const)
                                : undefined
                          return renderToolItem(tool, tier)
                        })}
                      </PaletteAccordionSection>
                    )
                  })}
                </PaletteAccordionSection>
              </div>
            )
          }

          return (
            <div key={group} className="palette-group">
              <PaletteAccordionSection
                sectionId={groupSectionId}
                title={GROUP_LABELS[group]}
                titleClassName={`palette-group-title--${group}`}
                count={groupTools.length}
                collapsed={isPaletteSectionCollapsed(groupSectionId, effectiveCollapsed)}
                onToggle={() => toggleSection(groupSectionId)}
              >
                {groupTools.map((tool) => renderToolItem(tool))}
              </PaletteAccordionSection>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
