import type { Edge, Node } from '@xyflow/react'
import { migrateWorkflow } from './workflowMigration'

export const WORKFLOW_EXPORT_FORMAT = 'brainwire-workflow' as const
export const WORKFLOW_EXPORT_VERSION = 1

/** Patterns that look like API keys accidentally pasted into workflow config. */
const EMBEDDED_SECRET_PATTERN =
  /\b(sk-or-[A-Za-z0-9_-]{8,}|gsk_[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{20,})\b/

export function looksLikeEmbeddedSecret(value: string): boolean {
  return EMBEDDED_SECRET_PATTERN.test(value)
}

const REDACTED_SECRET = '[REDACTED on export — do not store API keys in workflows]'

function redactSecretsInValue(value: unknown): { value: unknown; changed: boolean } {
  if (typeof value === 'string') {
    if (looksLikeEmbeddedSecret(value)) {
      return { value: REDACTED_SECRET, changed: true }
    }
    return { value, changed: false }
  }
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const result = redactSecretsInValue(item)
      if (result.changed) changed = true
      return result.value
    })
    return { value: changed ? next : value, changed }
  }
  if (value && typeof value === 'object') {
    let changed = false
    const next: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      const result = redactSecretsInValue(nested)
      if (result.changed) changed = true
      next[key] = result.value
    }
    return { value: changed ? next : value, changed }
  }
  return { value, changed: false }
}

export function redactSecretsInNodes(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    const data = node.data
    if (!data || typeof data !== 'object') return node
    const redacted = redactSecretsInValue(data)
    if (!redacted.changed) return node
    return { ...node, data: redacted.value as typeof node.data }
  })
}

export interface WorkflowExportPayload {
  name: string
  nodes: Node[]
  edges: Edge[]
}

export interface WorkflowExportDocument {
  format: typeof WORKFLOW_EXPORT_FORMAT
  version: number
  exportedAt: number
  workflow: WorkflowExportPayload
}

export type WorkflowParseResult =
  | { ok: true; document: WorkflowExportDocument }
  | { ok: false; error: string }

export function buildWorkflowExportDocument(
  name: string,
  nodes: Node[],
  edges: Edge[]
): WorkflowExportDocument {
  return {
    format: WORKFLOW_EXPORT_FORMAT,
    version: WORKFLOW_EXPORT_VERSION,
    exportedAt: Date.now(),
    workflow: {
      name: name.trim() || 'Untitled Workflow',
      nodes: redactSecretsInNodes(structuredClone(nodes)),
      edges: structuredClone(edges),
    },
  }
}

export function parseWorkflowExport(raw: string): WorkflowParseResult {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'File is not valid JSON.' }
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Workflow file is empty or malformed.' }
  }

  const record = data as Record<string, unknown>

  // Accept both new "brainwire-workflow" and legacy "zeroagent-workflow" format identifiers
  if (record.format === WORKFLOW_EXPORT_FORMAT || record.format === 'zeroagent-workflow') {
    const version = record.version
    if (typeof version !== 'number' || version > WORKFLOW_EXPORT_VERSION) {
      return { ok: false, error: 'This workflow file was exported from a newer app version.' }
    }
    const workflow = record.workflow
    if (!workflow || typeof workflow !== 'object') {
      return { ok: false, error: 'Workflow file is missing workflow data.' }
    }
    const wf = workflow as Record<string, unknown>
    const nodes = wf.nodes
    const edges = wf.edges
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return { ok: false, error: 'Workflow must include nodes and edges arrays.' }
    }
    const name = typeof wf.name === 'string' ? wf.name : 'Imported Workflow'
    return {
      ok: true,
      document: {
        format: WORKFLOW_EXPORT_FORMAT,
        version,
        exportedAt: typeof record.exportedAt === 'number' ? record.exportedAt : Date.now(),
        workflow: { name, nodes: nodes as Node[], edges: edges as Edge[] },
      },
    }
  }

  // Legacy: raw { name?, nodes, edges } without format wrapper
  if (Array.isArray(record.nodes) && Array.isArray(record.edges)) {
    const name = typeof record.name === 'string' ? record.name : 'Imported Workflow'
    return {
      ok: true,
      document: buildWorkflowExportDocument(name, record.nodes as Node[], record.edges as Edge[]),
    }
  }

  return {
    ok: false,
    error: 'Unrecognized workflow file. Export from Brainwire (.brainwire.json).',
  }
}

export function sanitizeWorkflowFilename(name: string): string {
  const base = name
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64)
  return base || 'workflow'
}

export function downloadWorkflowExport(doc: WorkflowExportDocument): void {
  const filename = `${sanitizeWorkflowFilename(doc.workflow.name)}.brainwire.json`
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function applyImportedWorkflow(document: WorkflowExportDocument): {
  nodes: Node[]
  edges: Edge[]
  name: string
} {
  const migrated = migrateWorkflow(document.workflow.nodes, document.workflow.edges)
  return {
    nodes: migrated.nodes,
    edges: migrated.edges,
    name: document.workflow.name.trim() || 'Imported Workflow',
  }
}
