// IP Lookup node — uses the free ip-api.com (no key, 45 req/min).

export async function runIpLookup(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const ip = config.ip?.trim() || input.trim() || ''
  const url = ip
    ? `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=66846719`
    : `https://ip-api.com/json/?fields=66846719`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`IP lookup failed: ${res.status}`)
  return JSON.stringify(await res.json(), null, 2)
}
