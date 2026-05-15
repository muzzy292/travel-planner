function nightsBetween(a, b) {
  if (!a || !b) return 0
  return Math.max(0, Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000))
}

function extractCity(stay) {
  // Explicit city field is most reliable
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

export default function CityDaysWidget({ stays }) {
  if (!stays?.filter(s => s.check_in_date && s.check_out_date).length) return null

  const today = new Date().toISOString().slice(0, 10)

  // Group nights by derived city name
  const map = {}
  for (const stay of stays) {
    if (!stay.check_in_date || !stay.check_out_date) continue
    const city = extractCity(stay)
    const nights = nightsBetween(stay.check_in_date, stay.check_out_date)
    if (!nights) continue
    if (!map[city]) map[city] = { nights: 0, from: stay.check_in_date, to: stay.check_out_date, current: false }
    map[city].nights += nights
    if (stay.check_in_date <= today && today < stay.check_out_date) map[city].current = true
    if (stay.check_in_date < map[city].from) map[city].from = stay.check_in_date
    if (stay.check_out_date > map[city].to) map[city].to = stay.check_out_date
  }

  const cities = Object.entries(map).sort((a, b) => a[1].from.localeCompare(b[1].from))
  if (!cities.length) return null

  function fmtDate(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="db-section">
      <div className="db-section-header">
        <h3>📍 Days per city</h3>
        <a href="/accommodation" className="db-section-link">Edit stays →</a>
      </div>
      <div className="db-cities">
        {cities.map(([city, info]) => (
          <div key={city} className={`db-city-row ${info.current ? 'db-city-current' : ''}`}>
            <div className="db-city-left">
              {info.current && <span className="db-here-badge">Here now</span>}
              <span className="db-city-name">{city}</span>
              <span className="db-city-dates">{fmtDate(info.from)} – {fmtDate(info.to)}</span>
            </div>
            <span className="db-city-nights">
              {info.nights} night{info.nights !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
