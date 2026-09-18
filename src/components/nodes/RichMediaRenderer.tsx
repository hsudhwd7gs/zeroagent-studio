import { memo } from 'react'

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|bmp|avif)(\?|#|$)/i
const VIDEO_EXT = /\.(mp4|webm|mov|mkv|ogv)(\?|#|$)/i
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|flac|aac|opus)(\?|#|$)/i
const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
const URL_RE = /https?:\/\/[^\s<>"'`]+/g

type UrlKind = 'image' | 'video' | 'audio' | 'youtube' | 'link'

function classifyUrl(url: string): UrlKind {
  if (YOUTUBE_RE.test(url)) return 'youtube'
  if (IMAGE_EXT.test(url)) return 'image'
  if (VIDEO_EXT.test(url)) return 'video'
  if (AUDIO_EXT.test(url)) return 'audio'
  return 'link'
}

function youtubeId(url: string): string | null {
  const m = url.match(YOUTUBE_RE)
  return m ? m[1] : null
}

function MediaUrl({ url }: { url: string }) {
  const kind = classifyUrl(url)

  if (kind === 'image') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="rich-media__link"
        title="Open image in new tab"
      >
        <img src={url} alt="" className="rich-media__image" loading="lazy" />
      </a>
    )
  }

  if (kind === 'video') {
    return (
      <video
        src={url}
        controls
        className="rich-media__video"
        preload="metadata"
      />
    )
  }

  if (kind === 'audio') {
    return (
      <audio
        src={url}
        controls
        className="rich-media__audio"
        preload="metadata"
      />
    )
  }

  if (kind === 'youtube') {
    const id = youtubeId(url)
    if (id) {
      return (
        <div className="rich-media__video-embed">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )
    }
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="rich-media__text-link"
    >
      {url}
    </a>
  )
}

function TextSegment({ text }: { text: string }) {
  if (!text) return null
  return <span className="rich-media__text">{text}</span>
}

export const RichMediaRenderer = memo(function RichMediaRenderer({
  text,
}: {
  text: string
}) {
  if (!text) return null

  const parts: Array<{ type: 'text' | 'url'; value: string }> = []
  let last = 0
  for (const m of text.matchAll(URL_RE)) {
    const idx = m.index ?? 0
    if (idx > last) parts.push({ type: 'text', value: text.slice(last, idx) })
    parts.push({ type: 'url', value: m[0] })
    last = idx + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })

  if (parts.length === 1 && parts[0].type === 'text') {
    return <pre className="rich-media rich-media--plain">{text}</pre>
  }

  return (
    <div className="rich-media">
      {parts.map((p, i) =>
        p.type === 'url' ? (
          <MediaUrl key={i} url={p.value} />
        ) : (
          <TextSegment key={i} text={p.value} />
        )
      )}
    </div>
  )
})
