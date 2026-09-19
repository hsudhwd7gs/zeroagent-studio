import { create } from 'zustand'
import type { Project } from '../types'
import { DEFAULT_PROJECT, DEFAULT_PROJECT_ID } from '../types'
import { listProjects, saveProject, deleteProject } from '../db'
import { getMeta, setMeta } from '../db'
import { migrateLegacyZeroAgentDb } from '../db'

const LAST_PROJECT_KEY = 'meta:lastProjectId'

interface ProjectState {
  projects: Project[]
  currentProjectId: string
  currentProject: Project
  isLoaded: boolean

  init: () => Promise<void>
  refresh: () => Promise<void>
  setCurrentProject: (id: string) => Promise<void>
  createProject: (name: string, color?: string, emoji?: string) => Promise<Project>
  renameProject: (id: string, name: string) => Promise<void>
  recolorProject: (id: string, color: string, emoji?: string) => Promise<void>
  removeProject: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [DEFAULT_PROJECT],
  currentProjectId: DEFAULT_PROJECT_ID,
  currentProject: DEFAULT_PROJECT,
  isLoaded: false,

  init: async () => {
    await migrateLegacyZeroAgentDb()
    await get().refresh()
    const lastId = await getMeta<string>(LAST_PROJECT_KEY, DEFAULT_PROJECT_ID)
    // Make sure the last project still exists
    const exists = get().projects.some((p) => p.id === lastId)
    const id = exists ? lastId : DEFAULT_PROJECT_ID
    const current = get().projects.find((p) => p.id === id) ?? DEFAULT_PROJECT
    set({ currentProjectId: id, currentProject: current, isLoaded: true })
  },

  refresh: async () => {
    const projects = await listProjects()
    set({ projects })
    const current = projects.find((p) => p.id === get().currentProjectId) ?? DEFAULT_PROJECT
    set({ currentProject: current })
  },

  setCurrentProject: async (id) => {
    const projects = get().projects
    const current = projects.find((p) => p.id === id) ?? DEFAULT_PROJECT
    set({ currentProjectId: id, currentProject: current })
    await setMeta(LAST_PROJECT_KEY, id)
  },

  createProject: async (name, color = '#06b6d4', emoji = '◆') => {
    const id = (name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36)).replace(/^-+|-+$/g, '')
    const now = Date.now()
    const project: Project = {
      id,
      name: name.trim(),
      color,
      emoji,
      createdAt: now,
      updatedAt: now,
    }
    await saveProject(project)
    await get().refresh()
    await get().setCurrentProject(id)
    return project
  },

  renameProject: async (id, name) => {
    const existing = get().projects.find((p) => p.id === id)
    if (!existing) return
    await saveProject({ ...existing, name: name.trim() })
    await get().refresh()
  },

  recolorProject: async (id, color, emoji) => {
    const existing = get().projects.find((p) => p.id === id)
    if (!existing) return
    await saveProject({ ...existing, color, emoji: emoji ?? existing.emoji })
    await get().refresh()
  },

  removeProject: async (id) => {
    if (id === DEFAULT_PROJECT_ID) return
    await deleteProject(id)
    if (get().currentProjectId === id) {
      await get().setCurrentProject(DEFAULT_PROJECT_ID)
    }
    await get().refresh()
  },
}))
