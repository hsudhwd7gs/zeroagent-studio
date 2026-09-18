// CSV Export — convert a JSON array of objects into CSV text.
//
// Config:
//   columns — comma-separated column names (empty = auto-detect from first item)
//   delimiter — default , (comma). Use \t for TSV.

function escapeCsvValue(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  const needsQuoting =
    str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')
  if (needsQuoting) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export async function runCsvExport(
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

  if (arr.length === 0) return ''

  const delimiter = config.delimiter === '\\t' ? '\t' : (config.delimiter ?? ',')

  const specifiedCols = config.columns?.trim()
  let columns: string[]
  if (specifiedCols) {
    columns = specifiedCols.split(',').map((c) => c.trim()).filter(Boolean)
  } else {
    const first = arr[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      columns = Object.keys(first as Record<string, unknown>)
    } else {
      columns = ['value']
    }
  }

  const lines: string[] = []
  lines.push(columns.map((c) => escapeCsvValue(c, delimiter)).join(delimiter))

  for (const item of arr) {
    const row = columns.map((col) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return escapeCsvValue((item as Record<string, unknown>)[col], delimiter)
      }
      return escapeCsvValue(item, delimiter)
    })
    lines.push(row.join(delimiter))
  }

  return lines.join('\n')
}
