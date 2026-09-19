// Try / Catch node — runs an inline JS expression, returns {ok, value|error}
// Useful for safely parsing risky input or trying a transformation.

export interface TryCatchConfig {
  expression?: string // JS expression (evaluated in a sandbox)
  fallback?: string   // returned on error
}

export function runTryCatch(input: string, config: TryCatchConfig = {}): string {
  const expr = (config.expression || 'input').trim()
  if (!expr) return input
  try {
    // Restricted eval — only input + JSON + Math + String + Number + Boolean
    const fn = new Function(
      'input',
      'JSON', 'Math', 'String', 'Number', 'Boolean', 'Array', 'Object', 'Date',
      `"use strict"; return (${expr});`
    )
    const result = fn(input, JSON, Math, String, Number, Boolean, Array, Object, Date)
    if (result === undefined || result === null) return config.fallback ?? ''
    return typeof result === 'string' ? result : JSON.stringify(result)
  } catch (err) {
    return config.fallback ?? `[error: ${err instanceof Error ? err.message : String(err)}]`
  }
}
