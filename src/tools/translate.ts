// Translate node — uses the free, no-key MyMemory translation API.

export async function runTranslate(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = config.text?.trim() || input.trim()
  if (!text) throw new Error('text required')
  const from = (config.from ?? 'auto').toLowerCase()
  const to = (config.to ?? 'en').toLowerCase()

  // MyMemory free API — 5,000 chars/day without email, 50,000 with
  const langPair = `${from === 'auto' ? 'Autodetect' : from}|${to}`
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`MyMemory API failed: ${res.status}`)
  const data = await res.json() as any
  return JSON.stringify({
    ok: true,
    text,
    from,
    to,
    translated: data.responseData?.translatedText,
    detectedLanguage: data.responseData?.detectedLanguage,
    matches: data.matches?.slice(0, 3),
  }, null, 2)
}
