// Photon — apply image filters via @silvia-odwyer/photon (WASM, CDN-loaded).

const PHOTON_URL = 'https://esm.sh/@silvia-odwyer/photon@0.34.0'

let PhotonRef: any | null = null
let PhotonInit: Promise<any> | null = null
async function loadPhoton(): Promise<any> {
  if (PhotonRef) return PhotonRef
  if (!PhotonInit) {
    PhotonInit = (async () => {
      const mod = await import(/* @vite-ignore */ PHOTON_URL)
      const photon = mod.default ?? mod
      // photon is a WASM module that exposes a default async init
      if (typeof photon === 'function') {
        PhotonRef = await photon()
      } else if (photon && typeof photon.init === 'function') {
        await photon.init()
        PhotonRef = photon
      } else {
        PhotonRef = photon
      }
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
    image.free()
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
