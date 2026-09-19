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
      selectedKey: null,
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
  it('manual collapse with a node already selected stays collapsed (regression: the toggle used to pop open)', () => {
    // User selected node "a" (panel expanded), then clicked the collapse toggle.
    let memory = initialInspectorPanelMemory()
    // First run: fresh selection of node a while collapsed=false → no action.
    let decision = run({ selectedKey: 'node:a', inspectorCollapsed: false }, memory)
    expect(decision.collapsed).toBeNull()
    memory = decision.memory

    // User clicks the collapse toggle → inspectorCollapsed becomes true.
    // Old buggy rule: any selected node forced expansion again.
    decision = run({ selectedKey: 'node:a', inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBeNull() // must NOT re-expand
    memory = decision.memory

    // Repeated re-renders with the same selection must also leave it collapsed.
    decision = run({ selectedKey: 'node:a', inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBeNull()
  })

  it('fresh node selection while collapsed auto-expands the panel', () => {
    let memory = initialInspectorPanelMemory()
    // Nothing selected, collapsed (user collapsed the empty "Block settings").
    let decision = run({ selectedKey: null, inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBeNull()
    memory = decision.memory

    // User clicks node b → selection changes → auto-expand.
    decision = run({ selectedKey: 'node:b', inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBe(false)
    memory = decision.memory

    // Node b stays selected; further renders must not flip anything.
    decision = run({ selectedKey: 'node:b', inspectorCollapsed: false }, memory)
    expect(decision.collapsed).toBeNull()
  })

  it('selecting a different node after a manual collapse expands once for the new selection', () => {
    let memory = initialInspectorPanelMemory()
    let decision = run({ selectedKey: 'node:a', inspectorCollapsed: false }, memory)
    memory = decision.memory

    // Manual collapse while node a selected → respected.
    decision = run({ selectedKey: 'node:a', inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBeNull()
    memory = decision.memory

    // User clicks node c → fresh selection → expand.
    decision = run({ selectedKey: 'node:c', inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBe(false)
  })

  it('deselecting (clicking empty canvas) never expands the panel', () => {
    let memory = initialInspectorPanelMemory()
    let decision = run({ selectedKey: 'node:a', inspectorCollapsed: false }, memory)
    memory = decision.memory

    decision = run({ selectedKey: null, inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBeNull()
  })

  it('re-selecting the same node after deselect counts as a fresh selection', () => {
    let memory = initialInspectorPanelMemory()
    let decision = run({ selectedKey: 'node:a', inspectorCollapsed: false }, memory)
    memory = decision.memory
    decision = run({ selectedKey: null, inspectorCollapsed: true }, memory)
    memory = decision.memory

    decision = run({ selectedKey: 'node:a', inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBe(false)
  })

  it('edge selection auto-expands (Connector inspector parity with nodes)', () => {
    const memory = initialInspectorPanelMemory()
    const decision = run({ selectedKey: 'edge:e1', inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBe(false)
  })
})

describe('resolveInspectorPanel — settings modal interplay', () => {
  it('opening settings collapses an expanded inspector and closing restores it', () => {
    let memory = initialInspectorPanelMemory()
    // Node selected, expanded.
    let decision = run({ selectedKey: 'node:a', inspectorCollapsed: false }, memory)
    memory = decision.memory

    // Settings opens → force collapse, remember it was ours.
    decision = run(
      { settingsOpen: true, selectedKey: 'node:a', inspectorCollapsed: false },
      memory
    )
    expect(decision.collapsed).toBe(true)
    memory = decision.memory
    expect(memory.collapsedBySettings).toBe(true)

    // While settings open, further runs keep it collapsed.
    decision = run(
      { settingsOpen: true, selectedKey: 'node:a', inspectorCollapsed: true },
      memory
    )
    expect(decision.collapsed).toBeNull()
    memory = decision.memory

    // Settings closes → restore expanded panel.
    decision = run({ selectedKey: 'node:a', inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBe(false)
    expect(decision.memory.collapsedBySettings).toBe(false)
  })

  it('closing settings restores the panel even with nothing selected', () => {
    let memory = initialInspectorPanelMemory()
    let decision = run(
      { settingsOpen: true, selectedKey: null, inspectorCollapsed: false },
      memory
    )
    expect(decision.collapsed).toBe(true)
    memory = decision.memory

    decision = run({ settingsOpen: false, selectedKey: null, inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBe(false)
  })

  it('does not restore when the user collapsed manually before opening settings', () => {
    let memory = initialInspectorPanelMemory()
    // User manually collapsed the empty panel.
    let decision = run({ selectedKey: null, inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBeNull()
    memory = decision.memory

    // Settings opens — inspector already collapsed, nothing to force.
    decision = run(
      { settingsOpen: true, selectedKey: null, inspectorCollapsed: true },
      memory
    )
    expect(decision.collapsed).toBeNull()
    expect(decision.memory.collapsedBySettings).toBe(false)
    memory = decision.memory

    // Settings closes — the user's manual collapse is respected.
    decision = run({ settingsOpen: false, selectedKey: null, inspectorCollapsed: true }, memory)
    expect(decision.collapsed).toBeNull()
  })

  it('expanding the inspector while settings are open re-applies the forced collapse', () => {
    let memory = initialInspectorPanelMemory()
    let decision = run(
      { settingsOpen: true, selectedKey: null, inspectorCollapsed: false },
      memory
    )
    expect(decision.collapsed).toBe(true)
    memory = decision.memory

    // User expands the rail while settings still open → collapse again.
    decision = run(
      { settingsOpen: true, selectedKey: null, inspectorCollapsed: false },
      memory
    )
    expect(decision.collapsed).toBe(true)
    expect(decision.memory.collapsedBySettings).toBe(true)
  })
})

describe('resolveInspectorPanel — idempotence and memory hygiene', () => {
  it('returns null (no store write) when nothing needs to change', () => {
    const decision = run({ selectedKey: null, inspectorCollapsed: false })
    expect(decision.collapsed).toBeNull()
    expect(decision.memory.lastSelectionKey).toBeNull()
  })

  it('does not expand when selection changed but panel is already expanded', () => {
    const decision = run({ selectedKey: 'node:x', inspectorCollapsed: false })
    expect(decision.collapsed).toBeNull()
  })

  it('fresh memory never carries stale restore flags', () => {
    const memory = initialInspectorPanelMemory()
    expect(memory.lastSelectionKey).toBeNull()
    expect(memory.collapsedBySettings).toBe(false)
  })
})
