// TensorFlow.js — dynamic CDN import. Supports:
//   • info    → report tf version + backends
//   • classify → load a LayersModel from modelUrl and run inference on an image URL

const TFJS_URL = 'https://esm.sh/@tensorflow/tfjs@4.22.0'

let TfRef: any | null = null
async function loadTf(): Promise<any> {
  if (TfRef) return TfRef
  TfRef = await import(/* @vite-ignore */ TFJS_URL)
  return TfRef
}

export async function runTfjs(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const tf = await loadTf()
  const mode = config.mode || 'info'

  if (mode === 'info') {
    await tf.ready()
    return JSON.stringify({
      ok: true,
      version: tf.version_core ?? tf.version?.core ?? 'unknown',
      backend: tf.getBackend(),
      backends: ['cpu', 'webgl', 'webgpu'].filter((b) => {
        try {
          return !!tf.findBackend(b)
        } catch {
          return false
        }
      }),
    }, null, 2)
  }

  if (mode === 'classify') {
    const modelUrl = config.modelUrl?.trim()
    if (!modelUrl) throw new Error('No modelUrl provided')
    const imageUrl = config.imageUrl?.trim() || input.trim()
    if (!imageUrl) throw new Error('No imageUrl provided')

    const model = await tf.loadLayersModel(modelUrl)
    const inputShape = model.inputs?.[0]?.shape ?? [null, 224, 224, 3]
    const targetH = inputShape[1] ?? 224
    const targetW = inputShape[2] ?? 224

    // Load image
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load image'))
    })

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, targetW, targetH)
    const { data } = ctx.getImageData(0, 0, targetW, targetH)

    const tensor = tf.tidy(() =>
      tf.sub(
        tf.div(
          tf.tensor4d(Array.from(data), [1, targetH, targetW, 4]).slice([0, 0, 0, 0], [1, targetH, targetW, 3]),
          127.5
        ),
        1
      )
    )

    const prediction = model.predict(tensor) as any
    const probs = await (Array.isArray(prediction) ? prediction[0] : prediction).data()
    tensor.dispose()
    model.dispose()

    return JSON.stringify({
      ok: true,
      mode,
      inputShape,
      predictions: Array.from(probs).slice(0, 10),
    }, null, 2)
  }

  return JSON.stringify({ ok: true, mode })
}
