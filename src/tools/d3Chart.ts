// D3 chart renderer — dynamic CDN import keeps the bundle small and CI clean.

const D3_URL = 'https://esm.sh/d3@7.9.0'

let D3Ref: any | null = null
async function loadD3(): Promise<any> {
  if (D3Ref) return D3Ref
  D3Ref = await import(/* @vite-ignore */ D3_URL)
  return D3Ref
}

export async function runD3Chart(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const d3 = await loadD3()

  let data: Array<{ label: string; value: number }> = []
  try {
    const parsed = input ? JSON.parse(input) : []
    data = Array.isArray(parsed) ? parsed : []
  } catch {
    data = []
  }
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
      .domain(data.map((d: { label: string }) => d.label))
      .range([0, width])
      .padding(0.2)
    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(data, (d: { value: number }) => d.value) as number) || 1])
      .range([height, 0])

    svg
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d: { label: string }) => x(d.label))
      .attr('y', (d: { value: number }) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d: { value: number }) => height - y(d.value))
      .attr('fill', 'steelblue')
  } else if (chartType === 'line') {
    const x = d3
      .scalePoint()
      .domain(data.map((d: { label: string }) => d.label))
      .range([0, width])
    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(data, (d: { value: number }) => d.value) as number) || 1])
      .range([height, 0])
    const line = d3
      .line()
      .x((d: { label: string }) => x(d.label))
      .y((d: { value: number }) => y(d.value))
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
