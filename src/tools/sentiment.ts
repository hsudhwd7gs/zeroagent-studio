// Sentiment analysis — pure JS implementation (no API needed).

interface SentimentResult {
  ok: boolean
  mode: string
  score: number          // -1 to 1
  label: 'positive' | 'negative' | 'neutral'
  comparative: number
  positiveWords: string[]
  negativeWords: string[]
  emojis?: string[]
}

const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful', 'love',
  'like', 'best', 'happy', 'joy', 'beautiful', 'brilliant', 'perfect', 'nice',
  'super', 'cool', 'fun', 'enjoy', 'pleased', 'glad', 'delighted', 'thrilled',
  'positive', 'success', 'successful', 'win', 'winning', 'recommend', 'recommended',
  'outstanding', 'incredible', 'remarkable', 'impressive', 'superb', 'fabulous',
  '👍', '❤️', '😍', '🥰', '😊', '😄', '🤩', '🎉', '✨', '🔥',
])

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'worst', 'sad',
  'angry', 'frustrated', 'disappointed', 'disappointing', 'poor', 'negative',
  'fail', 'failure', 'broken', 'bug', 'issue', 'problem', 'wrong', 'error',
  'crash', 'crashed', 'slow', 'ugly', 'boring', 'dull', 'annoying', 'frustrating',
  'unhappy', 'depressed', 'miserable', 'garbage', 'trash', 'suck', 'sucks',
  '👎', '💔', '😡', '😠', '😤', '😞', '😔', '😢', '😭', '🤬',
])

const EMOJI_POS = ['😊', '👍', '❤️', '🎉']
const EMOJI_NEG = ['👎', '💔', '😡', '😞']
const EMOJI_NEU = ['😐', '🤔']

export async function runSentiment(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = input.trim()
  if (!text) throw new Error('text required (wire upstream text into this node)')
  const mode = config.mode ?? 'polarity'

  const words = text.toLowerCase().match(/[a-z']+|[\u{1F300}-\u{1FAFF}]/gu) ?? []
  let pos = 0
  let neg = 0
  const positiveWords: string[] = []
  const negativeWords: string[] = []

  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) { pos++; positiveWords.push(w) }
    if (NEGATIVE_WORDS.has(w)) { neg++; negativeWords.push(w) }
  }

  const score = (pos - neg) / Math.max(1, words.length)
  const label = score > 0.05 ? 'positive' : score < -0.05 ? 'negative' : 'neutral'
  const emojis = label === 'positive' ? EMOJI_POS.slice(0, 2) : label === 'negative' ? EMOJI_NEG.slice(0, 2) : EMOJI_NEU

  const result: SentimentResult = {
    ok: true,
    mode,
    score: Math.round(score * 1000) / 1000,
    label,
    comparative: Math.round((pos - neg) / Math.max(1, words.length) * 1000) / 1000,
    positiveWords,
    negativeWords,
  }
  if (mode === 'emoji' || mode === 'full') result.emojis = emojis
  return JSON.stringify(result, null, 2)
}
