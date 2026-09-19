import { create } from 'zustand'
import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect, Connection } from '@xyflow/react'
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react'
import type { AgentNodeData, ToolNodeData, ChatNodeData } from '../types'
import { saveWorkflow, loadWorkflows, loadWorkflowsByProject, deleteWorkflow } from '../db'
import { migrateWorkflow } from '../lib/workflowMigration'
import {
  applyImportedWorkflow,
  buildWorkflowExportDocument,
  downloadWorkflowExport,
  type WorkflowExportDocument,
} from '../lib/workflowIo'
import {
  describeConnectionRejection,
  isValidWorkflowConnection,
  normalizeConnection,
} from '../lib/connectionValidation'
import {
  isLockedNodeChangeBlocked,
  isNodeCanvasLocked,
  NODE_CANVAS_LOCK_HINT,
  withNodeCanvasLockFlags,
} from '../lib/nodeCanvasLock'
import { useConnectionStore } from './connectionStore'
import { useDebugStore } from './debugStore'
import { useProjectStore } from './projectStore'
import { fitWorkflowView } from '../lib/flowCanvasRegistry'
import { toastEmitter } from '../components/feedback/ToastProvider'

// ────────────────────────────────────────────────────────────────────
// Workflow name validation
// ────────────────────────────────────────────────────────────────────
export const WORKFLOW_NAME_MAX = 80
export const WORKFLOW_NAME_MIN = 1

export function sanitizeWorkflowName(raw: string): { value: string; error: string | null } {
  const trimmed = raw.replace(/\s+/g, ' ').trim()
  if (trimmed.length === 0) {
    return { value: '', error: 'Workflow name is required' }
  }
  if (trimmed.length > WORKFLOW_NAME_MAX) {
    return { value: trimmed.slice(0, WORKFLOW_NAME_MAX), error: `Workflow name must be ${WORKFLOW_NAME_MAX} characters or fewer` }
  }
  return { value: trimmed, error: null }
}

// ────────────────────────────────────────────────────────────────────
// Undo / redo history (snapshots of nodes + edges)
// ────────────────────────────────────────────────────────────────────
interface HistorySnapshot {
  nodes: Node[]
  edges: Edge[]
  workflowName: string
}

const HISTORY_LIMIT = 50

interface HistoryState {
  past: HistorySnapshot[]
  future: HistorySnapshot[]
}

let history: HistoryState = { past: [], future: [] }

function snapshotState(state: WorkflowState): HistorySnapshot {
  return {
    nodes: state.nodes.map((n) => ({ ...n, data: { ...n.data } })),
    edges: state.edges.map((e) => ({ ...e })),
    workflowName: state.workflowName,
  }
}

function pushHistory(state: WorkflowState): void {
  const snap = snapshotState(state)
  history.past.push(snap)
  if (history.past.length > HISTORY_LIMIT) history.past.shift()
  history.future = []
}

// Strip transient UI state from a node before persisting to IndexedDB.
// We don't want to save `isThinking`, `isActive`, `lastOutput` (UI-only flags)
// because reloading them would show stale "thinking..." badges forever.
function stripTransientNodeState(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    if (!n.data) return n
    const data = n.data as Record<string, unknown>
    const next: Record<string, unknown> = { ...data }
    delete next.isThinking
    delete next.isActive
    delete next.lastOutput
    delete next.outputLog
    delete next.currentIteration
    delete next.totalIterations
    return { ...n, data: next as never }
  })
}

interface WorkflowState {
  nodes: Node[]
  edges: Edge[]
  workflowId: number | null
  workflowName: string
  isDirty: boolean
  lastSavedAt: number | null
  autosaveEnabled: boolean
  canUndo: boolean
  canRedo: boolean
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  addNode: (node: Node) => void
  updateNodeData: (nodeId: string, data: Partial<AgentNodeData | ToolNodeData | ChatNodeData>) => void
  setWorkflowName: (name: string) => void
  markDirty: () => void
  saveCurrentWorkflow: () => Promise<void>
  loadWorkflow: (id: number) => Promise<void>
  newWorkflow: () => void
  getWorkflowList: () => Promise<{ id: number; name: string; updatedAt: number; projectId?: string }[]>
  removeWorkflow: (id: number) => Promise<void>
  deleteNode: (nodeId: string) => void
  toggleNodeLock: (nodeId: string) => void
  deleteSelectedNodes: () => void
  exportWorkflowFile: () => void
  importWorkflowDocument: (document: WorkflowExportDocument) => void
  hasCanvasWork: () => boolean
  setAutosaveEnabled: (enabled: boolean) => void
  undo: () => void
  redo: () => void
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  workflowId: null,
  workflowName: 'Untitled Workflow',
  isDirty: false,
  lastSavedAt: null,
  autosaveEnabled: true,
  canUndo: false,
  canRedo: false,

  onNodesChange: (changes) => {
    const nodes = get().nodes
    const filtered = changes.filter((change) => !isLockedNodeChangeBlocked(change, nodes))
    // Only push history for meaningful changes (not just position drags of selected nodes)
    const hasRemovalOrAdd = changes.some((c) => c.type === 'remove' || c.type === 'add')
    if (hasRemovalOrAdd) pushHistory(get())
    set({ nodes: applyNodeChanges(filtered, nodes), isDirty: true, canUndo: history.past.length > 0, canRedo: history.future.length > 0 })
    void maybeAutosave(get)
  },

  onEdgesChange: (changes) => {
    const nodes = get().nodes
    const edges = get().edges
    let blockedLockedRemove = false
    const filtered = changes.filter((change) => {
      if (change.type !== 'remove') return true
      const edge = edges.find((e) => e.id === change.id)
      if (!edge) return true
      const source = nodes.find((n) => n.id === edge.source)
      const target = nodes.find((n) => n.id === edge.target)
      const blocked = isNodeCanvasLocked(source) || isNodeCanvasLocked(target)
      if (blocked) blockedLockedRemove = true
      return !blocked
    })
    if (blockedLockedRemove) {
      useConnectionStore.getState().recordRejection(NODE_CANVAS_LOCK_HINT)
      useDebugStore.getState().addLog({
        level: 'warn',
        source: 'Canvas',
        message: NODE_CANVAS_LOCK_HINT,
      })
    }
    const hasRemoval = changes.some((c) => c.type === 'remove')
    if (hasRemoval) pushHistory(get())
    set({ edges: applyEdgeChanges(filtered, edges), isDirty: true, canUndo: history.past.length > 0, canRedo: history.future.length > 0 })
    void maybeAutosave(get)
  },

  onConnect: (connection: Connection) => {
    const nodes = get().nodes
    const edges = get().edges
    const sourceNode = nodes.find((n) => n.id === connection.source)
    const targetNode = nodes.find((n) => n.id === connection.target)
    if (isNodeCanvasLocked(sourceNode) || isNodeCanvasLocked(targetNode)) {
      useConnectionStore.getState().recordRejection(NODE_CANVAS_LOCK_HINT)
      useDebugStore.getState().addLog({
        level: 'warn',
        source: 'Canvas',
        message: NODE_CANVAS_LOCK_HINT,
      })
      return
    }
    const normalized = normalizeConnection(connection, nodes)
    if (!normalized || !isValidWorkflowConnection(normalized, nodes, edges)) {
      const reason = describeConnectionRejection(connection, nodes, edges)
      if (reason) {
        useConnectionStore.getState().recordRejection(reason)
        useDebugStore.getState().addLog({
          level: 'warn',
          source: 'Canvas',
          message: reason,
        })
      }
      return
    }
    pushHistory(get())
    set({
      edges: addEdge({ ...normalized, type: 'animated' }, edges),
      isDirty: true,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    })
    void maybeAutosave(get)
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => {
    pushHistory(get())
    set({ nodes: [...get().nodes, withNodeCanvasLockFlags(node)], isDirty: true, canUndo: history.past.length > 0, canRedo: history.future.length > 0 })
    void maybeAutosave(get)
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== nodeId) return n
        const next = { ...n, data: { ...n.data, ...data } }
        return withNodeCanvasLockFlags(next)
      }),
      isDirty: true,
    })
    void maybeAutosave(get)
  },

  setWorkflowName: (name) => {
    const sanitized = sanitizeWorkflowName(name)
    set({ workflowName: sanitized.value, isDirty: true })
  },
  markDirty: () => set({ isDirty: true }),

  saveCurrentWorkflow: async () => {
    const { nodes, edges, workflowId, workflowName } = get()
    const sanitized = sanitizeWorkflowName(workflowName)
    if (sanitized.error) {
      toastEmitter.emit({ tone: 'warn', message: 'Cannot save', detail: sanitized.error })
      return
    }
    const projectId = useProjectStore.getState().currentProjectId
    let createdAt = Date.now()
    if (workflowId != null) {
      const existing = (await loadWorkflows()).find((w) => w.id === workflowId)
      if (existing) createdAt = existing.createdAt
    }
    // Strip transient UI state before persisting
    const persistableNodes = stripTransientNodeState(nodes)
    const id = await saveWorkflow({
      id: workflowId ?? undefined,
      name: sanitized.value,
      nodes: persistableNodes as never[],
      edges: edges as never[],
      createdAt,
      updatedAt: Date.now(),
      projectId,
    })
    set({ workflowId: id, isDirty: false, lastSavedAt: Date.now() })
    toastEmitter.emit({ tone: 'success', message: 'Workflow saved', detail: sanitized.value })
  },

  loadWorkflow: async (id) => {
    const workflows = await loadWorkflows()
    const workflow = workflows.find((w) => w.id === id)
    if (workflow) {
      // Reset history when loading a new workflow
      history = { past: [], future: [] }
      const nodes = workflow.nodes as unknown as Node[]
      const migrated = migrateWorkflow(nodes, workflow.edges as Edge[])
      set({
        nodes: migrated.nodes,
        edges: migrated.edges,
        workflowId: workflow.id ?? null,
        workflowName: workflow.name,
        isDirty: false,
        lastSavedAt: workflow.updatedAt,
        canUndo: false,
        canRedo: false,
      })
      // If the workflow belongs to a different project, switch to it
      if (workflow.projectId) {
        const projectStore = useProjectStore.getState()
        if (projectStore.currentProjectId !== workflow.projectId) {
          await projectStore.setCurrentProject(workflow.projectId)
        }
      }
      fitWorkflowView()
      toastEmitter.emit({ tone: 'info', message: 'Workflow loaded', detail: workflow.name })
    }
  },

  newWorkflow: () => {
    history = { past: [], future: [] }
    set({
      nodes: [],
      edges: [],
      workflowId: null,
      workflowName: 'Untitled Workflow',
      isDirty: false,
      lastSavedAt: null,
      canUndo: false,
      canRedo: false,
    })
  },

  getWorkflowList: async () => {
    const projectId = useProjectStore.getState().currentProjectId
    const workflows = await loadWorkflowsByProject(projectId)
    return workflows.map((w) => ({
      id: w.id!,
      name: w.name,
      updatedAt: w.updatedAt,
      projectId: w.projectId,
    }))
  },

  removeWorkflow: async (id) => {
    await deleteWorkflow(id)
    if (get().workflowId === id) {
      get().newWorkflow()
    }
  },

  deleteNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId)
    if (isNodeCanvasLocked(node)) return
    pushHistory(get())
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      isDirty: true,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    })
    void maybeAutosave(get)
  },

  toggleNodeLock: (nodeId) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== nodeId) return n
        const locked = !isNodeCanvasLocked(n)
        return withNodeCanvasLockFlags({ ...n, data: { ...n.data, locked } })
      }),
      isDirty: true,
    })
    void maybeAutosave(get)
  },

  deleteSelectedNodes: () => {
    const ids = new Set(
      get()
        .nodes.filter((n) => n.selected && !isNodeCanvasLocked(n))
        .map((n) => n.id)
    )
    if (ids.size === 0) return
    pushHistory(get())
    set({
      nodes: get().nodes.filter((n) => !ids.has(n.id)),
      edges: get().edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
      isDirty: true,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    })
    void maybeAutosave(get)
  },

  hasCanvasWork: () => {
    const { nodes, isDirty } = get()
    return nodes.length > 0 || isDirty
  },

  setAutosaveEnabled: (enabled) => set({ autosaveEnabled: enabled }),

  exportWorkflowFile: () => {
    const { nodes, edges, workflowName } = get()
    const doc = buildWorkflowExportDocument(workflowName, nodes, edges)
    downloadWorkflowExport(doc)
    useDebugStore.getState().addLog({
      level: 'success',
      source: 'Workflow',
      message: `Exported "${doc.workflow.name}" to .brainwire.json`,
    })
    toastEmitter.emit({ tone: 'success', message: 'Workflow exported', detail: `${doc.workflow.name}.brainwire.json` })
  },

  importWorkflowDocument: (document) => {
    const applied = applyImportedWorkflow(document)
    history = { past: [], future: [] }
    set({
      nodes: applied.nodes,
      edges: applied.edges,
      workflowName: applied.name,
      workflowId: null,
      isDirty: true,
      canUndo: false,
      canRedo: false,
    })
    useDebugStore.getState().addLog({
      level: 'success',
      source: 'Workflow',
      message: `Imported "${applied.name}" (${applied.nodes.length} blocks)`,
    })
    toastEmitter.emit({ tone: 'success', message: 'Workflow imported', detail: applied.name })
    fitWorkflowView()
  },

  undo: () => {
    if (history.past.length === 0) return
    const current = snapshotState(get())
    const previous = history.past.pop()!
    history.future.push(current)
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      workflowName: previous.workflowName,
      isDirty: true,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    })
    void maybeAutosave(get)
    toastEmitter.emit({ tone: 'info', message: 'Undo' })
  },

  redo: () => {
    if (history.future.length === 0) return
    const current = snapshotState(get())
    const next = history.future.pop()!
    history.past.push(current)
    set({
      nodes: next.nodes,
      edges: next.edges,
      workflowName: next.workflowName,
      isDirty: true,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    })
    void maybeAutosave(get)
    toastEmitter.emit({ tone: 'info', message: 'Redo' })
  },
}))

// ────────────────────────────────────────────────────────────────────
// Autosave — debounced. Triggers a save 4 seconds after the last change
// when autosave is enabled and the canvas has work.
// ────────────────────────────────────────────────────────────────────
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
function maybeAutosave(get: () => WorkflowState): void {
  const state = get()
  if (!state.autosaveEnabled) return
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(async () => {
    const s = get()
    if (!s.isDirty) return
    if (!s.hasCanvasWork()) return
    try {
      await s.saveCurrentWorkflow()
      useDebugStore.getState().addLog({
        level: 'info',
        source: 'Autosave',
        message: `Saved "${s.workflowName}"`,
      })
    } catch (err) {
      useDebugStore.getState().addLog({
        level: 'warn',
        source: 'Autosave',
        message: `Autosave failed: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }, 4000)
}
