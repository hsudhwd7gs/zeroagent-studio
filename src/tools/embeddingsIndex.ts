// Embeddings Index — store and retrieve text chunks by embedding similarity.
// Uses cosine similarity over a simple in-memory index per node.
// Pairs with RAG Retrieve and any embedding tool (Gemini, OpenRouter).

export interface EmbeddingsIndexConfig {
  action?: 'add' | 'search' | 'list' | 'clear'
  topK?: string // for search
  threshold?: string // min similarity 0..1
}

interface IndexEntry {
  id: string
  text: string
  embedding: number[]
  metadata?: Record<string, unknown>
}

// Per-node index
const nodeIndexes = new Map<string, IndexEntry[]>()

function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export function runEmbeddingsIndex(
  input: string,
  config: EmbeddingsIndexConfig,
  nodeId?: string
): string {
  const action = config.action || 'add'
  const id = nodeId || 'embeddings-default'
  let index = nodeIndexes.get(id)
  if (!index) {
    index = []
    nodeIndexes.set(id, index)
  }

  if (action === 'clear') {
    index.length = 0
    return JSON.stringify({ ok: true, cleared: true })
  }

  if (action === 'list') {
    return JSON.stringify({
      count: index.length,
      entries: index.map((e) => ({ id: e.id, text: e.text.slice(0, 100), metadata: e.metadata })),
    }, null, 2)
  }

  if (action === 'add') {
    // Input format: JSON { text, embedding, id?, metadata? }
    let parsed: { text?: string; embedding?: number[]; id?: string; metadata?: Record<string, unknown> }
    try {
      parsed = JSON.parse(input)
    } catch {
      return '[embeddings-index error: input must be JSON {text, embedding}]'
    }
    if (!parsed.text || !Array.isArray(parsed.embedding)) {
      return '[embeddings-index error: missing text or embedding array]'
    }
    const entry: IndexEntry = {
      id: parsed.id || crypto.randomUUID(),
      text: parsed.text,
      embedding: parsed.embedding,
      metadata: parsed.metadata,
    }
    index.push(entry)
    return JSON.stringify({ ok: true, id: entry.id, count: index.length })
  }

  if (action === 'search') {
    let query: { embedding?: number[] }
    try {
      query = JSON.parse(input)
    } catch {
      return '[embeddings-index error: query must be JSON {embedding}]'
    }
    if (!Array.isArray(query.embedding)) {
      return '[embeddings-index error: query missing embedding array]'
    }
    const topK = Math.max(1, Math.min(100, parseInt(config.topK || '5', 10) || 5))
    const threshold = parseFloat(config.threshold || '0')
    const scored = index
      .map((e) => ({ entry: e, score: cosineSim(query.embedding!, e.embedding) }))
      .filter((x) => x.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
    return JSON.stringify({
      results: scored.map((s) => ({
        id: s.entry.id,
        text: s.entry.text,
        score: s.score,
        metadata: s.entry.metadata,
      })),
    }, null, 2)
  }

  return `[embeddings-index error: unknown action "${action}"]`
}

export function clearEmbeddingsIndexForNode(nodeId: string): void {
  nodeIndexes.delete(nodeId)
}
