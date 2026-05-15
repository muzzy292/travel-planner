import { useState, useEffect, useRef } from 'react'
import { loadMaps } from '../lib/maps'

const EMPTY = { title: '', start_time: '', location: '', notes: '', status: 'tentative', item_type: 'activity', cost: '', lat: null, lng: null }

const ITEM_TYPES = [
  { value: 'activity',     label: '🎯 Activity' },
  { value: 'restaurant',   label: '🍽️ Restaurant' },
  { value: 'transport',    label: '🚌 Transport' },
  { value: 'accommodation',label: '🏨 Accommodation' },
  { value: 'flight',       label: '✈️ Flight' },
  { value: 'other',        label: '📌 Other' },
]

export default function EventModal({ mode, day, item, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(mode === 'edit' ? {
    title: item.title,
    start_time: item.start_time ? item.start_time.slice(0, 5) : '',
    location: item.location || '',
    notes: item.notes || '',
    status: item.status || 'tentative',
    item_type: item.item_type || 'activity',
    cost: item.cost != null ? String(item.cost) : '',
    lat: item.lat || null,
    lng: item.lng || null,
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const sessionTokenRef = useRef(null)
  const debounceRef = useRef(null)
  const mapsReadyRef = useRef(false)

  const label = new Date(day + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    loadMaps(apiKey).then(() => { mapsReadyRef.current = true }).catch(() => {})
  }, [])

  function onLocationChange(e) {
    const val = e.target.value
    setForm(prev => ({ ...prev, location: val, lat: null, lng: null }))
    clearTimeout(debounceRef.current)
    if (val.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  async function fetchSuggestions(input) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    try {
      if (!mapsReadyRef.current) await loadMaps(apiKey)
      const { AutocompleteSuggestion, AutocompleteSessionToken } = await window.google.maps.importLibrary('places')
      if (!sessionTokenRef.current) sessionTokenRef.current = new AutocompleteSessionToken()
      const result = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
      })
      setSuggestions((result.suggestions || []).slice(0, 5))
      setShowSuggestions(true)
    } catch (err) {
      console.error('Places error:', err)
    }
  }

  async function selectSuggestion(suggestion) {
    try {
      const place = suggestion.placePrediction.toPlace()
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'addressComponents', 'location'] })
      const address = place.formattedAddress || ''
      setForm(prev => ({
        ...prev,
        location: place.displayName ? `${place.displayName}, ${address}` : address,
        lat: place.location?.lat() ?? null,
        lng: place.location?.lng() ?? null,
      }))
      setSuggestions([])
      setShowSuggestions(false)
      sessionTokenRef.current = null
    } catch (err) {
      console.error('Place fetch error:', err)
    }
  }

  function onChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const error = await onSave({
      title: form.title,
      start_time: form.start_time || null,
      location: form.location || null,
      notes: form.notes || null,
      item_type: form.item_type || null,
      status: form.status,
      cost: form.cost !== '' ? parseFloat(form.cost) : null,
      lat: form.lat || null,
      lng: form.lng || null,
    })
    if (error) setSaveError(error)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add event' : 'Edit event'}</h3>
          <span className="modal-date">{label}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label style={{ flex: 2 }}>
              Title
              <input name="title" value={form.title} onChange={onChange} required autoFocus placeholder="e.g. Shinjuku walking tour" />
            </label>
            <label>
              Type
              <select name="item_type" value={form.item_type} onChange={onChange}>
                {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Time (optional)
              <input type="time" name="start_time" value={form.start_time} onChange={onChange} />
            </label>
            <label>
              Status
              <select name="status" value={form.status} onChange={onChange}>
                <option value="tentative">Tentative</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </label>
          </div>
          <label>
            Location (optional)
            <div style={{ position: 'relative' }}>
              <input
                value={form.location}
                onChange={onLocationChange}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search for a place…"
                autoComplete="off"
              />
              {form.lat && <span className="location-pin-indicator">📍</span>}
              {showSuggestions && suggestions.length > 0 && (
                <div className="places-dropdown">
                  {suggestions.map((s, i) => (
                    <div key={i} className="places-suggestion" onMouseDown={() => selectSuggestion(s)}>
                      <span className="places-suggestion-main">{s.placePrediction.mainText?.text}</span>
                      <span className="places-suggestion-secondary">{s.placePrediction.secondaryText?.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </label>
          <label>
            Notes (optional)
            <textarea name="notes" value={form.notes} onChange={onChange} rows={3} placeholder="Any details…" />
          </label>
          <label>
            Cost AUD (optional)
            <input type="number" name="cost" value={form.cost} onChange={onChange} placeholder="e.g. 350" min="0" step="0.01" />
          </label>
          {saveError && <p className="error" style={{ marginTop: '0.5rem' }}>{saveError}</p>}
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
