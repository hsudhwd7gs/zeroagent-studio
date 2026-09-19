// CSV from URL — fetch a CSV file from a URL and parse to JSON.
// Uses the worker proxy when CORS blocks direct fetch.

export interface CsvFromUrlConfig {
  url?: string
  delimiter?: string // default ','
  hasHeader?: string // 'true' or 'false' (default true)
  limit?: string // max rows
}

export async function runCsvFromUrl(input: string, config: CsvFromUrlConfig = {}): Promise<string> {
  const url = (config.url || input || '').trim()
  if (!url) return '[csv-from-url error: no URL provided]'

  let csvText: string
  try {
    // Try direct fetch first
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    csvText = await res.text()
  } catch (err) {
    // Fall back to worker proxy
    try {
      const proxyRes = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`)
      if (!proxyRes.ok) {
        return `[csv-from-url error: direct fetch failed (${err instanceof Error ? err.message : String(err)}) and proxy returned ${proxyRes.status}]`
      }
      csvText = await proxyRes.text()
    } catch (proxyErr) {
      return `[csv-from-url error: ${err instanceof Error ? err.message : String(err)} | proxy: ${proxyErr instanceof Error ? proxyErr.message : String(proxyErr)}]`
    }
  }

  // Parse CSV
  const delimiter = config.delimiter || ','
  const hasHeader = config.hasHeader !== 'false'
  const limit = config.limit ? parseInt(config.limit, 10) : 0

  const rows = parseCsv(csvText, delimiter)
  if (rows.length === 0) return JSON.stringify({ rows: [], count: 0 })

  let result: unknown[]
  if (hasHeader) {
    const headers = rows[0]
    const dataRows = rows.slice(1)
    const sliced = limit > 0 ? dataRows.slice(0, limit) : dataRows
    result = sliced.map((row) => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => {
        obj[h || `col${i}`] = row[i] ?? ''
      })
      return obj
    })
  } else {
    const sliced = limit > 0 ? rows.slice(0, limit) : rows
    result = sliced
  }

  return JSON.stringify({ rows: result, count: result.length, headers: hasHeader ? rows[0] : undefined }, null, 2)
}

function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === delimiter) {
        currentRow.push(currentField)
        currentField = ''
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') i++
        currentRow.push(currentField)
        currentField = ''
        if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
          rows.push(currentRow)
        }
        currentRow = []
      } else {
        currentField += char
      }
    }
  }
  // Last field
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField)
    if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
      rows.push(currentRow)
    }
  }
  return rows
}
