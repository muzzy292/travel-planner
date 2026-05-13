import { useState } from 'react'

function getDays(start, end) {
  const days = []
  const cur = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export default function PromoteModal({ item, trip, onPromote, onClose }) {
  const days = getDays(trip.start_date, trip.end_date)
  const [selectedDay, setSelectedDay] = useState(days[0])
  const [saving, setSaving] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onPromote(item.id, selectedDay)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to itinerary</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <p style={{ padding: '0 1.25rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            Adding <strong>{item.title}</strong> to the itinerary. Choose a day:
          </p>
          <label style={{ padding: '0 1.25rem' }}>
            Day
            <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
              {days.map((day, i) => {
                const label = new Date(day + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                return <option key={day} value={day}>Day {i + 1} — {label}</option>
              })}
            </select>
          </label>
          <div className="modal-actions" style={{ padding: '0 1.25rem 1.25rem' }}>
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add to itinerary'}</button>
            <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
