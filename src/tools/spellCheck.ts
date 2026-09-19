// Spell checker with suggestions. Uses nspell + dictionary-en — loaded dynamically from CDN.

const NSPELL_URL = 'https://esm.sh/nspell@2.1.5'
const DICT_AFF_URL = 'https://unpkg.com/dictionary-en@3.0.0/index.aff'
const DICT_DIC_URL = 'https://unpkg.com/dictionary-en@3.0.0/index.dic'

let spell: any = null

async function loadDict(): Promise<any> {
  if (spell) return spell
  const nspellMod = await import(/* @vite-ignore */ NSPELL_URL)
  const nspell = nspellMod.default ?? nspellMod

  const affRes = await fetch(DICT_AFF_URL)
  const dicRes = await fetch(DICT_DIC_URL)
  const aff = await affRes.text()
  const dic = await dicRes.text()

  spell = nspell(aff, dic)
  return spell
}

export async function runSpellCheck(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = input.trim()
  if (!text) throw new Error('No text provided')

  const s = await loadDict()
  void config // reserved for future language selection

  // Extract words (letters + apostrophes)
  const words = text.match(/[a-zA-Z']+/g) ?? []
  const unique = Array.from(new Set(words.map((w) => w.toLowerCase())))

  const misspelled: Array<{ word: string; suggestions: string[] }> = []

  for (const word of unique) {
    if (!s.correct(word)) {
      misspelled.push({
        word,
        suggestions: s.suggest(word).slice(0, 5),
      })
    }
  }

  return JSON.stringify({
    ok: true,
    totalWords: words.length,
    uniqueWords: unique.length,
    misspelledCount: misspelled.length,
    misspelled,
  }, null, 2)
}
