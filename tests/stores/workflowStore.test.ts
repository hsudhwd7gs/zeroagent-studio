import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useConnectionStore } from '../../src/stores/connectionStore'
import { useWorkflowStore } from '../../src/stores/workflowStore'
import * as connectionValidation from '../../src/lib/connectionValidation'

vi.mock('../../src/db', () => ({
  saveWorkflow: vi.fn(async (w: { id?: number }) => w.id ?? 42),
  loadWorkflows: vi.fn(async () => [
    {
      id: 1,
      name: 'Saved',
      nodes: [{ id: 'n1', type: 'chat', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
      createdAt: 1,
      updatedAt: 100,
    },
  ]),
  loadWorkflowsByProject: vi.fn(async () => [
    {
      id: 1,
      name: 'Saved',
      nodes: [{ id: 'n1', type: 'chat', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
      createdAt: 1,
      updatedAt: 100,
      projectId: 'personal',
    },
  ]),
  deleteWorkflow: vi.fn(),
}))

vi.mock('../../src/stores/projectStore', () => ({
  useProjectStore: {
    getState: () => ({ currentProjectId: 'personal', setCurrentProject: vi.fn() }),
  },
}))

describe('workflowStore — student saves homework between sessions', () => {
  beforeEach(() => {
    useWorkflowStore.getState().newWorkflow()
    useConnectionStore.getState().resetRejections()
  })

  it('marks dirty when nodes change', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'agent', position: { x: 0, y: 0 }, data: {} },
    ])
    useWorkflowStore.getState().markDirty()
    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })

  it('saves workflow and clears dirty flag', async () => {
    useWorkflowStore.getState().setWorkflowName('My bot')
    await useWorkflowStore.getState().saveCurrentWorkflow()
    expect(useWorkflowStore.getState().workflowId).toBe(42)
    expect(useWorkflowStore.getState().isDirty).toBe(false)
  })

  it('preserves createdAt when updating an existing workflow', async () => {
    const { saveWorkflow } = await import('../../src/db')
    vi.mocked(saveWorkflow).mockClear()
    useWorkflowStore.setState({ workflowId: 1, workflowName: 'Updated' })
    await useWorkflowStore.getState().saveCurrentWorkflow()
    expect(saveWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: 1, id: 1 })
    )
  })

  it('loads workflow from IndexedDB', async () => {
    await useWorkflowStore.getState().loadWorkflow(1)
    expect(useWorkflowStore.getState().workflowName).toBe('Saved')
    expect(useWorkflowStore.getState().nodes).toHaveLength(1)
  })

  it('updates node data immutably', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'agent', position: { x: 0, y: 0 }, data: { label: 'Old' } },
    ])
    useWorkflowStore.getState().updateNodeData('a', { label: 'New' })
    expect(useWorkflowStore.getState().nodes[0].data.label).toBe('New')
  })

  it('newWorkflow resets canvas for fresh start', () => {
    useWorkflowStore.getState().setNodes([{ id: 'x', type: 'chat', position: { x: 0, y: 0 }, data: {} }])
    useWorkflowStore.getState().newWorkflow()
    expect(useWorkflowStore.getState().nodes).toHaveLength(0)
    expect(useWorkflowStore.getState().workflowName).toBe('Untitled Workflow')
  })

  it('getWorkflowList returns summary for load menu', async () => {
    const list = await useWorkflowStore.getState().getWorkflowList()
    expect(list[0]).toMatchObject({ id: 1, name: 'Saved' })
  })

  it('deleteNode skips locked nodes', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'tool', position: { x: 0, y: 0 }, data: { locked: true } },
    ])
    useWorkflowStore.getState().deleteNode('a')
    expect(useWorkflowStore.getState().nodes).toHaveLength(1)
  })

  it('toggleNodeLock flips locked state and interaction flags', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'tool', position: { x: 0, y: 0 }, data: { label: 'T', toolType: 'file-reader' } },
      { id: 'b', type: 'tool', position: { x: 0, y: 0 }, data: { label: 'T2', toolType: 'file-reader' } },
    ])
    useWorkflowStore.getState().toggleNodeLock('a')
    let node = useWorkflowStore.getState().nodes[0]
    expect(node.data.locked).toBe(true)
    expect(node.draggable).toBe(false)
    useWorkflowStore.getState().toggleNodeLock('a')
    node = useWorkflowStore.getState().nodes[0]
    expect(node.data.locked).toBe(false)
    expect(node.draggable).toBe(true)
  })

  it('deleteNode removes node and connected edges', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'chat', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'agent', position: { x: 0, y: 0 }, data: {} },
    ])
    useWorkflowStore.getState().setEdges([
      { id: 'e1', source: 'a', target: 'b' },
    ])
    useWorkflowStore.getState().deleteNode('b')
    expect(useWorkflowStore.getState().nodes).toHaveLength(1)
    expect(useWorkflowStore.getState().edges).toHaveLength(0)
  })

  it('deleteSelectedNodes removes all selected nodes', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'chat', position: { x: 0, y: 0 }, data: {}, selected: true },
      { id: 'b', type: 'agent', position: { x: 0, y: 0 }, data: {} },
    ])
    useWorkflowStore.getState().deleteSelectedNodes()
    expect(useWorkflowStore.getState().nodes.map((n) => n.id)).toEqual(['b'])
  })

  it('deleteSelectedNodes no-ops when nothing is selected', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'chat', position: { x: 0, y: 0 }, data: {} },
    ])
    useWorkflowStore.getState().deleteSelectedNodes()
    expect(useWorkflowStore.getState().nodes).toHaveLength(1)
  })

  it('deleteSelectedNodes removes edges when only target is selected', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'chat', position: { x: 0, y: 0 }, data: {}, selected: true },
      { id: 'b', type: 'agent', position: { x: 0, y: 0 }, data: {} },
      { id: 'c', type: 'agent', position: { x: 0, y: 0 }, data: {} },
    ])
    useWorkflowStore.getState().setEdges([
      { id: 'e1', source: 'b', target: 'a' },
      { id: 'e2', source: 'c', target: 'b' },
    ])
    useWorkflowStore.getState().deleteSelectedNodes()
    expect(useWorkflowStore.getState().nodes.map((n) => n.id)).toEqual(['b', 'c'])
    expect(useWorkflowStore.getState().edges.map((e) => e.id)).toEqual(['e2'])
  })

  it('deleteSelectedNodes removes edges between deleted nodes', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'a', type: 'chat', position: { x: 0, y: 0 }, data: {}, selected: true },
      { id: 'b', type: 'agent', position: { x: 0, y: 0 }, data: {}, selected: true },
    ])
    useWorkflowStore.getState().setEdges([{ id: 'e1', source: 'a', target: 'b' }])
    useWorkflowStore.getState().deleteSelectedNodes()
    expect(useWorkflowStore.getState().nodes).toHaveLength(0)
    expect(useWorkflowStore.getState().edges).toHaveLength(0)
  })

  it('onConnect adds valid edges with handles', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'c', type: 'chat', position: { x: 0, y: 0 }, data: { label: 'Chat', messages: [] } },
      { id: 'a', type: 'agent', position: { x: 0, y: 0 }, data: { label: 'A', role: 'r', systemPrompt: '', brain: 'transformers' } },
    ])
    useWorkflowStore.getState().onConnect({
      source: 'c',
      target: 'a',
      sourceHandle: 'message',
      targetHandle: 'context',
    })
    expect(useWorkflowStore.getState().edges).toHaveLength(1)
    expect(useWorkflowStore.getState().edges[0].sourceHandle).toBe('message')
  })

  it('onConnect rejects invalid connections and logs a hint', () => {
    useWorkflowStore.getState().setNodes([
      { id: 'c', type: 'chat', position: { x: 0, y: 0 }, data: { label: 'Chat', messages: [] } },
    ])
    useWorkflowStore.getState().onConnect({
      source: 'c',
      target: 'c',
      sourceHandle: null,
      targetHandle: null,
    })
    expect(useWorkflowStore.getState().edges).toHaveLength(0)
    expect(useConnectionStore.getState().rejectionCount).toBeGreaterThan(0)
  })

  it('onConnect skips logging when rejection reason is empty', () => {
    const normalizeSpy = vi
      .spyOn(connectionValidation, 'normalizeConnection')
      .mockReturnValue(null)
    const describeSpy = vi
      .spyOn(connectionValidation, 'describeConnectionRejection')
      .mockReturnValue(null)

    useWorkflowStore.getState().setNodes([
      { id: 'c', type: 'chat', position: { x: 0, y: 0 }, data: { label: 'Chat', messages: [] } },
      { id: 'a', type: 'agent', position: { x: 0, y: 0 }, data: { label: 'A', role: 'r', systemPrompt: '', brain: 'transformers' } },
    ])
    const before = useConnectionStore.getState().rejectionCount
    useWorkflowStore.getState().onConnect({
      source: 'c',
      target: 'a',
      sourceHandle: null,
      targetHandle: null,
    })

    expect(useWorkflowStore.getState().edges).toHaveLength(0)
    expect(useConnectionStore.getState().rejectionCount).toBe(before)
    normalizeSpy.mockRestore()
    describeSpy.mockRestore()
  })

  it('hasCanvasWork reflects nodes and dirty state', () => {
    expect(useWorkflowStore.getState().hasCanvasWork()).toBe(false)
    useWorkflowStore.getState().markDirty()
    expect(useWorkflowStore.getState().hasCanvasWork()).toBe(true)
    useWorkflowStore.getState().newWorkflow()
    useWorkflowStore.getState().setNodes([
      { id: 'c', type: 'chat', position: { x: 0, y: 0 }, data: {} },
    ])
    expect(useWorkflowStore.getState().hasCanvasWork()).toBe(true)
  })

  it('exports and imports workflow documents', async () => {
    const workflowIo = await import('../../src/lib/workflowIo')
    const downloadSpy = vi.spyOn(workflowIo, 'downloadWorkflowExport').mockImplementation(() => {})

    useWorkflowStore.getState().setWorkflowName('Export Me')
    useWorkflowStore.getState().setNodes([
      { id: 'c', type: 'chat', position: { x: 0, y: 0 }, data: { label: 'Chat', messages: [] } },
    ])

    useWorkflowStore.getState().exportWorkflowFile()
    expect(downloadSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: expect.objectContaining({ name: 'Export Me' }),
      })
    )

    const doc = workflowIo.buildWorkflowExportDocument('Imported', [], [])
    useWorkflowStore.getState().importWorkflowDocument(doc)
    expect(useWorkflowStore.getState().workflowName).toBe('Imported')
    expect(useWorkflowStore.getState().workflowId).toBeNull()
    expect(useWorkflowStore.getState().isDirty).toBe(true)

    downloadSpy.mockRestore()
  })
})
