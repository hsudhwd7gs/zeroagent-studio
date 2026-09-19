import * as photon from 'photon-wasm'

let photonReady = false

async function initPhoton() {
  if (photonReady) return
  await photon.default()
  photonReady = true
}

export async function runPhoton(
  input: string,
  config: Record<string, string>
): Promise<string> {
  await initPhoton()
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
  const blob = new Blob([outputBytes], { type: 'image/png' })
  const outputUrl = URL.createObjectURL(blob)

  image.free()

  return JSON.stringify({
    ok: true,
    url: outputUrl,
    filter,
    size: blob.size,
  })
}
