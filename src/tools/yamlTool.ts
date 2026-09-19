// Parse YAML → JSON, or generate YAML from JSON.
// Uses js-yaml — loaded dynamically from CDN.

const YAML_URL = 'https://esm.sh/js-yaml@4.1.0'

interface YamlModule {
  load: (text: string) => unknown
  dump: (value: unknown, options?: { indent?: number; lineWidth?: number }) => string
}

let YamlRef: YamlModule | null = null
async function loadYaml(): Promise<YamlModule> {
  if (YamlRef) return YamlRef
  const mod = (await import(/* @vite-ignore */ YAML_URL)) as { default?: YamlModule }
  const yaml = mod.default ?? (mod as unknown as YamlModule)
  YamlRef = yaml
  return YamlRef
}

export async function runYamlTool(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const yaml = await loadYaml()
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
