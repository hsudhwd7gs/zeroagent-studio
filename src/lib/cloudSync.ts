// Cloud sync — push/pull projects + workflows to/from the Cloudflare worker.
// Falls back gracefully (no-op) when the worker endpoint is unavailable.

import type { Project, Workflow } from '../types'

const WORKER_ORIGIN = typeof window !== 'undefined' ? window.location.origin : ''

export interface SyncSnapshot {
  projects: Project[]
  workflows: Workflow[]
}

export async function pullFromCloud(): Promise<SyncSnapshot | null> {
  if (!WORKER_ORIGIN) return null
  try {
    const res = await fetch(`${WORKER_ORIGIN}/api/sync`, { method: 'GET' })
    if (!res.ok) return null
    const data = await res.json() as { ok: boolean; projects: Project[]; workflows: any[] }
    if (!data.ok) return null
    // Normalize workflow shape (worker stores nodes/edges as strings or already parsed)
    const workflows: Workflow[] = (data.workflows ?? []).map((w: any) => ({
      id: w.id,
      name: w.name,
      projectId: w.project_id ?? w.projectId,
      nodes: typeof w.nodes === 'string' ? safeParse(w.nodes, []) : w.nodes ?? [],
      edges: typeof w.edges === 'string' ? safeParse(w.edges, []) : w.edges ?? [],
      createdAt: w.created_at ?? w.createdAt ?? Date.now(),
      updatedAt: w.updated_at ?? w.updatedAt ?? Date.now(),
    })) as Workflow[]
    return { projects: data.projects ?? [], workflows }
  } catch {
    return null
  }
}

export async function pushToCloud(snapshot: SyncSnapshot): Promise<boolean> {
  if (!WORKER_ORIGIN) return false
  try {
    const payload = {
      projects: snapshot.projects.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      })),
      workflows: snapshot.workflows.map((w) => ({
        id: String(w.id ?? ''),
        project_id: w.projectId ?? 'personal',
        name: w.name,
        nodes: JSON.stringify(w.nodes ?? []),
        edges: JSON.stringify(w.edges ?? []),
        created_at: w.createdAt,
        updated_at: w.updatedAt,
      })),
    }
    const res = await fetch(`${WORKER_ORIGIN}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch {
    return false
  }
}

function safeParse(s: string, fallback: unknown): unknown {
  try { return JSON.parse(s) } catch { return fallback }
}
