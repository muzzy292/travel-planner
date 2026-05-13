import { useState, useEffect, useRef } from 'react'

const EMPTY = { name: '', type: 'Hotel', address: '', check_in_date: '', check_in_time: '', check_out_date: '', check_out_time: '', confirmation_number: '', notes: '', url: '', price: '' }

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

export default function AccommodationModal({ mode, item, types, trip, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(mode === 'edit' ? {
    name: item.name,
    type: item.type || 'Hotel',
    address: item.address || '',
    check_in_date: item.check_in_date || '',
    check_in_time: item.check_in_time || '',
    check_out_date: item.check_out_date || '',
    check_out_time: item.check_out_time || '',
    confirmation_number: item.confirmation_number || '',
    notes: item.notes || '',
    url: item.url || '',
    price: item.price || '',
  } : { ...EMPTY, check_in_date: trip.start_date, check_out_date: trip.end_date })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const addressRef = useRef(null)
  const autocompleteRef = useRef(null)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey || !addressRef.current) return
    loadMapsScript(apiKey).then(() => {
      if (!addressRef.current) return
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressRef.current, {
        fields: ['formatted_address', 'name'],
        types: ['lodging', 'establishment'],
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        const address = place.formatted_address || ''
        const name = place.name || ''
        setForm((prev) => ({
          ...prev,
          address,
          name: prev.name || name,
        }))
      })
    })
    return () => {
      if (autocompleteRef.current) window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
    }
  }, [])

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      price: form.price ? parseFloat(form.price) : null,
      check_in_time: form.check_in_time || null,
      check_out_time: form.check_out_time || null,
      confirmation_number: form.confirmation_number || null,
      notes: form.notes || null,
      url: form.url || null,
      address: form.address || null,
    })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add stay' : 'Edit stay'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label style={{ flex: 2 }}>
              Property name
              <input name="name" value={form.name} onChange={onChange} required autoFocus placeholder="e.g. Park Hyatt Tokyo" />
            </label>
            <label>
              Type
              <select name="type" value={form.type} onChange={onChange}>
                {types.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <label>
            Address (search)
            <input ref={addressRef} name="address" value={form.address} onChange={onChange} placeholder="Search for property…" autoComplete="off" />
          </label>
          <div className="form-row">
            <label>
              Check-in date
              <input type="date" name="check_in_date" value={form.check_in_date} onChange={onChange} />
            </label>
            <label>
              Check-in time
              <input type="time" name="check_in_time" value={form.check_in_time} onChange={onChange} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Check-out date
              <input type="date" name="check_out_date" value={form.check_out_date} onChange={onChange} />
            </label>
            <label>
              Check-out time
              <input type="time" name="check_out_time" value={form.check_out_time} onChange={onChange} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Confirmation number
              <input name="confirmation_number" value={form.confirmation_number} onChange={onChange} placeholder="e.g. ABC123456" />
            </label>
            <label>
              Total price (AUD)
              <input type="number" name="price" value={form.price} onChange={onChange} min="0" step="0.01" placeholder="0.00" />
            </label>
          </div>
          <label>
            Booking URL (optional)
            <input type="url" name="url" value={form.url} onChange={onChange} placeholder="https://…" />
          </label>
          <label>
            Notes (optional)
            <textarea name="notes" value={form.notes} onChange={onChange} rows={2} placeholder="Any details…" />
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
