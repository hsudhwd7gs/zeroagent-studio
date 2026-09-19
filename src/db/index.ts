import Dexie, { type EntityTable } from 'dexie'
import type { Workflow, ApiKeys, Project } from '../types'

const PERSONAL_PROJECT_ID = 'personal'

class BrainwireDB extends Dexie {
  workflows!: EntityTable<Workflow & { projectId?: string }, 'id'>
  settings!: EntityTable<{ id: string; apiKeys: ApiKeys }, 'id'>
  projects!: EntityTable<Project, 'id'>
  meta!: EntityTable<{ id: string; value: unknown }, 'id'>

  constructor() {
    super('Brainwire')
    // v1: original schema
    this.version(1).stores({
      workflows: '++id, name, updatedAt',
      settings: 'id',
    })
    // v2: add projects + projectId on workflows + meta table (auto-migrates)
    this.version(2).stores({
      workflows: '++id, name, updatedAt, projectId',
      settings: 'id',
      projects: 'id, name, updatedAt',
      meta: 'id',
    })
    // v3: rename legacy "ZeroAgentStudio" IndexedDB → "Brainwire" with one-time
    // data migration. Existing users keep their workflows + projects.
    this.version(3).stores({
      workflows: '++id, name, updatedAt, projectId',
      settings: 'id',
      projects: 'id, name, updatedAt',
      meta: 'id',
    })
  }
}

export const db = new BrainwireDB()

/**
 * One-time migration: copy data from the legacy `ZeroAgentStudio` IndexedDB
 * into the new `Brainwire` database. Idempotent — uses a `meta` flag so it
 * only runs once. Safe to call on every boot.
 */
export async function migrateLegacyZeroAgentDb(): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  const FLAG = 'legacy-zeroagent-migrated'
  try {
    const already = await db.meta.get(FLAG)
    if (already?.value === true) return

    // Probe for the legacy DB
    const dbs = await indexedDB.databases?.()
    const hasLegacy = dbs?.some((d) => d.name === 'ZeroAgentStudio')
    if (!hasLegacy) {
      await db.meta.put({ id: FLAG, value: true })
      return
    }

    // Open legacy DB read-only and copy records
    const legacy = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('ZeroAgentStudio')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
      req.onupgradeneeded = (event) => {
        // If the legacy DB doesn't exist, create an empty one to avoid errors
        const ldb = (event.target as IDBOpenDBRequest).result
        if (!ldb.objectStoreNames.contains('workflows')) ldb.createObjectStore('workflows', { keyPath: 'id', autoIncrement: true })
        if (!ldb.objectStoreNames.contains('settings')) ldb.createObjectStore('settings', { keyPath: 'id' })
        if (!ldb.objectStoreNames.contains('projects')) ldb.createObjectStore('projects', { keyPath: 'id' })
        if (!ldb.objectStoreNames.contains('meta')) ldb.createObjectStore('meta', { keyPath: 'id' })
      }
    })

    const copyStore = async (storeName: string) => {
      try {
        const tx = legacy.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const all = await new Promise<unknown[]>((res, rej) => {
          const r = store.getAll()
          r.onsuccess = () => res(r.result as unknown[])
          r.onerror = () => rej(r.error)
        })
        if (Array.isArray(all) && all.length > 0) {
          await db.table(storeName).bulkPut(all as never[])
        }
      } catch (err) {
        console.warn(`[Brainwire] Skipping legacy store ${storeName}:`, err)
      }
    }

    await copyStore('projects')
    await copyStore('workflows')
    await copyStore('settings')
    await copyStore('meta')

    await db.meta.put({ id: FLAG, value: true })
    console.info('[Brainwire] Migrated legacy IndexedDB data to new Brainwire database.')
  } catch (err) {
    console.warn('[Brainwire] Legacy DB migration skipped:', err)
  }
}

/** Ensure the user always has a default Personal project. Idempotent. */
export async function ensureDefaultProject(): Promise<void> {
  const existing = await db.projects.get(PERSONAL_PROJECT_ID)
  if (!existing) {
    const now = Date.now()
    await db.projects.put({
      id: PERSONAL_PROJECT_ID,
      name: 'Personal',
      color: '#8b5cf6',
      emoji: '★',
      createdAt: now,
      updatedAt: now,
    })
  }
}

// ─────────────────────────────────────────────────────────────
// Workflows
// ─────────────────────────────────────────────────────────────

export async function saveWorkflow(
  workflow: Omit<Workflow, 'id'> & { id?: number; projectId?: string }
): Promise<number> {
  const now = Date.now()
  const projectId = workflow.projectId ?? PERSONAL_PROJECT_ID
  if (workflow.id) {
    await db.workflows.update(workflow.id, { ...workflow, projectId, updatedAt: now })
    return workflow.id
  }
  const id = await db.workflows.add({ ...workflow, projectId, createdAt: now, updatedAt: now })
  return id as number
}

export async function loadWorkflows(): Promise<Workflow[]> {
  return db.workflows.orderBy('updatedAt').reverse().toArray()
}

export async function loadWorkflowsByProject(projectId: string): Promise<Workflow[]> {
  return db.workflows
    .where('projectId')
    .equals(projectId)
    .reverse()
    .sortBy('updatedAt')
    .then((arr) => arr.reverse())
}

export async function deleteWorkflow(id: number): Promise<void> {
  await db.workflows.delete(id)
}

export async function clearAllWorkflows(): Promise<void> {
  await db.workflows.clear()
}

// ─────────────────────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────────────────────

export async function listProjects(): Promise<Project[]> {
  await ensureDefaultProject()
  return db.projects.orderBy('updatedAt').reverse().toArray()
}

export async function saveProject(project: Project): Promise<void> {
  await db.projects.put({ ...project, updatedAt: Date.now() })
}

export async function deleteProject(id: string): Promise<void> {
  if (id === PERSONAL_PROJECT_ID) throw new Error('Cannot delete the Personal project')
  // Move all workflows in this project to Personal before deleting
  const wfs = await loadWorkflowsByProject(id)
  await db.transaction('rw', db.workflows, db.projects, async () => {
    for (const w of wfs) {
      if (w.id != null) {
        await db.workflows.update(w.id, { projectId: PERSONAL_PROJECT_ID })
      }
    }
    await db.projects.delete(id)
  })
}

// ─────────────────────────────────────────────────────────────
// API keys (unchanged — kept in `settings` table)
// ─────────────────────────────────────────────────────────────

export async function saveApiKeys(apiKeys: ApiKeys): Promise<void> {
  await db.settings.put({ id: 'api-keys', apiKeys })
}

export async function loadApiKeys(): Promise<ApiKeys> {
  const record = await db.settings.get('api-keys')
  return record?.apiKeys ?? {}
}

export async function deleteApiKeys(): Promise<void> {
  await db.settings.delete('api-keys')
}

export async function hasIndexedDbApiKeys(): Promise<boolean> {
  const record = await db.settings.get('api-keys')
  const keys = record?.apiKeys
  if (!keys) return false
  return !!(keys.openrouter?.trim() || keys.groq?.trim() || keys.gemini?.trim())
}

// ─────────────────────────────────────────────────────────────
// Meta — small KV store for UI state (last project, layout prefs, etc.)
// ─────────────────────────────────────────────────────────────

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const record = await db.meta.get(key)
  return (record?.value as T) ?? fallback
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  await db.meta.put({ id: key, value })
}
