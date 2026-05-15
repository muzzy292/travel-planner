import { Link } from 'react-router-dom'

// Most airlines open check-in 48h before international flights
const CHECKIN_HOURS_BEFORE = 48

function checkinStatus(dateStr, timeStr) {
  const dep = new Date(`${dateStr}T${timeStr || '12:00'}:00`)
  const opensAt = new Date(dep.getTime() - CHECKIN_HOURS_BEFORE * 3600000)
  const now = new Date()
  const msUntilDep = dep - now

  if (msUntilDep <= 0) return { label: 'Departed', type: 'departed' }

  const msUntilOpen = opensAt - now
  if (msUntilOpen <= 0) {
    const hLeft = Math.round(msUntilDep / 3600000)
    return { label: `Check-in open · flight in ${hLeft}h`, type: 'open' }
  }

  const hUntilOpen = Math.round(msUntilOpen / 3600000)
  if (hUntilOpen < 24) return { label: `Check-in opens in ${hUntilOpen}h`, type: 'soon' }
  const d = Math.floor(hUntilOpen / 24)
  const h = hUntilOpen % 24
  return { label: `Check-in opens in ${d}d${h ? ` ${h}h` : ''}`, type: 'waiting' }
}

function timeUntil(dateStr, timeStr) {
  const dep = new Date(`${dateStr}T${timeStr || '00:00'}:00`)
  const now = new Date()
  const ms = dep - now
  if (ms <= 0) return null
  const h = Math.round(ms / 3600000)
  const d = Math.floor(h / 24)
  if (d === 0) return `in ${h}h`
  if (d === 1) return 'Tomorrow'
  return `in ${d} days`
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function FlightWidget({ flights }) {
  if (!flights?.length) return null

  return (
    <div className="db-section">
      <div className="db-section-header">
        <h3>✈️ Upcoming flights</h3>
        <Link to="/itinerary" className="db-section-link">Itinerary →</Link>
      </div>
      <div className="db-flights">
        {flights.slice(0, 3).map((flight) => {
          const checkin = checkinStatus(flight.day_date, flight.start_time)
          const until = timeUntil(flight.day_date, flight.start_time)
          return (
            <div key={flight.id} className={`db-flight db-flight-${flight.status}`}>
              <div className="db-flight-top">
                <span className="db-flight-name">{flight.title}</span>
                <span className={`db-flight-badge ${flight.status}`}>{flight.status}</span>
              </div>
              <div className="db-flight-row">
                <span className="db-flight-date">
                  {fmtDate(flight.day_date)}
                  {flight.start_time && ` · ${flight.start_time.slice(0, 5)}`}
                </span>
                {until && <span className="db-flight-until">{until}</span>}
              </div>
              {flight.location && (
                <div className="db-flight-location">📍 {flight.location}</div>
              )}
              {flight.notes && (
                <div className="db-flight-notes">{flight.notes}</div>
              )}
              {checkin.type !== 'departed' && (
                <div className={`db-flight-checkin db-checkin-${checkin.type}`}>
                  🎫 {checkin.label}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
