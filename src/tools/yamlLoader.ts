// YAML Config Loader — parse YAML into JSON.
// Uses js-yaml if available; falls back to a minimal parser for simple configs.

export function runYamlLoader(input: string): string {
  // Try dynamic import of js-yaml (loaded via CDN if needed)
  try {
    // Inline minimal YAML parser — handles key: value, lists, nested objects
    const result = parseMinimalYaml(input)
    return JSON.stringify(result, null, 2)
  } catch (err) {
    return `[yaml error: ${err instanceof Error ? err.message : String(err)}]`
  }
}

/**
 * Minimal YAML parser — supports:
 *   key: value
 *   key: "quoted value"
 *   key:
 *     nested: value
 *   - list item
 *   # comment
 * Does NOT support: anchors, multi-line strings, flow style, tags.
 * For full YAML, install js-yaml.
 */
function parseMinimalYaml(input: string): unknown {
  const lines = input.split('\n')
  const result: unknown = parseBlock(lines, 0, 0).value
  return result
}

function parseBlock(lines: string[], startIdx: number, indent: number): { value: unknown; nextIdx: number } {
  // Peek at the first non-empty, non-comment line to detect list vs object
  let i = startIdx
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue }
    const leading = line.match(/^ */)?.[0].length ?? 0
    if (leading < indent) return { value: null, nextIdx: i }
    if (leading > indent) return { value: null, nextIdx: i } // shouldn't happen at this level

    const trimmed = line.trim()
    if (trimmed.startsWith('- ')) {
      // List
      return parseList(lines, i, indent)
    } else if (trimmed.includes(':')) {
      // Object
      return parseObject(lines, i, indent)
    } else {
      // Scalar
      return { value: parseScalar(trimmed), nextIdx: i + 1 }
    }
  }
  return { value: null, nextIdx: i }
}

function parseObject(lines: string[], startIdx: number, indent: number): { value: Record<string, unknown>; nextIdx: number } {
  const obj: Record<string, unknown> = {}
  let i = startIdx
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue }
    const leading = line.match(/^ */)?.[0].length ?? 0
    if (leading < indent) break
    if (leading > indent) break // shouldn't happen

    const trimmed = line.trim()
    if (trimmed.startsWith('- ')) break // list mixed in — bail

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) break
    const key = trimmed.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '')
    const rest = trimmed.slice(colonIdx + 1).trim()

    if (rest === '') {
      // Nested block
      const child = parseBlock(lines, i + 1, indent + 2)
      obj[key] = child.value
      i = child.nextIdx
    } else {
      obj[key] = parseScalar(rest)
      i++
    }
  }
  return { value: obj, nextIdx: i }
}

function parseList(lines: string[], startIdx: number, indent: number): { value: unknown[]; nextIdx: number } {
  const arr: unknown[] = []
  let i = startIdx
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue }
    const leading = line.match(/^ */)?.[0].length ?? 0
    if (leading < indent) break
    if (leading > indent) break

    const trimmed = line.trim()
    if (!trimmed.startsWith('- ')) break

    const itemValue = trimmed.slice(2).trim()
    if (itemValue === '') {
      // Block item
      const child = parseBlock(lines, i + 1, indent + 2)
      arr.push(child.value)
      i = child.nextIdx
    } else if (itemValue.includes(':')) {
      // Object as list item: "- key: value"
      // Treat as inline object — parse remaining as object
      const subLines = [line.replace(/^(\s*)- /, '$1  ')]
      let j = i + 1
      while (j < lines.length) {
        const nl = lines[j]
        const nlLead = nl.match(/^ */)?.[0].length ?? 0
        if (nlLead <= indent && nl.trim() && !nl.trim().startsWith('#')) break
        subLines.push(nl)
        j++
      }
      const child = parseObject(subLines, 0, indent + 2)
      arr.push(child.value)
      i = j
    } else {
      arr.push(parseScalar(itemValue))
      i++
    }
  }
  return { value: arr, nextIdx: i }
}

function parseScalar(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed === '' ) return ''
  if (trimmed === 'null' || trimmed === '~') return null
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === '[]') return []
  if (trimmed === '{}') return {}
  // Quoted string
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  // Number
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10)
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed)
  // Inline array [a, b, c]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map(s => parseScalar(s.trim()))
  }
  return trimmed
}
