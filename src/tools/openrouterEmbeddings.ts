import { cosineSimilarity, summarizeVector } from '../lib/vectorMath'

export const OPENROUTER_EMBEDDINGS_CACHE_KEY = 'brainwire-or-embedding-models'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const DEFAULT_EMBEDDING_MODEL = 'openai/text-embedding-3-small'

interface EmbeddingModelsCache {
  models: string[]
  fetchedAt: number
}

function readCache(): EmbeddingModelsCache | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(OPENROUTER_EMBEDDINGS_CACHE_KEY)
    return raw ? (JSON.parse(raw) as EmbeddingModelsCache) : null
  } catch {
    return null
  }
}

function writeCache(models: string[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(
    OPENROUTER_EMBEDDINGS_CACHE_KEY,
    JSON.stringify({ models, fetchedAt: Date.now() })
  )
}

export async function fetchOpenRouterEmbeddingModels(apiKey: string): Promise<string[]> {
  const cached = readCache()
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS && cached.models.length > 0) {
    return cached.models
  }

  if (!apiKey.trim()) return [DEFAULT_EMBEDDING_MODEL]

  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!response.ok) return cached?.models ?? [DEFAULT_EMBEDDING_MODEL]

    const data = (await response.json()) as { data?: Array<{ id: string }> }
    const models = (data.data ?? []).map((m) => m.id).filter(Boolean)
    if (models.length > 0) {
      writeCache(models)
      return models
    }
  } catch {
    // fall through
  }

  return cached?.models ?? [DEFAULT_EMBEDDING_MODEL]
}

export async function embedTextWithOpenRouter(
  apiKey: string,
  text: string,
  model: string
): Promise<number[]> {
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: text }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter embeddings error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const values = data.data?.[0]?.embedding as number[] | undefined
  if (!values?.length) throw new Error('OpenRouter returned empty embedding')
  return values
}

export async function runOpenRouterEmbeddings(
  apiKey: string,
  input: string,
  config: Record<string, string>
): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error('Add an OpenRouter API key in Settings to use embeddings')
  }

  const mode = config.mode ?? 'similarity'
  const text = input.trim()
  if (!text) throw new Error('No text provided for embedding')

  const models = await fetchOpenRouterEmbeddingModels(apiKey)
  const model = config.model?.trim() || models[0] || DEFAULT_EMBEDDING_MODEL

  if (mode === 'embed') {
    const vector = await embedTextWithOpenRouter(apiKey, text, model)
    return `Model: ${model}\nEmbedding ${summarizeVector(vector)}`
  }

  const reference = config.reference?.trim()
  if (!reference) throw new Error('Similarity mode requires config.reference text')

  const [a, b] = await Promise.all([
    embedTextWithOpenRouter(apiKey, text, model),
    embedTextWithOpenRouter(apiKey, reference, model),
  ])
  const score = cosineSimilarity(a, b)
  return `Model: ${model}\nSimilarity: ${score.toFixed(4)}`
}

export function resetOpenRouterEmbeddingsCacheForTests(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(OPENROUTER_EMBEDDINGS_CACHE_KEY)
  }
}
