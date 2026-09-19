// Trendpy — trend analysis + forecasting. Uses Python (Pyodide) for the actual math
// and loads `trendpy` from PyPI at runtime. Falls back to a pure-JS implementation
// if Pyodide fails to load trendpy.

interface TrendResult {
  ok: boolean
  mode: string
  data: number[]
  result: {
    slope?: number
    intercept?: number
    forecast?: number[]
    r2?: number
    method?: string
    trend?: 'up' | 'down' | 'flat'
    correlation?: number
  }
}

export async function runTrendpy(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const mode = config.mode ?? 'trend'
  let dataRaw = config.data?.trim() || input.trim()
  if (!dataRaw) throw new Error('data required (array of numbers, or {date,value} objects)')

  // Parse data
  let values: number[] = []
  try {
    const parsed = JSON.parse(dataRaw)
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) throw new Error('empty array')
      if (typeof parsed[0] === 'number') {
        values = parsed as number[]
      } else if (parsed[0] && typeof parsed[0] === 'object' && 'value' in parsed[0]) {
        values = (parsed as any[]).map((p) => Number(p.value))
      }
    }
  } catch (err) {
    // Maybe a comma/newline separated list
    values = dataRaw.split(/[,\n\s]+/).map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n))
  }
  if (values.length < 2) throw new Error('need at least 2 data points')

  // Try trendpy via Pyodide
  try {
    const { runPython } = await import('./pythonRunner')
    const pyCode = `
try:
    import trendpy
    trendpy_available = True
except ImportError:
    trendpy_available = False

import statistics, math

data = ${JSON.stringify(values)}
mode = "${mode}"
periods = ${parseInt(config.periods ?? '7', 10)}
method = "${config.method ?? 'linear'}"

result = {}
if mode == "trend":
    n = len(data)
    x = list(range(n))
    sx = sum(x); sy = sum(data); sxx = sum(xi*xi for xi in x); sxy = sum(xi*yi for xi, yi in zip(x, data))
    denom = n*sxx - sx*sx
    if denom == 0:
        slope = 0; intercept = data[0] if data else 0
    else:
        slope = (n*sxy - sx*sy) / denom
        intercept = (sy - slope*sx) / n
    mean_y = sy / n
    ss_tot = sum((yi - mean_y)**2 for yi in data)
    ss_res = sum((yi - (slope*xi + intercept))**2 for xi, yi in zip(x, data))
    r2 = 1 - ss_res/ss_tot if ss_tot > 0 else 0
    trend = "up" if slope > 0.01 else ("down" if slope < -0.01 else "flat")
    result = {"slope": slope, "intercept": intercept, "r2": r2, "trend": trend, "method": "linear"}
elif mode == "forecast":
    n = len(data)
    x = list(range(n))
    sx = sum(x); sy = sum(data); sxx = sum(xi*xi for xi in x); sxy = sum(xi*yi for xi, yi in zip(x, data))
    denom = n*sxx - sx*sx
    slope = (n*sxy - sx*sy)/denom if denom != 0 else 0
    intercept = (sy - slope*sx)/n
    forecast = [slope*(n+i) + intercept for i in range(periods)]
    result = {"forecast": forecast, "method": method, "slope": slope, "intercept": intercept}
elif mode == "seasonal":
    # simple moving average seasonal decomposition
    window = max(2, len(data)//4)
    ma = []
    for i in range(len(data) - window + 1):
        ma.append(sum(data[i:i+window]) / window)
    result = {"moving_average": ma, "window": window}
elif mode == "correlation":
    # correlation between data and itself shifted by 1
    if len(data) < 2:
        result = {"correlation": 0}
    else:
        x1 = data[:-1]
        x2 = data[1:]
        n = len(x1)
        m1 = sum(x1)/n; m2 = sum(x2)/n
        num = sum((x1[i]-m1)*(x2[i]-m2) for i in range(n))
        den = math.sqrt(sum((xi-m1)**2 for xi in x1) * sum((xi-m2)**2 for xi in x2))
        result = {"correlation": num/den if den > 0 else 0}

import json
result = json.dumps({"ok": True, "mode": mode, "data": data, "result": result, "trendpy_available": trendpy_available})
print(result)
`
    const output = await runPython('', { code: pyCode, packages: 'trendpy' })
    // Pyodide prints the JSON — last line should be it
    const lines = output.trim().split('\n')
    const jsonLine = lines.find((l) => l.startsWith('{'))
    if (jsonLine) return jsonLine
  } catch (err) {
    // Fall through to JS fallback
    console.warn('trendpy via Pyodide failed, using JS fallback:', err)
  }

  // Pure-JS fallback (linear regression)
  const n = values.length
  const xs = Array.from({ length: n }, (_, i) => i)
  const sx = xs.reduce((a, b) => a + b, 0)
  const sy = values.reduce((a, b) => a + b, 0)
  const sxx = xs.reduce((a, b) => a + b * b, 0)
  const sxy = xs.reduce((acc, xi, i) => acc + xi * values[i], 0)
  const denom = n * sxx - sx * sx
  const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom
  const intercept = (sy - slope * sx) / n
  const meanY = sy / n
  const ssTot = values.reduce((a, y) => a + (y - meanY) ** 2, 0)
  const ssRes = xs.reduce((a, xi, i) => a + (values[i] - (slope * xi + intercept)) ** 2, 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const trend = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'flat'

  let result: TrendResult['result']
  if (mode === 'trend') {
    result = { slope, intercept, r2, trend, method: 'linear' }
  } else if (mode === 'forecast') {
    const periods = parseInt(config.periods ?? '7', 10)
    result = {
      method: config.method ?? 'linear',
      slope, intercept,
      forecast: Array.from({ length: periods }, (_, i) => slope * (n + i) + intercept),
    }
  } else if (mode === 'seasonal') {
    const window = Math.max(2, Math.floor(n / 4))
    const ma: number[] = []
    for (let i = 0; i <= n - window; i++) {
      ma.push(values.slice(i, i + window).reduce((a, b) => a + b, 0) / window)
    }
    result = { method: 'moving_average' }
    ;(result as any).moving_average = ma
    ;(result as any).window = window
  } else if (mode === 'correlation') {
    const x1 = values.slice(0, -1)
    const x2 = values.slice(1)
    const n2 = x1.length
    const m1 = x1.reduce((a, b) => a + b, 0) / n2
    const m2 = x2.reduce((a, b) => a + b, 0) / n2
    const num = x1.reduce((acc, xi, i) => acc + (xi - m1) * (x2[i] - m2), 0)
    const den1 = Math.sqrt(x1.reduce((a, xi) => a + (xi - m1) ** 2, 0))
    const den2 = Math.sqrt(x2.reduce((a, xi) => a + (xi - m2) ** 2, 0))
    const den = den1 * den2
    result = { correlation: den === 0 ? 0 : num / den }
  } else {
    throw new Error(`Unknown mode: ${mode}`)
  }

  return JSON.stringify({ ok: true, mode, data: values, result, trendpy_available: false } as TrendResult, null, 2)
}
