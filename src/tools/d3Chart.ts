// D3 chart renderer — dynamic CDN import keeps the bundle small and CI clean.

const D3_URL = 'https://esm.sh/d3@7.9.0'

interface D3Datum {
  label: string
  value: number
}

// Minimal structural types for the parts of d3 this tool uses.
// d3 scales are callable functions with chainable configuration methods.
interface D3Selection {
  selectAll: (selector: string) => D3Selection
  data: (items: D3Datum[]) => D3Selection
  enter: () => D3Selection
  append: (tag: string) => D3Selection
  datum: (items: D3Datum[]) => D3Selection
  attr: (name: string, value: unknown) => D3Selection
}

interface D3ScaleBand {
  (label: string): number
  domain: (labels: string[]) => D3ScaleBand
  range: (bounds: [number, number]) => D3ScaleBand
  padding: (pad: number) => D3ScaleBand
  bandwidth: () => number
}

interface D3ScaleLinear {
  (value: number): number
  domain: (bounds: [number, number]) => D3ScaleLinear
  range: (bounds: [number, number]) => D3ScaleLinear
}

interface D3ScalePoint {
  (label: string): number
  domain: (labels: string[]) => D3ScalePoint
  range: (bounds: [number, number]) => D3ScalePoint
}

interface D3Line {
  x: (fn: (d: D3Datum) => number) => D3Line
  y: (fn: (d: D3Datum) => number) => D3Line
}

interface D3Module {
  select: (el: Element) => D3Selection
  scaleBand: () => D3ScaleBand
  scaleLinear: () => D3ScaleLinear
  scalePoint: () => D3ScalePoint
  max: (items: D3Datum[], accessor: (d: D3Datum) => number) => number | undefined
  line: () => D3Line
}

let D3Ref: D3Module | null = null
async function loadD3(): Promise<D3Module> {
  if (D3Ref) return D3Ref
  const mod = (await import(/* @vite-ignore */ D3_URL)) as unknown as D3Module
  D3Ref = mod
  return D3Ref
}

function parseDataArray(raw: string): D3Datum[] {
  try {
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as D3Datum[]) : []
  } catch {
    return []
  }
}

export async function runD3Chart(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const d3 = await loadD3()

  const data = parseDataArray(input)
  const chartType = config.chartType || 'bar'

  const width = 600
  const height = 400
  // Offscreen SVG — do NOT attach to document.body (avoids visual flashes & leaks)
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svgEl.setAttribute('width', String(width))
  svgEl.setAttribute('height', String(height))
  svgEl.style.position = 'absolute'
  svgEl.style.left = '-9999px'
  document.body.appendChild(svgEl)

  const svg = d3.select(svgEl)

  if (chartType === 'bar') {
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, width])
      .padding(0.2)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) ?? 1])
      .range([height, 0])

    svg
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d: D3Datum) => x(d.label))
      .attr('y', (d: D3Datum) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d: D3Datum) => height - y(d.value))
      .attr('fill', 'steelblue')
  } else if (chartType === 'line') {
    const x = d3
      .scalePoint()
      .domain(data.map((d) => d.label))
      .range([0, width])
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) ?? 1])
      .range([height, 0])
    const line = d3
      .line()
      .x((d: D3Datum) => x(d.label))
      .y((d: D3Datum) => y(d.value))
    svg
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2)
      .attr('d', line)
  }

  const svgString = new XMLSerializer().serializeToString(svgEl)
  svgEl.remove()

  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const outputUrl = URL.createObjectURL(blob)

  return JSON.stringify({ ok: true, url: outputUrl, chartType })
}
