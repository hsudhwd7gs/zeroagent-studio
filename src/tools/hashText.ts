// Hash — SHA-256 / SHA-1 / SHA-384 / SHA-512 of the input text.
//
// Config:
//   algorithm — SHA-256 (default) | SHA-1 | SHA-384 | SHA-512
//   encoding  — hex (default) | base64

export async function runHashText(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const algorithmMap: Record<string, string> = {
    'SHA-256': 'SHA-256',
    'SHA-1': 'SHA-1',
    'SHA-384': 'SHA-384',
    'SHA-512': 'SHA-512',
    'sha256': 'SHA-256',
    'sha1': 'SHA-1',
    'sha384': 'SHA-384',
    'sha512': 'SHA-512',
  }

  const algorithm = algorithmMap[config.algorithm ?? 'SHA-256'] ?? 'SHA-256'
  const encoding = config.encoding ?? 'hex'

  const encoder = new TextEncoder()
  const data = encoder.encode(input)

  let buffer: ArrayBuffer
  try {
    buffer = await crypto.subtle.digest(algorithm, data)
  } catch (err) {
    throw new Error(
      `Hash failed: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    )
  }

  const bytes = new Uint8Array(buffer)

  if (encoding === 'base64') {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  // hex
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}
