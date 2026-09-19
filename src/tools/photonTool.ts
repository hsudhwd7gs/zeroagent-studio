// Photon — apply image filters via @silvia-odwyer/photon (WASM, CDN-loaded).
// NOTE: the latest published version is 0.3.3 — 0.34.0 never existed and 404s.

const PHOTON_URL = 'https://esm.sh/@silvia-odwyer/photon@0.3.3'

interface PhotonImage {
  get_bytes: () => Uint8Array
  free?: () => void
}

interface PhotonModule {
  PhotonImage: { new_from_byteslice: (bytes: Uint8Array) => PhotonImage }
  grayscale: (image: PhotonImage) => void
  sepia: (image: PhotonImage) => void
  gaussian_blur: (image: PhotonImage, radius: number) => void
  invert: (image: PhotonImage) => void
  init?: () => Promise<void>
}

let PhotonRef: PhotonModule | null = null
let PhotonInit: Promise<PhotonModule> | null = null

async function loadPhoton(): Promise<PhotonModule> {
  if (PhotonRef) return PhotonRef
  if (!PhotonInit) {
    PhotonInit = (async () => {
      const mod = (await import(/* @vite-ignore */ PHOTON_URL)) as {
        default?: unknown
      } & Record<string, unknown>
      const candidate: unknown = mod.default ?? mod
      let photon: PhotonModule
      if (typeof candidate === 'function') {
        // wasm-bindgen style: default export is the async init() that
        // compiles the embedded WASM. It may return the exports or void —
        // the named exports on the module namespace are populated either way.
        const inited = await (candidate as () => Promise<unknown>)()
        photon =
          inited && typeof inited === 'object' && 'PhotonImage' in (inited as Record<string, unknown>)
            ? (inited as PhotonModule)
            : (mod as unknown as PhotonModule)
      } else {
        const maybeModule = candidate as PhotonModule
        if (maybeModule && typeof maybeModule.init === 'function') {
          await maybeModule.init()
        }
        photon = maybeModule
      }
      if (typeof photon.PhotonImage?.new_from_byteslice !== 'function') {
        throw new Error('Photon WASM module loaded but PhotonImage is missing — the CDN build may have changed')
      }
      PhotonRef = photon
      return PhotonRef
    })()
  }
  return PhotonInit
}

export async function runPhoton(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const photon = await loadPhoton()
  const url = config.url?.trim() || input.trim()
  if (!url) throw new Error('No image URL')

  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const image = photon.PhotonImage.new_from_byteslice(new Uint8Array(buffer))

  const filter = config.filter || 'none'
  if (filter === 'grayscale') {
    photon.grayscale(image)
  } else if (filter === 'sepia') {
    photon.sepia(image)
  } else if (filter === 'blur') {
    photon.gaussian_blur(image, 5)
  } else if (filter === 'invert') {
    photon.invert(image)
  }

  const outputBytes = image.get_bytes()
  // Cast to ArrayBuffer to satisfy BlobPart typing across TS lib versions
  const blob = new Blob([(outputBytes as Uint8Array).buffer as ArrayBuffer], { type: 'image/png' })
  const outputUrl = URL.createObjectURL(blob)

  try {
    image.free?.()
  } catch {
    /* ignore — some versions don't expose free() */
  }

  return JSON.stringify({
    ok: true,
    url: outputUrl,
    filter,
    size: blob.size,
  })
}
