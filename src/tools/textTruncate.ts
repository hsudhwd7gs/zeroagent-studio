// Text Truncate — truncate text to N characters at a word boundary.
//
// Config:
//   length — max characters (default 100)
//   suffix — appended to truncated text (default "…")
//   words  — "true" to cut at last space boundary

export async function runTextTruncate(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = input
  if (!text) return ''

  const length = Math.max(1, Math.floor(Number(config.length ?? '100')))
  const suffix = config.suffix ?? '…'
  const atWord = config.words === 'true'

  if (text.length <= length) return text

  let cut = text.slice(0, length)

  if (atWord) {
    const lastSpace = cut.lastIndexOf(' ')
    if (lastSpace > length * 0.5) {
      cut = cut.slice(0, lastSpace)
    }
  }

  return cut + suffix
}
