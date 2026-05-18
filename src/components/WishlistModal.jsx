import { useState, useEffect, useRef } from 'react'
import { loadMaps } from '../lib/maps'

const EMPTY = { title: '', category: 'Activities', notes: '', url: '', address: '', lat: null, lng: null, google_rating: null, google_rating_count: null }

export default function WishlistModal({ mode, item, categories, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(mode === 'edit' ? {
    title: item.title,
    category: item.category || 'Activities',
    notes: item.notes || '',
    url: item.url || '',
    address: item.address || '',
    lat: item.lat || null,
    lng: item.lng || null,
    google_rating: item.google_rating || null,
    google_rating_count: item.google_rating_count || null,
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const sessionTokenRef = useRef(null)
  const debounceRef = useRef(null)
  const mapsReadyRef = useRef(false)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    loadMaps(apiKey).then(() => { mapsReadyRef.current = true }).catch(() => {})
  }, [])

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function onAddressChange(e) {
    const val = e.target.value
    setForm(prev => ({ ...prev, address: val, lat: null, lng: null }))
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
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount'] })
      const address = place.formattedAddress || ''
      setForm(prev => ({
        ...prev,
        address: place.displayName ? `${place.displayName}, ${address}` : address,
        lat: place.location?.lat() ?? null,
        lng: place.location?.lng() ?? null,
        google_rating: place.rating ?? null,
        google_rating_count: place.userRatingCount ?? null,
      }))
      setSuggestions([])
      setShowSuggestions(false)
      sessionTokenRef.current = null
    } catch (err) {
      console.error('Place fetch error:', err)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      title: form.title,
      category: form.category,
      notes: form.notes || null,
      url: form.url || null,
      address: form.address || null,
      lat: form.lat || null,
      lng: form.lng || null,
      google_rating: form.google_rating || null,
      google_rating_count: form.google_rating_count || null,
    })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add idea' : 'Edit idea'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <label>
            Title
            <input name="title" value={form.title} onChange={onChange} required autoFocus placeholder="e.g. Ramen at Ichiran" />
          </label>
          <label>
            Category
            <select name="category" value={form.category} onChange={onChange}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Address (optional)
            <div style={{ position: 'relative' }}>
              <input
                value={form.address}
                onChange={onAddressChange}
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
            Link (optional)
            <input name="url" value={form.url} onChange={onChange} placeholder="https://…" type="url" />
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
