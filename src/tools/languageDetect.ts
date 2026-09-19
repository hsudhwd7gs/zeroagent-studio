// Detect the language of any text (100+ languages).
// Uses franc (lightweight, browser-friendly).

import { franc, francAll } from 'franc'

export async function runLanguageDetect(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = input.trim()
  if (!text) throw new Error('No text provided')

  const only = config.only?.split(',').map((s) => s.trim()).filter(Boolean)

  const code = franc(text, { only, minLength: 3 })
  const all = francAll(text, { only, minLength: 3 }).slice(0, 5)

  const languageNames: Record<string, string> = {
    eng: 'English', spa: 'Spanish', fra: 'French', deu: 'German',
    ita: 'Italian', por: 'Portuguese', rus: 'Russian', jpn: 'Japanese',
    kor: 'Korean', cmn: 'Chinese (Mandarin)', ara: 'Arabic', hin: 'Hindi',
    ben: 'Bengali', urd: 'Urdu', tur: 'Turkish', nld: 'Dutch',
    pol: 'Polish', swe: 'Swedish', vie: 'Vietnamese', tha: 'Thai',
    ind: 'Indonesian', und: 'Undetermined',
  }

  return JSON.stringify({
    ok: true,
    language: code,
    languageName: languageNames[code] ?? code,
    alternatives: all.map(([lang, score]) => ({
      code: lang,
      name: languageNames[lang] ?? lang,
      score: Math.round(score * 1000) / 1000,
    })),
  }, null, 2)
}
