// CSV to JSON — parse CSV text into an array of objects.
//
// Config:
//   delimiter — , (default) | ; | \t | |
//   header    — "true" (default) to treat first row as headers
//   trim      — "true" (default) to trim whitespace
//   quote     — " (default) — character wrapping quoted fields

function parseCsvLine(line: string, delimiter: string, quote: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuote = false
  let i = 0

  while (i < line.length) {
    const ch = line[i]

    if (inQuote) {
      if (ch === quote) {
        if (line[i + 1] === quote) {
          current += quote
          i += 2
          continue
        }
        inQuote = false
        i++
        continue
      }
      current += ch
      i++
      continue
    }

    if (ch === quote) {
      inQuote = true
      i++
      continue
    }

    if (ch === delimiter) {
      out.push(current)
      current = ''
      i++
      continue
    }

    current += ch
    i++
  }

  out.push(current)
  return out
}

export async function runCsvToJson(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const raw = input.trim()
  if (!raw) return '[]'

  const delimiter = config.delimiter === '\\t' ? '\t' : (config.delimiter ?? ',')
  const quote = config.quote ?? '"'
  const useHeader = config.header !== 'false'
  const trim = config.trim !== 'false'

  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length === 0) return '[]'

  const rows = lines.map((line) => parseCsvLine(line, delimiter, quote))

  const maybeTrim = (s: string) => (trim ? s.trim() : s)

  if (!useHeader) {
    return JSON.stringify(
      rows.map((row) => row.map(maybeTrim)),
      null,
      2
    )
  }

  const headers = rows[0].map(maybeTrim)
  const dataRows = rows.slice(1)

  const out = dataRows.map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h || `col${i}`] = maybeTrim(row[i] ?? '')
    })
    return obj
  })

  return JSON.stringify(out, null, 2)
}
