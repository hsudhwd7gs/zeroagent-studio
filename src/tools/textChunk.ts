// Text Chunk — split long text into N-character chunks.
//
// Splits at word boundaries when possible to avoid cutting words.
//
// Config:
//   size    — characters per chunk (default 2000)
//   overlap — characters of overlap (default 0)

export async function runTextChunk(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = input
  if (!text.trim()) throw new Error('No input provided')

  const size = Math.max(50, Math.floor(Number(config.size ?? '2000')))
  const overlap = Math.max(0, Math.min(size - 1, Math.floor(Number(config.overlap ?? '0'))))

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + size, text.length)

    if (end < text.length) {
      // Try to cut at a whitespace boundary within the last 15% of the chunk
      const minBoundary = start + Math.floor(size * 0.85)
      const segment = text.slice(start, end)
      const lastWs = segment.lastIndexOf(' ')
      if (lastWs > minBoundary - start) {
        end = start + lastWs
      }
    }

    chunks.push(text.slice(start, end).trim())
    if (end >= text.length) break
    start = Math.max(start + 1, end - overlap)
  }

  return JSON.stringify(chunks, null, 2)
}
