import type { ApiKeys, BrainType } from '../types'
import { isBrainAvailable } from './brainResolver'
import { OPENROUTER_FREE_ROUTER } from './modelRotation'

export interface BrainOptionSetup {
  brain: BrainType
  optionLabel: string
  available: boolean
  setupMessage: string | null
}

const BRAIN_ORDER: BrainType[] = ['openrouter', 'transformers', 'local', 'groq', 'gemini']

const BRAIN_OPTION_LABELS: Record<BrainType, string> = {
  openrouter: 'OpenRouter — recommended (free with key)',
  transformers: 'Transformers.js — local (downloads on first use)',
  local: 'WebLLM — slow local fallback (large download)',
  groq: 'Groq — optional free cloud key',
  gemini: 'Gemini — optional free cloud key',
}

export function getBrainSetupMessage(brain: BrainType, apiKeys: ApiKeys = {}): string | null {
  if (isBrainAvailable(brain, apiKeys)) return null

  switch (brain) {
    case 'openrouter':
      return 'No OpenRouter key saved. Open Privacy & keys and paste a free key from openrouter.ai/keys (recommended) — or choose Transformers.js for local inference (downloads on first use).'
    case 'groq':
      return 'No Groq key saved. Open Privacy & keys and paste one from console.groq.com (free tier).'
    case 'gemini':
      return 'No Gemini key saved. Open Privacy & keys and paste one from aistudio.google.com (free tier).'
    case 'local':
      return 'WebGPU is not available in this browser. Use Transformers.js for local AI, or try Chrome/Edge on a device with graphics acceleration.'
    default:
      return 'This engine is not available on this device.'
  }
}

export function listBrainOptions(apiKeys: ApiKeys = {}): BrainOptionSetup[] {
  return BRAIN_ORDER.map((brain) => ({
    brain,
    optionLabel: BRAIN_OPTION_LABELS[brain],
    available: isBrainAvailable(brain, apiKeys),
    setupMessage: getBrainSetupMessage(brain, apiKeys),
  }))
}

/** Short label on the Agent block — shows lock when engine is not ready. */
export function getAgentBrainBadgeLabel(
  brain: BrainType,
  apiKeys: ApiKeys = {},
  model?: string
): { text: string; locked: boolean } {
  if (!isBrainAvailable(brain, apiKeys)) {
    const short: Record<BrainType, string> = {
      openrouter: 'OR',
      groq: 'Groq',
      gemini: 'Gemini',
      local: 'WebLLM',
      transformers: 'Local',
    }
    return { text: `🔒 ${short[brain] ?? brain}`, locked: true }
  }

  if (brain === 'openrouter') {
    const auto =
      model === OPENROUTER_FREE_ROUTER || model === 'openrouter/free' || !model
    return { text: auto ? 'OR auto' : 'OR :free', locked: false }
  }
  if (brain === 'transformers') return { text: 'Local', locked: false }
  if (brain === 'local') return { text: 'WebLLM', locked: false }
  if (brain === 'groq') return { text: 'Groq free', locked: false }
  if (brain === 'gemini') return { text: 'Gemini free', locked: false }
  return { text: brain, locked: false }
}
