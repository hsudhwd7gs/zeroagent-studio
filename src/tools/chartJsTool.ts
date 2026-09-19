// Chart.js renderer — dynamic CDN import keeps the bundle small and CI clean.

const CHART_JS_URL = 'https://esm.sh/chart.js@4.4.4/auto'

let ChartRef: any | null = null
async function loadChart(): Promise<any> {
  if (ChartRef) return ChartRef
  const mod = await import(/* @vite-ignore */ CHART_JS_URL)
  ChartRef = mod.default ?? mod
  return ChartRef
}

export async function runChartJs(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const Chart = await loadChart()

  let data: Array<{ label: string; value: number }> = []
  try {
    const parsed = input ? JSON.parse(input) : []
    data = Array.isArray(parsed) ? parsed : []
  } catch {
    data = []
  }
  if (data.length === 0 && config.data) {
    try {
      const parsed = JSON.parse(config.data)
      data = Array.isArray(parsed) ? parsed : []
    } catch {
      /* ignore */
    }
  }

  const chartType = (config.chartType || 'bar') as 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter'

  const canvas = document.createElement('canvas')
  canvas.width = 600
  canvas.height = 400
  // Offscreen render — do NOT attach to document.body (avoid leaks and visual flashes)
  canvas.style.position = 'absolute'
  canvas.style.left = '-9999px'
  document.body.appendChild(canvas)

  let dataUrl = ''
  try {
    const chart = new Chart(canvas, {
      type: chartType,
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: config.title || 'Data',
            data: data.map((d) => d.value),
            backgroundColor:
              chartType === 'pie' || chartType === 'doughnut'
                ? [
                    'rgba(54,162,235,0.7)',
                    'rgba(255,99,132,0.7)',
                    'rgba(75,192,192,0.7)',
                    'rgba(255,206,86,0.7)',
                    'rgba(153,102,255,0.7)',
                    'rgba(255,159,64,0.7)',
                  ]
                : 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false as const,
        plugins: { legend: { display: true } },
        scales:
          chartType === 'pie' || chartType === 'doughnut' || chartType === 'scatter'
            ? {}
            : { x: {}, y: { beginAtZero: true } },
      },
    })

    // Synchronous render with animation:false — toDataURL is safe immediately
    dataUrl = canvas.toDataURL('image/png')
    chart.destroy()
  } finally {
    canvas.remove()
  }

  return JSON.stringify({ ok: true, url: dataUrl, chartType })
}
