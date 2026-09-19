import { describe, it, expect } from 'vitest'
import {
  canvasSelectionKey,
  initialInspectorPanelMemory,
  resolveInspectorPanel,
} from '../../src/lib/inspectorPanelPolicy'

function run(
  state: Partial<Parameters<typeof resolveInspectorPanel>[0]>,
  memory = initialInspectorPanelMemory()
) {
  return resolveInspectorPanel(
    {
      settingsOpen: false,
      inspectorCollapsed: false,
      ...state,
    },
    memory
  )
}

describe('canvasSelectionKey', () => {
  it('returns null when nothing is selected', () => {
    expect(canvasSelectionKey([], [])).toBeNull()
    expect(
      canvasSelectionKey([{ id: 'a' }, { id: 'b' }], [{ id: 'e1' }])
    ).toBeNull()
  })

  it('returns a node key when a node is selected', () => {
    expect(canvasSelectionKey([{ id: 'a', selected: true }], [])).toBe('node:a')
  })

  it('returns an edge key when an edge is selected', () => {
    expect(canvasSelectionKey([], [{ id: 'e1', selected: true }])).toBe('edge:e1')
  })

  it('edge wins over node, matching NodeInspector render priority', () => {
    expect(
      canvasSelectionKey([{ id: 'a', selected: true }], [{ id: 'e1', selected: true }])
    ).toBe('edge:e1')
  })

  it('uses the first selected item when several are flagged', () => {
    expect(
      canvasSelectionKey(
        [
          { id: 'a' },
          { id: 'b', selected: true },
          { id: 'c', selected: true },
        ],
        []
      )
    ).toBe('node:b')
  })
})

describe('resolveInspectorPanel — the collapse toggle must actually hide the panel', () => {
  it('a manually collapsed panel stays collapsed no matter what happens on the canvas', () => {
    // Core regression for the user-reported bug: the panel kept popping open
    // whenever a node was clicked, which made the collapse toggle look broken.
    // The policy no longer knows about canvas selection at all, so nothing a
    // user does on the canvas can expand the panel.
    const memory = initialInspectorPanelMemory()
    const decision = run({ inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBeNull() // "null" = leave the panel alone
    expect(decision.memory.collapsedBySettings).toBe(false)
  })

  it('an expanded panel stays expanded — the policy never collapses on its own', () => {
    const memory = initialInspectorPanelMemory()
    const decision = run({ inspectorCollapsed: false }, memory)
    expect(decision.collapsed).toBeNull()
  })

  it('repeated runs are idempotent (no store writes, no flicker)', () => {
    let memory = initialInspectorPanelMemory()
    for (let i = 0; i < 5; i++) {
      const decision = run({ inspectorCollapsed: true }, memory)
      expect(decision.collapsed).toBeNull()
      memory = decision.memory
      expect(memory.collapsedBySettings).toBe(false)
    }
  })
})

describe('resolveInspectorPanel — settings modal interplay', () => {
  it('opening settings collapses an expanded inspector and closing restores it', () => {
    let memory = initialInspectorPanelMemory()
    // Panel expanded, settings opens → force collapse, remember it was ours.
    let decision = run(
      { settingsOpen: true, inspectorCollapsed: false },
      memory
    )
    expect(decision.collapsed).toBe(true)
    memory = decision.memory
    expect(memory.collapsedBySettings).toBe(true)

    // While settings open, further runs keep it collapsed.
    decision = run(
      { settingsOpen: true, inspectorCollapsed: true },
      memory
    )
    expect(decision.collapsed).toBeNull()
    memory = decision.memory

    // Settings closes → restore expanded panel.
    decision = run({ settingsOpen: false, inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBe(false)
    expect(decision.memory.collapsedBySettings).toBe(false)
  })

  it('closing settings restores the panel even when the user never touched it', () => {
    let memory = initialInspectorPanelMemory()
    let decision = run(
      { settingsOpen: true, inspectorCollapsed: false },
      memory
    )
    expect(decision.collapsed).toBe(true)
    memory = decision.memory

    decision = run({ settingsOpen: false, inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBe(false)
  })

  it('does not restore when the user collapsed manually before opening settings', () => {
    let memory = initialInspectorPanelMemory()
    // User manually collapsed the panel.
    let decision = run({ settingsOpen: false, inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBeNull()
    memory = decision.memory

    // Settings opens — inspector already collapsed, nothing to force.
    decision = run(
      { settingsOpen: true, inspectorCollapsed: true },
      memory
    )
    expect(decision.collapsed).toBeNull()
    expect(decision.memory.collapsedBySettings).toBe(false)
    memory = decision.memory

    // Settings closes — the user's manual collapse is respected.
    decision = run({ settingsOpen: false, inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBeNull()
  })

  it('expanding the inspector while settings are open re-applies the forced collapse', () => {
    let memory = initialInspectorPanelMemory()
    let decision = run(
      { settingsOpen: true, inspectorCollapsed: false },
      memory
    )
    expect(decision.collapsed).toBe(true)
    memory = decision.memory

    // User expands the rail while settings still open → collapse again.
    decision = run(
      { settingsOpen: true, inspectorCollapsed: false },
      memory
    )
    expect(decision.collapsed).toBe(true)
    expect(decision.memory.collapsedBySettings).toBe(true)
  })
})

describe('resolveInspectorPanel — memory hygiene', () => {
  it('fresh memory never carries stale restore flags', () => {
    const memory = initialInspectorPanelMemory()
    expect(memory.collapsedBySettings).toBe(false)
  })

  it('the restore flag is cleared exactly once after settings close', () => {
    let memory = initialInspectorPanelMemory()
    let decision = run({ settingsOpen: true, inspectorCollapsed: false }, memory)
    memory = decision.memory
    expect(memory.collapsedBySettings).toBe(true)

    // Settings closes → restore + clear flag.
    decision = run({ settingsOpen: false, inspectorCollapsed: true }, memory)
    memory = decision.memory
    expect(memory.collapsedBySettings).toBe(false)

    // A second close event (e.g. duplicate effect run) must not re-expand
    // anything the user collapsed meanwhile.
    decision = run({ settingsOpen: false, inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBeNull()
  })
})
