// Open-Meteo weather helpers — no API key required

const WMO_EMOJI = {
  0: '☀️',
  1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
  80: '🌦️', 81: '🌦️', 82: '🌧️',
  85: '🌨️', 86: '🌨️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

export function wmoEmoji(code) {
  return WMO_EMOJI[code] ?? '🌡️'
}

// Fetch 14-day daily forecast for given coordinates
export async function fetchForecast(lat, lng) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    timezone: 'auto',
    forecast_days: '14',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const { daily } = await res.json()
  return daily.time.map((date, i) => ({
    d:     new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' }),
    date,
    hi:    Math.round(daily.temperature_2m_max[i]),
    lo:    Math.round(daily.temperature_2m_min[i]),
    p:     daily.precipitation_probability_max[i] ?? 0,
    emoji: wmoEmoji(daily.weather_code[i]),
  }))
}

// Geocode a city name → { lat, lng, name } using Open-Meteo's free geocoding API
export async function geocodeCity(name) {
  const params = new URLSearchParams({ name, count: '1', language: 'en', format: 'json' })
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`)
  if (!res.ok) return null
  const { results } = await res.json()
  const r = results?.[0]
  return r ? { lat: r.latitude, lng: r.longitude, name: r.name } : null
}
