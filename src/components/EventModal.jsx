import { useState, useEffect, useRef } from 'react'

const EMPTY = { title: '', start_time: '', location: '', notes: '', status: 'tentative' }

function loadMapsScript(apiKey) {
  return new Promise((resolve) => {
    if (window.google?.maps?.places) return resolve()
    if (document.getElementById('maps-script')) {
      document.getElementById('maps-script').addEventListener('load', resolve)
      return
    }
    const script = document.createElement('script')
    script.id = 'maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = resolve
    document.body.appendChild(script)
  })
}

export default function EventModal({ mode, day, item, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(mode === 'edit' ? {
    title: item.title,
    start_time: item.start_time || '',
    location: item.location || '',
    notes: item.notes || '',
    status: item.status,
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const locationRef = useRef(null)
  const autocompleteRef = useRef(null)

  const label = new Date(day + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey || !locationRef.current) return

    loadMapsScript(apiKey).then(() => {
      if (!locationRef.current) return
      autocompleteRef.current = new window.google.maps.places.Autocomplete(locationRef.current, {
        fields: ['formatted_address', 'name'],
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        const value = place.name && place.formatted_address
          ? `${place.name}, ${place.formatted_address}`
          : place.formatted_address || place.name || ''
        setForm((prev) => ({ ...prev, location: value }))
      })
    })

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [])

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...form, start_time: form.start_time || null, location: form.location || null, notes: form.notes || null })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add event' : 'Edit event'}</h3>
          <span className="modal-date">{label}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <label>
            Title
            <input name="title" value={form.title} onChange={onChange} required autoFocus placeholder="e.g. Shinjuku walking tour" />
          </label>
          <label>
            Time (optional)
            <input type="time" name="start_time" value={form.start_time} onChange={onChange} />
          </label>
          <label>
            Location (optional)
            <input
              ref={locationRef}
              name="location"
              value={form.location}
              onChange={onChange}
              placeholder="Search for a place…"
              autoComplete="off"
            />
          </label>
          <label>
            Notes (optional)
            <textarea name="notes" value={form.notes} onChange={onChange} rows={3} placeholder="Any details…" />
          </label>
          <label>
            Status
            <select name="status" value={form.status} onChange={onChange}>
              <option value="tentative">Tentative</option>
              <option value="confirmed">Confirmed</option>
            </select>
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
