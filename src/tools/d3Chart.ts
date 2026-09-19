import * as d3 from 'd3'

export async function runD3Chart(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const data = JSON.parse(input || '[]')
  const chartType = config.chartType || 'bar'

  // Create an SVG container
  const width = 600
  const height = 400
  const svg = d3
    .select(document.body)
    .append('svg')
    .attr('width', width)
    .attr('height', height)

  if (chartType === 'bar') {
    const x = d3
      .scaleBand()
      .domain(data.map((d: { label: string }) => d.label))
      .range([0, width])
      .padding(0.2)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d: { value: number }) => d.value) as number])
      .range([height, 0])

    svg
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d: { label: string }) => x(d.label)!)
      .attr('y', (d: { value: number }) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d: { value: number }) => height - y(d.value))
      .attr('fill', 'steelblue')
  }

  const svgString = new XMLSerializer().serializeToString(svg.node()!)
  svg.remove()

  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const outputUrl = URL.createObjectURL(blob)

  return JSON.stringify({ ok: true, url: outputUrl, chartType })
}
