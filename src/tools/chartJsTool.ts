// Chart.js renderer — dynamic CDN import keeps the bundle small and CI clean.

const CHART_JS_URL = 'https://esm.sh/chart.js@4.4.4/auto'

interface ChartDatum {
  label: string
  value: number
}

interface ChartInstance {
  destroy: () => void
}

interface ChartConfig {
  type: string
  data: {
    labels: Array<string | undefined>
    datasets: Array<Record<string, unknown>>
  }
  options: Record<string, unknown>
}

type ChartConstructor = new (canvas: HTMLCanvasElement, config: ChartConfig) => ChartInstance

let ChartRef: ChartConstructor | null = null
async function loadChart(): Promise<ChartConstructor> {
  if (ChartRef) return ChartRef
  const mod = (await import(/* @vite-ignore */ CHART_JS_URL)) as { default?: ChartConstructor }
  const Ctor = mod.default
  if (typeof Ctor !== 'function') throw new Error('Chart.js failed to load from CDN')
  ChartRef = Ctor
  return ChartRef
}

function parseDataArray(raw: string): ChartDatum[] {
  try {
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as ChartDatum[]) : []
  } catch {
    return []
  }
}

export async function runChartJs(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const Chart = await loadChart()

  let data = parseDataArray(input)
  if (data.length === 0 && config.data) {
    data = parseDataArray(config.data)
  }

  const chartType = (config.chartType || 'bar') as 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter'

  const canvas = document.createElement('canvas')
  canvas.width = 600
  canvas.height = 400
  // Offscreen render — do NOT attach to document.body (avoid leaks and visual flashes)
  canvas.style.position = 'absolute'
  canvas.style.left = '-9999px'
  document.body.appendChild(canvas)

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
    const dataUrl = canvas.toDataURL('image/png')
    chart.destroy()
    return JSON.stringify({ ok: true, url: dataUrl, chartType })
  } finally {
    canvas.remove()
  }
}
