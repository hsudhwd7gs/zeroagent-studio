// IP Lookup node — uses ipwho.is (free, no key, HTTPS-native).
// The previous provider (ip-api.com) silently broke: its free tier is
// HTTP-only, so every HTTPS call from the app returned 403
// "SSL unavailable for this endpoint".

interface IpWhoResponse {
  ip?: string
  success?: boolean
  message?: string
  type?: string
  continent?: string
  country?: string
  country_code?: string
  region?: string
  region_code?: string
  city?: string
  latitude?: number
  longitude?: number
  is_eu?: boolean
  postal?: string
  calling_code?: string
  capital?: string
  borders?: string
  flag?: { img?: string; emoji?: string; emoji_unicode?: string }
  connection?: { asn?: number; org?: string; isp?: string; domain?: string }
  timezone?: { id?: string; abbr?: string; is_dst?: boolean; offset?: number; utc?: string; current_time?: string }
}

export async function runIpLookup(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const ip = config.ip?.trim() || input.trim() || ''
  const target = ip ? ip : ''
  const url = `https://ipwho.is/${encodeURIComponent(target)}`

  let res: Response
  try {
    res = await fetch(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`IP lookup request failed: ${msg}`, { cause: err })
  }
  if (!res.ok) throw new Error(`IP lookup failed: ${res.status}`)
  const data = await res.json() as IpWhoResponse
  if (data.success === false) {
    throw new Error(`IP lookup failed: ${data.message ?? 'unknown ipwho.is error'}`)
  }
  return JSON.stringify(
    {
      ok: true,
      ip: data.ip,
      type: data.type,
      continent: data.continent,
      country: data.country,
      country_code: data.country_code,
      region: data.region,
      city: data.city,
      postal: data.postal,
      latitude: data.latitude,
      longitude: data.longitude,
      is_eu: data.is_eu,
      flag: data.flag?.emoji,
      org: data.connection?.org,
      isp: data.connection?.isp,
      asn: data.connection?.asn,
      timezone: data.timezone?.id,
      utc_offset: data.timezone?.utc,
    },
    null,
    2
  )
}
