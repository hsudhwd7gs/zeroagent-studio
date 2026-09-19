// Weather node — uses Open-Meteo (free, no API key required).

export async function runWeather(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const location = config.location?.trim() || input.trim()
  if (!location) throw new Error('location required')
  const units = config.units ?? 'metric'
  const isImperial = units === 'imperial'

  // 1. Geocode via Open-Meteo
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
  )
  if (!geoRes.ok) throw new Error(`Geocoding failed: ${geoRes.status}`)
  const geoData = await geoRes.json() as any
  if (!geoData.results?.length) throw new Error(`Location not found: ${location}`)
  const place = geoData.results[0]

  // 2. Weather via Open-Meteo
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m` +
    `&hourly=temperature_2m,precipitation_probability,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
    `&forecast_days=7&timezone=auto` + (isImperial ? '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch' : ''),
  )
  if (!weatherRes.ok) throw new Error(`Weather fetch failed: ${weatherRes.status}`)
  const w = await weatherRes.json() as any

  return JSON.stringify({
    ok: true,
    location: place.name + (place.admin1 ? ', ' + place.admin1 : '') + (place.country ? ', ' + place.country : ''),
    latitude: place.latitude,
    longitude: place.longitude,
    current: w.current,
    daily: w.daily,
    hourly: w.hourly,
    units: { temperature: isImperial ? '°F' : '°C', wind: isImperial ? 'mph' : 'km/h' },
  }, null, 2)
}
