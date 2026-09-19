import { create } from 'zustand'

/**
 * Side-panel collapse state.
 * On desktop: panels collapse to a thin rail and can be re-expanded.
 * On mobile: panels are hidden by default and slide in as overlays.
 *
 * State is persisted to localStorage so the user's choice sticks.
 */

const STORAGE_KEY = 'brainwire-panel-collapse'

export type PanelId = 'palette' | 'inspector'

interface PanelCollapseState {
  /** Desktop collapsed state — when true, the panel shrinks to a rail. */
  collapsed: Record<PanelId, boolean>
  /** Mobile open state — when true, the panel slides in as an overlay. */
  mobileOpen: Record<PanelId, boolean>
  /** Whether the desktop "auto-hide on small canvas" mode is on. */
  autoHide: boolean

  toggle: (panel: PanelId) => void
  setCollapsed: (panel: PanelId, value: boolean) => void
  toggleMobile: (panel: PanelId) => void
  setMobileOpen: (panel: PanelId, value: boolean) => void
  closeAllMobile: () => void
  setAutoHide: (value: boolean) => void
}

function readPersisted(): { collapsed: Record<PanelId, boolean>; autoHide: boolean } {
  if (typeof localStorage === 'undefined') {
    return { collapsed: { palette: false, inspector: false }, autoHide: false }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { collapsed: { palette: false, inspector: false }, autoHide: false }
    const parsed = JSON.parse(raw)
    return {
      collapsed: {
        palette: !!parsed.collapsed?.palette,
        inspector: !!parsed.collapsed?.inspector,
      },
      autoHide: !!parsed.autoHide,
    }
  } catch {
    return { collapsed: { palette: false, inspector: false }, autoHide: false }
  }
}

function writePersisted(collapsed: Record<PanelId, boolean>, autoHide: boolean) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed, autoHide }))
  } catch {
    /* ignore quota errors */
  }
}

const initial = readPersisted()

export const usePanelCollapseStore = create<PanelCollapseState>((set, get) => ({
  collapsed: initial.collapsed,
  mobileOpen: { palette: false, inspector: false },
  autoHide: initial.autoHide,

  toggle: (panel) => {
    const next = { ...get().collapsed, [panel]: !get().collapsed[panel] }
    writePersisted(next, get().autoHide)
    set({ collapsed: next })
  },

  setCollapsed: (panel, value) => {
    const next = { ...get().collapsed, [panel]: value }
    writePersisted(next, get().autoHide)
    set({ collapsed: next })
  },

  toggleMobile: (panel) => {
    const current = get().mobileOpen[panel]
    // Close the other panel when opening one — only one overlay at a time on mobile
    const next = current
      ? { palette: false, inspector: false }
      : { palette: panel === 'palette', inspector: panel === 'inspector' }
    set({ mobileOpen: next })
  },

  setMobileOpen: (panel, value) => {
    if (value) {
      set({ mobileOpen: { palette: panel === 'palette', inspector: panel === 'inspector' } })
    } else {
      set({ mobileOpen: { palette: false, inspector: false } })
    }
  },

  closeAllMobile: () => set({ mobileOpen: { palette: false, inspector: false } }),

  setAutoHide: (value) => {
    writePersisted(get().collapsed, value)
    set({ autoHide: value })
  },
}))
