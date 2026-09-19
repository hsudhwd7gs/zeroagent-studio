// Stock Footage / Photo node — searches Pexels, Pixabay, or Unsplash.
// Pexels and Pixabay require API keys (free tier); Unsplash has a public source endpoint.

interface StockResult {
  ok: boolean
  provider: string
  query: string
  results: Array<{ id: string; url: string; thumb: string; width?: number; height?: number; duration?: number; author?: string }>
}

interface PexelsVideoFile {
  link?: string
}

interface PexelsVideo {
  id: number | string
  video_files?: PexelsVideoFile[]
  url?: string
  image?: string
  width?: number
  height?: number
  duration?: number
  user?: { name?: string }
}

interface PexelsResponse {
  videos?: PexelsVideo[]
}

interface PixabayVideoVariant {
  url?: string
  width?: number
  height?: number
  thumbnail?: string
}

interface PixabayHit {
  id: number | string
  videos?: { large?: PixabayVideoVariant; small?: PixabayVideoVariant }
  pageURL?: string
  previewURL?: string
  duration?: number
  user?: string
}

interface PixabayResponse {
  hits?: PixabayHit[]
}

export async function runStockFootage(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const query = config.query?.trim() || input.trim()
  if (!query) throw new Error('query required')
  const provider = config.provider ?? 'pexels'
  const limit = parseInt(config.per_page ?? '5', 10)
  const apiKey = config.apiKey?.trim()

  if (provider === 'pexels') {
    if (!apiKey) throw new Error('Pexels requires an API key (free at pexels.com/api)')
    const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${limit}`, {
      headers: { Authorization: apiKey },
    })
    if (!res.ok) throw new Error(`Pexels error: ${res.status}`)
    const data = await res.json() as PexelsResponse
    const results = (data.videos ?? []).map((v) => ({
      id: String(v.id),
      url: v.video_files?.[0]?.link ?? v.url ?? '',
      thumb: v.image ?? '',
      width: v.width,
      height: v.height,
      duration: v.duration,
      author: v.user?.name,
    }))
    return JSON.stringify({ ok: true, provider, query, results } as StockResult, null, 2)
  }

  if (provider === 'pixabay') {
    if (!apiKey) throw new Error('Pixabay requires an API key (free at pixabay.com/accounts)')
    const res = await fetch(`https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${limit}`)
    if (!res.ok) throw new Error(`Pixabay error: ${res.status}`)
    const data = await res.json() as PixabayResponse
    const results = (data.hits ?? []).map((h) => ({
      id: String(h.id),
      url: h.videos?.large?.url ?? h.pageURL ?? '',
      thumb: h.videos?.small?.thumbnail ?? h.previewURL ?? '',
      width: h.videos?.large?.width,
      height: h.videos?.large?.height,
      duration: h.duration,
      author: h.user,
    }))
    return JSON.stringify({ ok: true, provider, query, results } as StockResult, null, 2)
  }

  if (provider === 'unsplash') {
    // Unsplash Source — no key needed (limited)
    const results = Array.from({ length: limit }, (_, i) => ({
      id: `unsplash-${i}-${Date.now()}`,
      url: `https://source.unsplash.com/featured/${800 + i}x600?${encodeURIComponent(query)}`,
      thumb: `https://source.unsplash.com/featured/200x150?${encodeURIComponent(query)}`,
      width: 800,
      height: 600,
    }))
    return JSON.stringify({ ok: true, provider, query, results } as StockResult, null, 2)
  }

  throw new Error(`Unknown provider: ${provider}`)
}
