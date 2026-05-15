import { useState, useEffect, useRef } from 'react'

const EMPTY = { name: '', type: 'Hotel', address: '', city: '', check_in_date: '', check_in_time: '', check_out_date: '', check_out_time: '', confirmation_number: '', notes: '', url: '', price: '' }

async function initMapsScript(apiKey) {
  if (window.google?.maps?.importLibrary) return
  return new Promise((resolve, reject) => {
    if (document.getElementById('maps-script')) {
      const check = setInterval(() => {
        if (window.google?.maps?.importLibrary) { clearInterval(check); resolve() }
      }, 50)
      return
    }
    const script = document.createElement('script')
    script.id = 'maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`
    script.async = true
    script.onload = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })
}

export default function AccommodationModal({ mode, item, types, trip, prefill, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(mode === 'edit' ? {
    name: item.name,
    type: item.type || 'Hotel',
    address: item.address || '',
    city: item.city || '',
    check_in_date: item.check_in_date || '',
    check_in_time: item.check_in_time || '',
    check_out_date: item.check_out_date || '',
    check_out_time: item.check_out_time || '',
    confirmation_number: item.confirmation_number || '',
    notes: item.notes || '',
    url: item.url || '',
    price: item.price || '',
  } : { ...EMPTY, check_in_date: trip.start_date, check_out_date: trip.end_date, ...prefill })

  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Address autocomplete state
  const [addressInput, setAddressInput] = useState(mode === 'edit' ? (item.address || '') : (prefill?.address || ''))
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const sessionTokenRef = useRef(null)
  const debounceRef = useRef(null)
  const mapsReadyRef = useRef(false)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    initMapsScript(apiKey).then(() => { mapsReadyRef.current = true }).catch(() => {})
  }, [])

  function onAddressChange(e) {
    const val = e.target.value
    setAddressInput(val)
    clearTimeout(debounceRef.current)
    if (val.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  async function fetchSuggestions(input) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    try {
      if (!mapsReadyRef.current) await initMapsScript(apiKey)
      const { AutocompleteSuggestion, AutocompleteSessionToken } = await window.google.maps.importLibrary('places')
      if (!sessionTokenRef.current) sessionTokenRef.current = new AutocompleteSessionToken()
      const result = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
        includedPrimaryTypes: ['lodging'],
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

      const comps = place.addressComponents || []
      const find = (type) => comps.find((c) => c.types.includes(type))?.longText || ''
      const city = find('locality') || find('administrative_area_level_2') || find('administrative_area_level_1')
      const address = place.formattedAddress || ''

      setAddressInput(address)
      setSuggestions([])
      setShowSuggestions(false)
      sessionTokenRef.current = null

      setForm((prev) => ({
        ...prev,
        address,
        city: city || prev.city,
        name: prev.name || place.displayName || '',
        lat: place.location?.lat() ?? null,
        lng: place.location?.lng() ?? null,
      }))
    } catch (err) {
      console.error('Place fetch error:', err)
    }
  }

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      address: addressInput || null,
      price: form.price ? parseFloat(form.price) : null,
      check_in_time: form.check_in_time || null,
      check_out_time: form.check_out_time || null,
      confirmation_number: form.confirmation_number || null,
      notes: form.notes || null,
      url: form.url || null,
      city: form.city || null,
      lat: form.lat || null,
      lng: form.lng || null,
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

          <div className="form-row">
            <label style={{ flex: 2 }}>
              Address
              <div style={{ position: 'relative' }}>
                <input
                  value={addressInput}
                  onChange={onAddressChange}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search for property address…"
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="places-dropdown">
                    {suggestions.map((s, i) => (
                      <div
                        key={i}
                        className="places-suggestion"
                        onMouseDown={() => selectSuggestion(s)}
                      >
                        <span className="places-suggestion-main">{s.placePrediction.mainText?.text}</span>
                        <span className="places-suggestion-secondary">{s.placePrediction.secondaryText?.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </label>
            <label>
              City
              <input name="city" value={form.city} onChange={onChange} placeholder="e.g. Ho Chi Minh City" />
            </label>
          </div>

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
