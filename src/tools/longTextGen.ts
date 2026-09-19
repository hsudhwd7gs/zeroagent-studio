// Long Text Generation — multi-chapter generation via Groq.
// Splits a large prompt into chapters and streams results.

export async function runLongTextGen(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const topic = config.topic?.trim() || input.trim()
  if (!topic) throw new Error('No topic')

  const workerUrl = window.location.origin
  const totalChapters = parseInt(config.chapters ?? '5')
  const wordsPerChapter = parseInt(config.wordsPerChapter ?? '300')
  const tone = config.tone ?? 'informative'

  const outlineRes = await fetch(`${workerUrl}/api/groq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Create an outline with exactly ${totalChapters} chapters for: "${topic}". Return JSON array of strings only.`,
      }],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    }),
  })

  const outlineData = await outlineRes.json()
  const outlineText = outlineData.choices?.[0]?.message?.content ?? '{}'
  let chapters: string[]
  try {
    const parsed = JSON.parse(outlineText)
    chapters = Array.isArray(parsed) ? parsed : parsed.chapters ?? []
  } catch {
    chapters = Array.from({ length: totalChapters }, (_, i) => `${topic} - Chapter ${i + 1}`)
  }

  const results: string[] = []

  for (const chapterTitle of chapters) {
    const res = await fetch(`${workerUrl}/api/groq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Write "${chapterTitle}" in ${tone} tone. Target ~${wordsPerChapter} words. Return only the text.`,
        }],
        temperature: 0.7,
      }),
    })

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    results.push(`## ${chapterTitle}\n\n${text}`)
  }

  return results.join('\n\n---\n\n')
}
