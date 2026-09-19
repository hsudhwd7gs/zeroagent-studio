import type { BrainType, ApiKeys } from '../types'
import { isWebGPUAvailable } from '../engines/webllm'
import {
  DEFAULT_OPENROUTER_FREE_MODEL,
  OPENROUTER_FREE_ROUTER,
} from '../engines/openrouter'
import { AUTO_ROTATE_MODEL } from './modelRotation'

export const DEFAULT_LOCAL_WEBLLM_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
export const DEFAULT_TRANSFORMERS_MODEL = 'Xenova/distilgpt2'
export { DEFAULT_OPENROUTER_FREE_MODEL, OPENROUTER_FREE_ROUTER, AUTO_ROTATE_MODEL }

export interface ResolvedBrain {
  brain: BrainType
  model?: string
  fallbackNote?: string
}

/** Whether the user can run this brain as configured (key, WebGPU, etc.). */
export function isBrainAvailable(brain: BrainType, apiKeys: ApiKeys = {}): boolean {
  switch (brain) {
    case 'local':
      return isWebGPUAvailable()
    case 'transformers':
      return true
    case 'openrouter':
      return !!apiKeys.openrouter?.trim()
    case 'groq':
      return !!apiKeys.groq?.trim()
    case 'gemini':
      return !!apiKeys.gemini?.trim()
    default:
      return false
  }
}

/** CPU-friendly local fallback — avoids heavy WebLLM download. */
export function pickBestFreeBrain(): ResolvedBrain {
  return {
    brain: 'transformers',
    model: DEFAULT_TRANSFORMERS_MODEL,
  }
}

/** Default for newly created agent nodes — OpenRouter-first when key is saved. */
export function getDefaultAgentBrain(apiKeys: ApiKeys = {}): ResolvedBrain {
  if (apiKeys.openrouter?.trim()) {
    return { brain: 'openrouter', model: OPENROUTER_FREE_ROUTER }
  }
  return pickBestFreeBrain()
}

/**
 * Resolve requested brain; if unavailable, fall back to a free local engine
 * instead of failing the whole workflow.
 */
export function resolveAgentBrain(
  requested: BrainType,
  apiKeys: ApiKeys,
  model?: string
): ResolvedBrain {
  if (isBrainAvailable(requested, apiKeys)) {
    if (requested === 'openrouter' && (!model || model === AUTO_ROTATE_MODEL)) {
      return { brain: requested, model: OPENROUTER_FREE_ROUTER }
    }
    if ((requested === 'groq' || requested === 'gemini') && model === AUTO_ROTATE_MODEL) {
      return { brain: requested, model: undefined }
    }
    return { brain: requested, model }
  }

  const free = pickBestFreeBrain()
  const labels: Record<BrainType, string> = {
    local: 'WebLLM (WebGPU)',
    transformers: 'Transformers.js',
    openrouter: 'OpenRouter',
    groq: 'Groq',
    gemini: 'Gemini',
  }

  let hint = ''
  switch (requested) {
    case 'openrouter':
      hint = ' Add a free key at openrouter.ai/keys — their :free models are free.'
      break
    case 'groq':
      hint = ' Groq offers a generous free tier at console.groq.com.'
      break
    case 'gemini':
      hint = ' Gemini API has a free tier at aistudio.google.com.'
      break
    case 'local':
      hint = ' WebGPU not detected — using CPU-friendly Transformers.js instead.'
      break
    default:
      break
  }

  return {
    ...free,
    // v8 ignore next -- pickBestFreeBrain always supplies model; branch keeps API stable if that changes
    model: free.model ?? model,
    fallbackNote:
      `${labels[requested]} unavailable on this device.${hint} ` +
      `Using free ${labels[free.brain]} — no key needed.`,
  }
}

export function getBrainCostLabel(brain: BrainType): string {
  switch (brain) {
    case 'local':
      return 'slow local fallback'
    case 'transformers':
      return 'local'
    case 'openrouter':
      return 'recommended'
    case 'groq':
    case 'gemini':
      return 'free tier'
    default:
      return ''
  }
}
