import { useState } from 'react'

const EMPTY = {
  flightNumber: '', airline: '', from: '', to: '',
  departure_date: '', departure_time: '',
  arrival_date: '', arrival_time: '',
  confirmation: '', cost: '', status: 'confirmed', notes: '',
}

function parseNotes(raw) {
  // Parses structured notes back into form fields
  const lines = (raw || '').split('\n')
  let arrival_date = '', arrival_time = '', confirmation = ''
  const remaining = []
  for (const line of lines) {
    const arrMatch = line.match(/^Arrives:\s*(\d{4}-\d{2}-\d{2})?\s*(\d{2}:\d{2})?/)
    const confMatch = line.match(/^Conf:\s*(.+)/)
    if (arrMatch) {
      arrival_date = arrMatch[1] || ''
      arrival_time = arrMatch[2] || ''
    } else if (confMatch) {
      confirmation = confMatch[1]
    } else {
      remaining.push(line)
    }
  }
  return { arrival_date, arrival_time, confirmation, notes: remaining.join('\n').trim() }
}

function buildNotes(form) {
  const parts = []
  if (form.arrival_date || form.arrival_time) {
    parts.push(`Arrives: ${form.arrival_date || ''} ${form.arrival_time || ''}`.trim())
  }
  if (form.confirmation) parts.push(`Conf: ${form.confirmation}`)
  if (form.notes) parts.push(form.notes)
  return parts.join('\n') || null
}

export default function FlightBookingModal({ mode, item, trip, onSave, onDelete, onClose }) {
  function initForm() {
    if (mode === 'edit' && item) {
      const [from = '', to = ''] = (item.location || '').split(' → ')
      const { arrival_date, arrival_time, confirmation, notes } = parseNotes(item.notes)
      return {
        flightNumber: item.title || '',
        airline: '',
        from,
        to,
        departure_date: item.day_date || '',
        departure_time: item.start_time ? item.start_time.slice(0, 5) : '',
        arrival_date,
        arrival_time,
        confirmation,
        cost: item.cost != null ? String(item.cost) : '',
        status: item.status || 'confirmed',
        notes,
      }
    }
    return { ...EMPTY, departure_date: trip.start_date }
  }

  const [form, setForm] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const location = [form.from, form.to].filter(Boolean).join(' → ') || null
    await onSave({
      title: [form.airline, form.flightNumber].filter(Boolean).join(' ') || 'Flight',
      location,
      day_date: form.departure_date,
      start_time: form.departure_time || null,
      item_type: 'flight',
      status: form.status,
      cost: form.cost ? parseFloat(form.cost) : null,
      notes: buildNotes(form),
    })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add flight' : 'Edit flight'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label style={{ flex: 2 }}>
              Airline
              <input name="airline" value={form.airline} onChange={onChange} placeholder="e.g. Vietjet" />
            </label>
            <label style={{ flex: 1 }}>
              Flight number
              <input name="flightNumber" value={form.flightNumber} onChange={onChange} placeholder="e.g. VJ123" required />
            </label>
          </div>
          <div className="form-row">
            <label>
              From
              <input name="from" value={form.from} onChange={onChange} placeholder="e.g. Sydney (SYD)" />
            </label>
            <div className="flight-arrow">→</div>
            <label>
              To
              <input name="to" value={form.to} onChange={onChange} placeholder="e.g. Hanoi (HAN)" />
            </label>
          </div>
          <div className="form-row">
            <label>
              Departure date
              <input type="date" name="departure_date" value={form.departure_date} onChange={onChange} required />
            </label>
            <label>
              Departure time
              <input type="time" name="departure_time" value={form.departure_time} onChange={onChange} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Arrival date
              <input type="date" name="arrival_date" value={form.arrival_date} onChange={onChange} />
            </label>
            <label>
              Arrival time
              <input type="time" name="arrival_time" value={form.arrival_time} onChange={onChange} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Confirmation number
              <input name="confirmation" value={form.confirmation} onChange={onChange} placeholder="e.g. ABC123" />
            </label>
            <label>
              Cost (AUD)
              <input type="number" name="cost" value={form.cost} onChange={onChange} min="0" step="0.01" placeholder="0.00" />
            </label>
          </div>
          <div className="form-row">
            <label>
              Status
              <select name="status" value={form.status} onChange={onChange}>
                <option value="confirmed">Confirmed</option>
                <option value="tentative">Tentative</option>
              </select>
            </label>
          </div>
          <label>
            Notes (seat, baggage, meal, etc.)
            <textarea name="notes" value={form.notes} onChange={onChange} rows={2} placeholder="e.g. Seat 14A, 20kg baggage included" />
          </label>
          <div className="modal-actions">
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            {mode === 'edit' && !confirmDelete && (
              <button className="btn btn-danger" type="button" onClick={() => setConfirmDelete(true)}>Delete</button>
            )}
            {confirmDelete && (
              <button className="btn btn-danger" type="button" onClick={() => onDelete(item.id)}>Confirm delete</button>
            )}
            <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
