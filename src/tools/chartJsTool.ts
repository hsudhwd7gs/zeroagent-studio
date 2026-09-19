import Chart from 'chart.js/auto'

export async function runChartJs(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const data = JSON.parse(input || '[]')
  const chartType = (config.chartType || 'bar') as 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter'

  const canvas = document.createElement('canvas')
  canvas.width = 600
  canvas.height = 400
  document.body.appendChild(canvas)

  new Chart(canvas, {
    type: chartType,
    data: {
      labels: data.map((d: { label: string }) => d.label),
      datasets: [
        {
          label: config.title || 'Data',
          data: data.map((d: { value: number }) => d.value),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        },
      ],
    },
    options: { responsive: false },
  })

  const dataUrl = canvas.toDataURL('image/png')
  canvas.remove()

  return JSON.stringify({ ok: true, url: dataUrl, chartType })
}
