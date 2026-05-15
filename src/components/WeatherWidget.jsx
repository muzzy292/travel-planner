import { useEffect, useState } from 'react'

const WX_ICON = (code) => {
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code <= 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 57) return '🌦️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '🌨️'
  if (code <= 82) return '🌦️'
  if (code <= 86) return '🌨️'
  return '⛈️'
}

const WX_LABEL = (code) => {
  if (code === 0) return 'Clear'
  if (code <= 2) return 'Partly cloudy'
  if (code <= 3) return 'Overcast'
  if (code <= 48) return 'Foggy'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Showers'
  if (code <= 86) return 'Snow showers'
  return 'Thunderstorm'
}

function extractCityQuery(stay) {
  // Explicit city field is most reliable for geocoding
  if (stay.city) return stay.city
  // Fall back to address parsing (penultimate comma segment)
  if (stay.address) {
    const parts = stay.address.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length >= 3) return parts[parts.length - 2]
    if (parts.length >= 2) return parts[0]
    return parts[0]
  }
  return stay.name
}

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export default function WeatherWidget({ stays, destination }) {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetchWeather()
  }, [stays, destination, refreshKey])

  async function fetchWeather() {
    setLoading(true)

    // Build unique city query list from stays, fall back to destination
    const queries = []
    const seen = new Set()
    if (stays?.length) {
      for (const stay of stays) {
        const q = extractCityQuery(stay)
        const key = q.toLowerCase()
        if (q && !seen.has(key)) { seen.add(key); queries.push(q) }
      }
    }
    if (!queries.length && destination) {
      queries.push(destination.split(',')[0].trim())
    }
    if (!queries.length) { setLoading(false); return }

    const cacheKey = `wx_v2_${queries.join('|')}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { data, ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL) { setWeather(data); setLoading(false); return }
      }
    } catch {}

    const results = []
    for (const query of queries.slice(0, 4)) {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
        )
        const geo = await geoRes.json()
        if (!geo.results?.length) continue
        const { latitude, longitude, name } = geo.results[0]

        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
        )
        const wx = await wxRes.json()
        results.push({
          city: name,
          temp: Math.round(wx.current?.temperature_2m ?? 0),
          code: wx.current?.weather_code ?? 0,
        })
      } catch {}
    }

    try { localStorage.setItem(cacheKey, JSON.stringify({ data: results, ts: Date.now() })) } catch {}
    setWeather(results)
    setLoading(false)
  }

  if (!loading && !weather?.length) return null

  return (
    <div className="db-section">
      <div className="db-section-header">
        <h3>🌤️ Weather</h3>
        <button className="db-section-link btn-plain" onClick={() => setRefreshKey(k => k + 1)}>↻ Refresh</button>
      </div>
      {loading && <p className="muted small">Loading…</p>}
      {!loading && (
        <div className="db-weather-grid">
          {weather.map((w) => (
            <div key={w.city} className="db-weather-item">
              <span className="db-weather-icon">{WX_ICON(w.code)}</span>
              <div className="db-weather-body">
                <span className="db-weather-city">{w.city}</span>
                <span className="db-weather-temp">{w.temp}°C</span>
                <span className="db-weather-label">{WX_LABEL(w.code)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
