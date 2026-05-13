import { useState } from 'react'

const TIMEZONES = [
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth',
  'Australia/Adelaide', 'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Honolulu',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore',
  'Asia/Bangkok', 'Asia/Ho_Chi_Minh', 'Asia/Phnom_Penh', 'Asia/Vientiane',
  'Asia/Bali', 'Asia/Jakarta', 'Asia/Manila', 'Asia/Kuala_Lumpur',
  'Asia/Colombo', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Doha', 'Asia/Riyadh',
  'Asia/Istanbul', 'Europe/Athens', 'Europe/Rome', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Zurich', 'Europe/London',
  'Atlantic/Reykjavik', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Vancouver', 'America/Toronto', 'America/Cancun',
  'America/Bogota', 'America/Lima', 'America/Sao_Paulo', 'America/Buenos_Aires',
]

const EMPTY_FORM = { name: '', destination: '', start_date: '', end_date: '', budget: '', timezone: 'Australia/Sydney' }

export default function Settings({ trip, createTrip, updateTrip, calendarConnected, connectCalendar }) {
  const [mode, setMode] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setMode('create')
    setError(null)
    setSuccess(null)
  }

  function openEdit() {
    if (!trip) return
    setForm({
      name: trip.name,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      budget: trip.budget ?? '',
      timezone: trip.timezone || 'Australia/Sydney',
    })
    setMode('edit')
    setError(null)
    setSuccess(null)
  }

  function cancel() {
    setMode(null)
    setError(null)
    setSuccess(null)
  }

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError('End date must be after start date.')
      return
    }

    setSaving(true)
    const payload = { ...form, budget: form.budget ? parseFloat(form.budget) : null }

    const { error } = mode === 'create'
      ? await createTrip(payload)
      : await updateTrip(trip.id, payload)

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(mode === 'create' ? 'Trip created!' : 'Trip updated!')
      setMode(null)
    }
  }

  return (
    <div className="page">
      <h2>Settings</h2>

      <section className="settings-section">
        <h3>Trip Management</h3>
        {trip && (
          <div className="current-trip-card">
            <div>
              <strong>{trip.name}</strong>
              <span className="muted"> — {trip.destination}</span>
            </div>
            <div className="muted small">
              {trip.start_date} to {trip.end_date}
              {trip.budget ? ` · Budget $${Number(trip.budget).toLocaleString()}` : ''}
              {trip.timezone ? ` · ${trip.timezone}` : ''}
            </div>
          </div>
        )}

        <div className="btn-row">
          <button className="btn" onClick={openCreate}>+ New trip</button>
          {trip && <button className="btn btn-secondary" onClick={openEdit}>Edit current trip</button>}
        </div>

        {success && <p className="success-msg">{success}</p>}

        {mode && (
          <form className="trip-form" onSubmit={onSubmit}>
            <h4>{mode === 'create' ? 'New Trip' : 'Edit Trip'}</h4>

            <label>
              Trip name
              <input name="name" value={form.name} onChange={onChange} required placeholder="e.g. Japan 2026" />
            </label>

            <label>
              Destination
              <input name="destination" value={form.destination} onChange={onChange} required placeholder="e.g. Tokyo, Japan" />
            </label>

            <div className="form-row">
              <label>
                Start date
                <input type="date" name="start_date" value={form.start_date} onChange={onChange} required />
              </label>
              <label>
                End date
                <input type="date" name="end_date" value={form.end_date} onChange={onChange} required />
              </label>
            </div>

            <label>
              Destination timezone
              <select name="timezone" value={form.timezone} onChange={onChange}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>

            <label>
              Total budget (AUD)
              <input type="number" name="budget" value={form.budget} onChange={onChange} placeholder="e.g. 8000" min="0" step="1" />
            </label>

            {error && <p className="error">{error}</p>}

            <div className="btn-row">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Saving…' : mode === 'create' ? 'Create trip' : 'Save changes'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={cancel}>Cancel</button>
            </div>
          </form>
        )}
      </section>

      <section className="settings-section">
        <h3>Google Calendar</h3>
        <p className="muted small">Connect to sync flights and accommodation to your Google Calendar.</p>
        <div className="calendar-status">
          <span className={`status-dot ${calendarConnected ? 'connected' : 'disconnected'}`} />
          <span>{calendarConnected ? 'Connected' : 'Not connected'}</span>
          {!calendarConnected && (
            <button className="btn btn-secondary" onClick={connectCalendar}>Connect</button>
          )}
        </div>
      </section>
    </div>
  )
}
