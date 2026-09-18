// Base64 — encode or decode base64 text.
//
// Config:
//   mode — encode (default) | decode

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUtf8(b64: string): string {
  // Strip whitespace and URL-safe chars
  const cleaned = b64.replace(/[\s\r\n]+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = cleaned + '='.repeat((4 - (cleaned.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

export async function runBase64Codec(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const mode = config.mode ?? 'encode'

  if (mode === 'decode') {
    try {
      return base64ToUtf8(input)
    } catch (err) {
      throw new Error(
        `Invalid base64: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err }
      )
    }
  }

  return utf8ToBase64(input)
}
