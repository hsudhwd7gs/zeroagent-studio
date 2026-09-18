// YouTube Analytics — fetch stats for a video via YouTube Data API v3.
//
// Config:
//   apiKey  — YouTube Data API key (required)
//   videoId — video ID (falls back to input)
//   part    — snippet,statistics,contentDetails,status (default)
//
// Docs: https://developers.google.com/youtube/v3/docs/videos/list

export async function runYoutubeAnalytics(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const apiKey = (config.apiKey ?? '').trim()
  if (!apiKey) throw new Error('YouTube Data API key is required')

  const videoId = (config.videoId ?? '').trim() || input.trim()
  if (!videoId) throw new Error('No videoId provided')

  const part =
    config.part?.trim() || 'snippet,statistics,contentDetails,status'

  const url =
    `https://www.googleapis.com/youtube/v3/videos` +
    `?part=${encodeURIComponent(part)}` +
    `&id=${encodeURIComponent(videoId)}` +
    `&key=${apiKey}`

  let response: Response
  try {
    response = await fetch(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`YouTube API request failed: ${msg}`, { cause: err })
  }
  
  let text: string
  try {
    text = await response.text()
  } catch (err) {
    throw new Error('Failed to read response', { cause: err })
  }

  if (!response.ok) {
    throw new Error(`YouTube API returned ${response.status}: ${text.slice(0, 500)}`)
  }

  try {
    const json = JSON.parse(text)
    return JSON.stringify(json, null, 2)
  } catch {
    return text
  }
}
