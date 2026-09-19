/**
 * Inspector panel state policy.
 *
 * Decides when the right-hand inspector panel ("Block settings" /
 * "Tool settings" / "Agent settings" / "Connector") may be force-collapsed
 * or restored. Extracted from App.tsx so the rules are unit-testable.
 *
 * Core contract (learned the hard way from user reports):
 *   The inspector panel NEVER auto-expands. It opens only through an
 *   explicit user action — the collapse/expand chevron, clicking the
 *   collapsed rail, the `[` / `]` keyboard shortcut, or the mobile header
 *   toggle. Auto-expanding on canvas selection made the collapse toggle
 *   look broken ("the panel won't stay hidden"), so that rule was removed
 *   for good. Canvas selection is deliberately NOT part of this policy.
 *
 * Rules (evaluated top-to-bottom, first match wins):
 *   1. Settings panel open  → inspector collapses (avoid overlap). We remember
 *      that *we* forced the collapse so we can restore the panel afterwards.
 *   2. Settings just closed and the collapse was forced by rule 1 → restore
 *      the expanded panel. If the user had collapsed it manually before
 *      opening settings, their choice is respected instead.
 *   3. Otherwise: never touch the panel. The user's manual choice always wins.
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
 *
 * NOTE: this is no longer consumed by the panel policy — selection must not
 * influence panel collapse/expand. It is kept as a small, tested utility for
 * future features that genuinely need a stable selection key.
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
}

export interface InspectorPanelMemory {
  /** True when the inspector was collapsed by the settings panel (rule 1). */
  collapsedBySettings: boolean
}

export function initialInspectorPanelMemory(): InspectorPanelMemory {
  return { collapsedBySettings: false }
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
  const next: InspectorPanelMemory = {
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

  // Rule 3 — never touch the panel: manual collapse/expand always wins.
  return { collapsed: null, memory: next }
}
