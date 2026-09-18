// Array Chunk — split a JSON array into N-sized chunks.
//
// Config:
//   size — number of items per chunk (default 10)

export async function runArrayChunk(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const raw = input.trim()
  if (!raw) throw new Error('No input provided')

  let arr: unknown[]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array')
    arr = parsed
  } catch (err) {
    throw new Error('Input must be a valid JSON array', { cause: err })
  }

  const size = Math.max(1, Math.floor(Number(config.size ?? '10')))
  if (!Number.isFinite(size) || size < 1) {
    throw new Error('Chunk size must be a positive number')
  }

  const chunks: unknown[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }

  return JSON.stringify(chunks, null, 2)
}
