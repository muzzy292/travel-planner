import { useEffect, useRef, useState } from 'react'

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

const SEARCH_TYPES = [
  { label: 'Things to do', query: 'things to do attractions' },
  { label: 'Restaurants', query: 'restaurants' },
  { label: 'Cafes', query: 'cafes coffee' },
  { label: 'Shopping', query: 'shopping markets' },
  { label: 'Sights', query: 'landmarks sights' },
]

export default function PlacesDiscover({ destination, onAddToWishlist }) {
  const mapRef = useRef(null)
  const serviceRef = useRef(null)
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [activeType, setActiveType] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    loadMapsScript(apiKey).then(() => {
      const map = new window.google.maps.Map(mapRef.current, { center: { lat: 0, lng: 0 }, zoom: 1 })
      serviceRef.current = new window.google.maps.places.PlacesService(map)
    })
  }, [])

  function search(typeQuery) {
    if (!serviceRef.current || !destination) return
    setSearching(true)
    setError(null)
    setResults([])
    const searchQuery = `${typeQuery} in ${destination}`
    serviceRef.current.textSearch({ query: searchQuery }, (results, status) => {
      setSearching(false)
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setResults(results.slice(0, 12))
      } else {
        setError('No results found. Try a different search.')
      }
    })
  }

  function handleTypeClick(type) {
    setActiveType(type.label)
    search(type.query)
  }

  function handleCustomSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setActiveType(null)
    search(query)
  }

  return (
    <div className="discover-panel">
      <div ref={mapRef} style={{ display: 'none' }} />
      <h3>Discover — {destination}</h3>

      <div className="discover-quick">
        {SEARCH_TYPES.map((t) => (
          <button
            key={t.label}
            className={`filter-btn ${activeType === t.label ? 'active' : ''}`}
            onClick={() => handleTypeClick(t)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form className="discover-search" onSubmit={handleCustomSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anything e.g. rooftop bars, day trips…"
        />
        <button className="btn" type="submit">Search</button>
      </form>

      {searching && <p className="muted">Searching…</p>}
      {error && <p className="muted">{error}</p>}

      <div className="discover-results">
        {results.map((place) => (
          <div key={place.place_id} className="discover-card">
            <div className="discover-card-info">
              <div className="discover-name">{place.name}</div>
              {place.rating && (
                <div className="discover-rating">★ {place.rating} ({place.user_ratings_total?.toLocaleString()})</div>
              )}
              {place.formatted_address && (
                <div className="discover-address">{place.formatted_address}</div>
              )}
              {place.types && (
                <div className="discover-types">{place.types.slice(0, 2).map(t => t.replace(/_/g, ' ')).join(' · ')}</div>
              )}
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => onAddToWishlist({
                title: place.name,
                notes: place.formatted_address || '',
                url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
                category: 'Activities',
              })}
            >
              + Wishlist
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
