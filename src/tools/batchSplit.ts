// Batch Split — split a JSON array into N-sized batches.
//
// Useful when an API takes only N items per call. Produces an array
// of batches that you can pass to downstream nodes.
//
// Config:
//   size — items per batch (default 50)
//   wrap — "true" to also output a "batches" wrapper with metadata

export async function runBatchSplit(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const raw = input.trim()
  if (!raw) throw new Error('No input provided')

  let arr: unknown[]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('Input must be a JSON array')
    }
    arr = parsed
  } catch (err) {
    throw new Error('Input must be a valid JSON array', { cause: err })
  }

  const size = Math.max(1, Math.floor(Number(config.size ?? '50')))
  if (!Number.isFinite(size) || size < 1) {
    throw new Error('Batch size must be a positive number')
  }

  const batches: unknown[][] = []
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size))
  }

  const wrap = config.wrap === 'true'

  if (wrap) {
    return JSON.stringify(
      {
        total: arr.length,
        batchSize: size,
        batchCount: batches.length,
        batches,
      },
      null,
      2
    )
  }

  return JSON.stringify(batches, null, 2)
}
