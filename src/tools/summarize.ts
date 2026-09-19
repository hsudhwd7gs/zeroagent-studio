// Summarize node — pure JS extractive summarization (no API needed).
// Modes: extractive, bullet, one-line, headline.

interface Sentence {
  text: string
  score: number
  index: number
}

export async function runSummarize(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = input.trim()
  if (!text) throw new Error('text required (wire upstream text into this node)')
  const mode = config.mode ?? 'extractive'
  const sentences = parseInt(config.sentences ?? '3', 10)

  // Split into sentences
  const rawSentences = text
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]+/g) ?? [text]

  // Word frequency (excluding stopwords)
  const stopwords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'of', 'in', 'on', 'at', 'to', 'for',
    'with', 'by', 'from', 'as', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    'all', 'each', 'every', 'some', 'any', 'few', 'more', 'most', 'other', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out',
    'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  ])

  const wordCounts = new Map<string, number>()
  for (const w of text.toLowerCase().match(/[a-z']+/g) ?? []) {
    if (stopwords.has(w) || w.length < 3) continue
    wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1)
  }
  const maxFreq = Math.max(1, ...wordCounts.values())
  wordCounts.forEach((v, k) => wordCounts.set(k, v / maxFreq))

  // Score each sentence
  const scoredSentences: Sentence[] = rawSentences.map((s, i) => {
    const words = s.toLowerCase().match(/[a-z']+/g) ?? []
    let score = 0
    let count = 0
    for (const w of words) {
      const freq = wordCounts.get(w)
      if (freq) { score += freq; count++ }
    }
    return { text: s.trim(), score: count > 0 ? score / count : 0, index: i }
  })

  // Pick top sentences (preserve order)
  const topSentences = [...scoredSentences]
    .sort((a, b) => b.score - a.score)
    .slice(0, sentences)
    .sort((a, b) => a.index - b.index)
    .map((s) => s.text)

  if (mode === 'extractive') {
    return JSON.stringify({
      ok: true,
      mode,
      summary: topSentences.join(' '),
      topSentences,
      originalLength: text.length,
      summaryLength: topSentences.join(' ').length,
    }, null, 2)
  }

  if (mode === 'bullet') {
    const bullets = topSentences.map((s, i) => `${i + 1}. ${s}`).join('\n')
    return JSON.stringify({ ok: true, mode, summary: bullets, bullets: topSentences }, null, 2)
  }

  if (mode === 'one-line') {
    // The single highest-scoring sentence
    const top = topSentences[0] ?? rawSentences[0] ?? ''
    return JSON.stringify({ ok: true, mode, summary: top }, null, 2)
  }

  if (mode === 'headline') {
    // Take the first 5-7 words of the top sentence, Title Case
    const top = topSentences[0] ?? rawSentences[0] ?? ''
    const headline = top.split(/\s+/).slice(0, 7).join(' ').replace(/[.!?]+$/, '')
    return JSON.stringify({
      ok: true,
      mode,
      headline: headline.replace(/\b\w/g, (c) => c.toUpperCase()),
    }, null, 2)
  }

  throw new Error(`Unknown mode: ${mode}`)
}
