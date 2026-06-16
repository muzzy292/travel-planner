import { useState } from 'react'
import { loadMaps } from '../lib/maps'

// Themed shortcuts — each is just a natural-language request handed to Claude.
const QUICK_THEMES = [
  { label: 'Best of', query: '' },
  { label: 'Things to do', query: 'the best things to do and activities' },
  { label: 'Restaurants', query: 'genuinely good places to eat — a mix of local, casual and one special-occasion spot' },
  { label: 'Sights', query: 'the must-see landmarks and cultural sights' },
  { label: 'Kid-friendly', query: 'the best activities for kids aged 10 and 12' },
  { label: 'Hidden gems', query: 'hidden gems and spots locals love, away from the tourist crowds' },
]

const PRICE_LABEL = { Free: 'Free', $: '$', $$: '$$', $$$: '$$$', $$$$: '$$$$' }

export default function PlacesDiscover({ destination, startDate, endDate, existing = [], onAddToWishlist }) {
  const [query, setQuery] = useState('')
  const [activeTheme, setActiveTheme] = useState(null)
  const [status, setStatus] = useState(null) // 'thinking' | 'verifying' | null
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)
  const [hidden, setHidden] = useState(0)
  const [added, setAdded] = useState({}) // search_query -> true

  async function runDiscover(q) {
    if (!destination) return
    setStatus('thinking')
    setError(null)
    setResults([])
    setHidden(0)
    setAdded({})

    // 1. Claude curates a shortlist tailored to the family
    let suggestions
    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          query: q,
          startDate,
          endDate,
          existing: existing.slice(0, 60),
        }),
      })
      // Read as text first so a non-JSON platform error (e.g. a timeout page)
      // surfaces a readable message instead of crashing on JSON.parse.
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(res.ok ? 'Unexpected response from server' : `Server error (${res.status}). Please try again.`)
      }
      if (!res.ok) throw new Error(data.error || 'Discover failed')
      suggestions = Array.isArray(data.suggestions) ? data.suggestions : []
    } catch (e) {
      setStatus(null)
      setError(e.message || 'Could not get recommendations. Try again.')
      return
    }

    if (suggestions.length === 0) {
      setStatus(null)
      setError('No suggestions came back. Try rephrasing.')
      return
    }

    // 2. Google Places verifies each pick and enriches with rating + coords.
    //    Picks that can't be confirmed on Maps are dropped so only real places show.
    setStatus('verifying')
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      await loadMaps(apiKey)
      const { Place } = await window.google.maps.importLibrary('places')

      const verified = await Promise.all(
        suggestions.map(async (s) => {
          try {
            const { places } = await Place.searchByText({
              textQuery: s.search_query || `${s.name}, ${destination}`,
              fields: ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'id'],
              maxResultCount: 1,
            })
            if (!places?.length) return null
            const p = places[0]
            return {
              ...s,
              title: p.displayName || s.name,
              address: p.formattedAddress || null,
              lat: p.location?.lat() ?? null,
              lng: p.location?.lng() ?? null,
              google_rating: p.rating ?? null,
              google_rating_count: p.userRatingCount ?? null,
              place_id: p.id,
            }
          } catch {
            return null
          }
        })
      )

      const confirmed = verified.filter(Boolean)
      setHidden(suggestions.length - confirmed.length)
      setResults(confirmed)
    } catch {
      // Maps failed — fall back to showing Claude's picks unverified (no rating/coords)
      setResults(suggestions.map((s) => ({ ...s, title: s.name })))
    }
    setStatus(null)
  }

  function handleTheme(theme) {
    setActiveTheme(theme.label)
    setQuery('')
    runDiscover(theme.query)
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setActiveTheme(null)
    runDiscover(query.trim())
  }

  function handleAdd(place) {
    const noteParts = [place.why]
    if (place.area) noteParts.push(`📍 ${place.area}`)
    const tags = []
    if (place.price) tags.push(place.price === 'Free' ? 'Free' : place.price)
    if (place.book_ahead) tags.push('Book ahead')
    if (place.kid_friendly) tags.push('Kid-friendly')
    if (tags.length) noteParts.push(tags.join(' · '))

    onAddToWishlist({
      title: place.title,
      category: place.category || 'Activities',
      notes: noteParts.filter(Boolean).join('\n'),
      address: place.address || null,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
      google_rating: place.google_rating ?? null,
      google_rating_count: place.google_rating_count ?? null,
      url: place.place_id ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}` : null,
    })
    setAdded((prev) => ({ ...prev, [place.search_query || place.title]: true }))
  }

  const busy = status !== null

  return (
    <div className="discover-panel">
      <h3>Discover — {destination}</h3>
      <p className="muted small" style={{ marginTop: '-0.4rem', marginBottom: '0.75rem' }}>
        Curated for the family by Claude, then confirmed on Google Maps.
      </p>

      <div className="discover-quick">
        {QUICK_THEMES.map((t) => (
          <button
            key={t.label}
            className={`filter-btn ${activeTheme === t.label ? 'active' : ''}`}
            onClick={() => handleTheme(t)}
            disabled={busy}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form className="discover-search" onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask for anything e.g. rooftop bars with a view, rainy-day with kids…"
          disabled={busy}
        />
        <button className="btn" type="submit" disabled={busy || !query.trim()}>Search</button>
      </form>

      {status === 'thinking' && <p className="muted">✨ Curating recommendations…</p>}
      {status === 'verifying' && <p className="muted">📍 Confirming on Google Maps…</p>}
      {error && <p className="error" style={{ marginTop: '0.5rem' }}>{error}</p>}
      {!busy && hidden > 0 && (
        <p className="muted small">{hidden} suggestion{hidden > 1 ? 's' : ''} couldn’t be confirmed on Maps and {hidden > 1 ? 'were' : 'was'} hidden.</p>
      )}

      <div className="discover-results">
        {results.map((place) => {
          const key = place.search_query || place.title
          const isAdded = added[key]
          return (
            <div key={key} className="discover-card">
              <div className="discover-card-info">
                <div className="discover-name">{place.title}</div>
                <div className="discover-badges">
                  {place.category && <span className="discover-badge">{place.category}</span>}
                  {place.price && <span className="discover-badge">{PRICE_LABEL[place.price] || place.price}</span>}
                  {place.kid_friendly && <span className="discover-badge kid">Kid-friendly</span>}
                  {place.book_ahead && <span className="discover-badge book">Book ahead</span>}
                </div>
                {place.why && <div className="discover-why">{place.why}</div>}
                {place.google_rating && (
                  <div className="discover-rating">★ {place.google_rating} {place.google_rating_count ? `(${place.google_rating_count.toLocaleString()})` : ''}</div>
                )}
                {place.address && <div className="discover-address">{place.address}</div>}
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => handleAdd(place)}
                disabled={isAdded}
              >
                {isAdded ? '✓ Added' : '+ Wishlist'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
