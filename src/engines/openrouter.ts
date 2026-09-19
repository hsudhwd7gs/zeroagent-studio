import type { BrainEngine, ChatMessage, EngineOptions, EngineResult } from './types'
import {
  AUTO_ROTATE_MODEL,
  OPENROUTER_FREE_ROUTER,
  buildRotationPlan,
  chatWithModelRotation,
} from '../lib/modelRotation'

export { OPENROUTER_FREE_ROUTER, AUTO_ROTATE_MODEL }

export const OPENROUTER_MODELS_CACHE_KEY = 'brainwire-or-free-models'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/** Curated fallback list — refreshed periodically via fetchOpenRouterFreeModels */
export const OPENROUTER_CURATED_FREE_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'google/gemma-3-27b-it:free',
  'qwen/qwen3-4b:free',
  'deepseek/deepseek-r1:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-4-maverick:free',
  'x-ai/grok-3-mini-beta:free',
  'z-ai/glm-4-32b:free',
]

export const OPENROUTER_FREE_MODELS = [
  OPENROUTER_FREE_ROUTER,
  ...OPENROUTER_CURATED_FREE_MODELS,
]

export const DEFAULT_OPENROUTER_FREE_MODEL = OPENROUTER_FREE_ROUTER

interface ModelsCache {
  models: string[]
  fetchedAt: number
}

function readModelsCache(): ModelsCache | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(OPENROUTER_MODELS_CACHE_KEY)
    return raw ? (JSON.parse(raw) as ModelsCache) : null
  } catch {
    return null
  }
}

function writeModelsCache(models: string[]): void {
  if (typeof localStorage === 'undefined') return
  const entry: ModelsCache = { models, fetchedAt: Date.now() }
  localStorage.setItem(OPENROUTER_MODELS_CACHE_KEY, JSON.stringify(entry))
}

export function getCachedOpenRouterFreeModels(): string[] {
  const cache = readModelsCache()
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS && cache.models.length > 0) {
    return cache.models
  }
  return OPENROUTER_CURATED_FREE_MODELS
}

export async function fetchOpenRouterFreeModels(apiKey: string): Promise<string[]> {
  if (!apiKey.trim()) return OPENROUTER_CURATED_FREE_MODELS

  const cached = readModelsCache()
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS && cached.models.length > 0) {
    return cached.models
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!response.ok) return getCachedOpenRouterFreeModels()

    const data = (await response.json()) as {
      data?: Array<{ id: string; pricing?: { prompt?: string; completion?: string } }>
    }

    const free = (data.data ?? [])
      .filter((m) => {
        if (m.id.endsWith(':free')) return true
        const prompt = Number(m.pricing?.prompt ?? 1)
        const completion = Number(m.pricing?.completion ?? 1)
        return prompt === 0 && completion === 0
      })
      .map((m) => m.id)
      .filter((id) => id !== OPENROUTER_FREE_ROUTER)

    if (free.length > 0) {
      writeModelsCache(free)
      return free
    }
  } catch {
    // fall through to cache/curated
  }

  return getCachedOpenRouterFreeModels()
}

export function resetOpenRouterModelsCacheForTests(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(OPENROUTER_MODELS_CACHE_KEY)
  }
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options?: EngineOptions
): Promise<EngineResult> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      'X-Title': 'Brainwire',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 512,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    model: data.model ?? model,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
        }
      : undefined,
  }
}

export function createOpenRouterEngine(apiKey: string): BrainEngine {
  return {
    name: 'OpenRouter',

    isAvailable: () => !!apiKey,

    async chat(messages: ChatMessage[], options?: EngineOptions): Promise<EngineResult> {
      const catalog = await fetchOpenRouterFreeModels(apiKey)
      const preferred =
        !options?.model || options.model === AUTO_ROTATE_MODEL
          ? OPENROUTER_FREE_ROUTER
          : options.model

      const plan = buildRotationPlan(preferred, catalog, { includeFreeRouter: true })

      const { result } = await chatWithModelRotation({
        plan,
        messages,
        options,
        onRetry: options?.onModelRetry,
        chatFn: (model, msgs, opts) => callOpenRouter(apiKey, model, msgs, opts),
      })

      return result
    },
  }
}
