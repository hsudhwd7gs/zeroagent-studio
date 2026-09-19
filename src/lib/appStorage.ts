import { clearAllWorkflows } from '../db'
import { clearAllStoredApiKeys, saveKeyPersistencePreference } from './keyStorage'
import { DEFAULT_KEY_PERSISTENCE } from './keyPersistenceGuidance'
import { OPENROUTER_MODELS_CACHE_KEY } from '../engines/openrouter'
import { OPENROUTER_EMBEDDINGS_CACHE_KEY } from '../tools/openrouterEmbeddings'
import { MODEL_COOLDOWN_KEY } from './modelRotation'
import { PALETTE_COLLAPSED_STORAGE_KEY } from './paletteCollapse'
import {
  getTutorialCompletedKey,
  LEGACY_TUTORIAL_COMPLETED_KEY,
} from './tutorialQuests'

export const WELCOME_DISMISSED_KEY = 'zeroagent-welcome-dismissed'
export const CANVAS_HINT_DISMISSED_KEY = 'zeroagent-canvas-hint-dismissed'
export const EXAMPLE_TRY_PROMPT_HINT_KEY = 'zeroagent-example-try-prompt-hint'
export const EXAMPLE_LOADED_EVENT = 'zeroagent-example-loaded'
export const PRIVACY_CONSENT_KEY = 'zeroagent-privacy-consent-accepted'
export const AGENT_SETUP_ADVICE_KEY = 'zeroagent-agent-setup-advice-seen'

export const APP_STORAGE_CLEARED_EVENT = 'zeroagent-app-storage-cleared'

export type AppStorageCategoryId =
  | 'api-keys'
  | 'workflows'
  | 'tutorial-progress'
  | 'ui-preferences'
  | 'model-cache'
  | 'model-cooldowns'
  | 'key-preference'

export type AppStorageLocation = 'session' | 'local' | 'indexeddb' | 'mixed'

export interface AppStorageCategory {
  id: AppStorageCategoryId
  label: string
  description: string
  storageType: AppStorageLocation
  securityNote: string
  configurable: boolean
}

import { QUEST_IDS } from './tutorialQuests'

export const APP_STORAGE_QUEST_IDS = QUEST_IDS

/** Startup notice + data inventory — keep in sync with docs/SECURITY.md */
export const LOCAL_DATA_PRIVACY = {
  title: 'Your data stays in your browser',
  lead:
    'Brainwire has no accounts, no analytics, and no servers that store your workflows. Everything below lives only on this device until you clear it.',
} as const

export const APP_STORAGE_CATEGORIES: AppStorageCategory[] = [
  {
    id: 'api-keys',
    label: 'API keys',
    description: 'Optional OpenRouter, Groq, and Gemini keys you paste for cloud tools.',
    storageType: 'mixed',
    securityNote:
      'Default: keys close with the browser. Opt in below to remember them until you clear site data.',
    configurable: true,
  },
  {
    id: 'workflows',
    label: 'Saved workflows',
    description: 'Canvas layouts you explicitly saved with Save or Load.',
    storageType: 'indexeddb',
    securityNote: 'Stays on this browser until you delete them or clear site data.',
    configurable: false,
  },
  {
    id: 'tutorial-progress',
    label: 'Quest completion',
    description: 'Which guided quests you finished or skipped.',
    storageType: 'local',
    securityNote: 'Low sensitivity — only tracks which tutorials you completed.',
    configurable: false,
  },
  {
    id: 'ui-preferences',
    label: 'UI choices',
    description: 'Welcome banner dismissed, canvas hints, palette accordion, and onboarding notices.',
    storageType: 'local',
    securityNote: 'Cosmetic preferences — no workflow or key data.',
    configurable: false,
  },
  {
    id: 'model-cache',
    label: 'Model list cache',
    description: 'Cached OpenRouter free-model lists (24h) to reduce API calls.',
    storageType: 'local',
    securityNote: 'Public model names only — no keys or chat content.',
    configurable: false,
  },
  {
    id: 'model-cooldowns',
    label: 'Rate-limit cooldowns',
    description: 'Temporary cooldown timers when free models hit limits.',
    storageType: 'session',
    securityNote: 'Gone when you close the tab — helps rotation during one session.',
    configurable: false,
  },
  {
    id: 'key-preference',
    label: 'Key save mode',
    description: 'Whether you chose “forget on close” or “remember on this device”.',
    storageType: 'local',
    securityNote: 'A small preference flag — not the keys themselves.',
    configurable: false,
  },
]

export function getAppStorageCategory(id: AppStorageCategoryId): AppStorageCategory | undefined {
  return APP_STORAGE_CATEGORIES.find((category) => category.id === id)
}

export function getStorageRetentionLabel(
  type: AppStorageLocation,
  keyPersistence?: 'session' | 'local'
): string {
  if (type === 'mixed') {
    return keyPersistence === 'local' ? 'Until you clear' : 'Closes with browser'
  }
  if (type === 'session') return 'Closes with browser'
  return 'Until you clear'
}

export function hasPrivacyConsent(): boolean {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(PRIVACY_CONSENT_KEY) === '1'
}

export function markPrivacyConsent(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PRIVACY_CONSENT_KEY, '1')
}

export function clearPrivacyConsent(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(PRIVACY_CONSENT_KEY)
}

export function hasAgentSetupAdvice(): boolean {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(AGENT_SETUP_ADVICE_KEY) === '1'
}

export function markAgentSetupAdvice(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(AGENT_SETUP_ADVICE_KEY, '1')
}

export function clearAgentSetupAdvice(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(AGENT_SETUP_ADVICE_KEY)
}

function dispatchStorageCleared(categories: AppStorageCategoryId[]): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(APP_STORAGE_CLEARED_EVENT, { detail: { categories } })
  )
}

export function clearTutorialProgress(): void {
  if (typeof localStorage === 'undefined') return
  for (const questId of APP_STORAGE_QUEST_IDS) {
    localStorage.removeItem(getTutorialCompletedKey(questId))
  }
  localStorage.removeItem(LEGACY_TUTORIAL_COMPLETED_KEY)
}

export function clearUiPreferences(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(WELCOME_DISMISSED_KEY)
  localStorage.removeItem(CANVAS_HINT_DISMISSED_KEY)
  localStorage.removeItem(PALETTE_COLLAPSED_STORAGE_KEY)
}

export function clearModelCache(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(OPENROUTER_MODELS_CACHE_KEY)
  localStorage.removeItem(OPENROUTER_EMBEDDINGS_CACHE_KEY)
}

export function clearModelCooldowns(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(MODEL_COOLDOWN_KEY)
}

export function clearKeyPreference(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem('zeroagent-key-persistence')
}

export interface ClearCategoryOptions {
  clearApiKeys?: () => Promise<void>
  resetWorkflowCanvas?: () => void
  resetKeyPersistence?: () => Promise<void>
}

export async function clearAppStorageCategory(
  id: AppStorageCategoryId,
  options: ClearCategoryOptions = {}
): Promise<void> {
  switch (id) {
    case 'api-keys':
      if (options.clearApiKeys) {
        await options.clearApiKeys()
      } else {
        await clearAllStoredApiKeys()
      }
      break
    case 'workflows':
      await clearAllWorkflows()
      options.resetWorkflowCanvas?.()
      break
    case 'tutorial-progress':
      clearTutorialProgress()
      break
    case 'ui-preferences':
      clearUiPreferences()
      break
    case 'model-cache':
      clearModelCache()
      break
    case 'model-cooldowns':
      clearModelCooldowns()
      break
    case 'key-preference':
      clearKeyPreference()
      if (options.resetKeyPersistence) {
        await options.resetKeyPersistence()
      } else {
        saveKeyPersistencePreference(DEFAULT_KEY_PERSISTENCE)
      }
      break
  }

  dispatchStorageCleared([id])
}

export async function clearAllAppData(options: ClearCategoryOptions = {}): Promise<void> {
  const ids = APP_STORAGE_CATEGORIES.map((category) => category.id)
  for (const id of ids) {
    await clearAppStorageCategory(id, options)
  }
  clearPrivacyConsent()
  clearAgentSetupAdvice()
  dispatchStorageCleared(ids)
}
