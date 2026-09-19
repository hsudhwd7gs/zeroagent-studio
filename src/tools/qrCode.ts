// QR Code Generator — uses the free goqr.me API (no key).

export async function runQrCode(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const text = config.text?.trim() || input.trim()
  if (!text) throw new Error('text required')
  const size = config.size ?? '256'
  const color = (config.color ?? '#000000').replace('#', '')
  const bgColor = (config.bgColor ?? '#ffffff').replace('#', '')

  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=${color}&bgcolor=${bgColor}`
  return JSON.stringify({ ok: true, text, size, url, color: config.color, bgColor: config.bgColor }, null, 2)
}
