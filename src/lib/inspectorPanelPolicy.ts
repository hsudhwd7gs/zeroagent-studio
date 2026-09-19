/**
 * Inspector panel state policy.
 *
 * Decides when the right-hand inspector panel ("Block settings" /
 * "Tool settings" / "Agent settings" / "Connector") may auto-expand or
 * force-collapse. Extracted from App.tsx so the rules are unit-testable.
 *
 * Rules (evaluated top-to-bottom, first match wins):
 *   1. Settings panel open  → inspector collapses (avoid overlap). We remember
 *      that *we* forced the collapse so we can restore the panel afterwards.
 *   2. Settings just closed and the collapse was forced by rule 1 → restore
 *      the expanded panel. If the user had collapsed it manually before
 *      opening settings, their choice is respected instead.
 *   3. Canvas selection CHANGED to a block or connector → auto-expand so the
 *      user immediately sees the new settings.
 *   4. Otherwise the user's manual collapse choice wins. This is the fix for
 *      the "toggle doesn't hide Block settings" bug: the old rule re-expanded
 *      the inspector on every render while any node was selected, which made
 *      the collapse toggle look completely broken.
 */

export interface SelectableItem {
  id: string
  selected?: boolean
}

/**
 * Stable key describing what is currently selected on the canvas.
 * Edge wins over node, matching NodeInspector's render priority
 * (EdgeInspector is rendered when an edge is selected, even if a node is
 * also selected).
 */
export function canvasSelectionKey(
  nodes: readonly SelectableItem[],
  edges: readonly SelectableItem[]
): string | null {
  const edge = edges.find((e) => e.selected)
  if (edge) return `edge:${edge.id}`
  const node = nodes.find((n) => n.selected)
  return node ? `node:${node.id}` : null
}

export interface InspectorPanelState {
  /** Whether the settings (Privacy & keys) modal is open. */
  settingsOpen: boolean
  /** Whether the inspector panel is currently collapsed. */
  inspectorCollapsed: boolean
  /** Current canvas selection key (see canvasSelectionKey). */
  selectedKey: string | null
}

export interface InspectorPanelMemory {
  /** Selection key seen the previous time the policy ran. */
  lastSelectionKey: string | null
  /** True when the inspector was collapsed by the settings panel (rule 1). */
  collapsedBySettings: boolean
}

export function initialInspectorPanelMemory(): InspectorPanelMemory {
  return { lastSelectionKey: null, collapsedBySettings: false }
}

export interface InspectorPanelDecision {
  /**
   * The new collapsed value for the inspector panel, or null when the panel
   * should be left exactly as the user (or a previous rule) left it.
   */
  collapsed: boolean | null
  /** Updated memory to carry into the next policy run. */
  memory: InspectorPanelMemory
}

export function resolveInspectorPanel(
  state: InspectorPanelState,
  memory: InspectorPanelMemory
): InspectorPanelDecision {
  const selectionChanged = state.selectedKey !== memory.lastSelectionKey
  const next: InspectorPanelMemory = {
    lastSelectionKey: state.selectedKey,
    collapsedBySettings: memory.collapsedBySettings,
  }

  // Rule 1 — settings modal borrows the space: force-collapse the inspector.
  if (state.settingsOpen) {
    if (!state.inspectorCollapsed) {
      next.collapsedBySettings = true
      return { collapsed: true, memory: next }
    }
    return { collapsed: null, memory: next }
  }

  // Rule 2 — settings just closed. Only restore if the collapse was ours.
  if (next.collapsedBySettings) {
    next.collapsedBySettings = false
    if (state.inspectorCollapsed) {
      return { collapsed: false, memory: next }
    }
    return { collapsed: null, memory: next }
  }

  // Rule 3 — a fresh selection reveals its settings, but only when the panel
  // is collapsed. A selection change while expanded needs no action.
  if (selectionChanged && state.selectedKey !== null && state.inspectorCollapsed) {
    return { collapsed: false, memory: next }
  }

  // Rule 4 — respect the user's manual choice (the collapse toggle must work).
  return { collapsed: null, memory: next }
}
