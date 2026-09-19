// Parse YAML → JSON, or generate YAML from JSON.
// Uses js-yaml.

import yaml from 'js-yaml'

export async function runYamlTool(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const mode = config.mode ?? 'parse'

  if (mode === 'parse') {
    const text = input.trim()
    if (!text) throw new Error('No YAML input')

    try {
      const parsed = yaml.load(text)
      return JSON.stringify(parsed, null, 2)
    } catch (err) {
      throw new Error(`YAML parse error: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
    }
  }

  if (mode === 'stringify') {
    const text = input.trim()
    if (!text) throw new Error('No JSON input')

    try {
      const parsed = JSON.parse(text)
      return yaml.dump(parsed, { indent: 2, lineWidth: 120 })
    } catch (err) {
      throw new Error(`JSON parse error: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
    }
  }

  throw new Error(`Unknown mode: ${mode}`)
}
