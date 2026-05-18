import { useEffect, useRef } from 'react'
import { loadMaps } from '../lib/maps'

const TYPE_COLOR = {
  hotel:       '#1f6f4d',
  flight:      '#7c3aed',
  activity:    '#16a34a',
  restaurant:  '#dc2626',
  transport:   '#d97706',
  other:       '#6c6757',
}

const TYPE_EMOJI = {
  hotel: '🏨', flight: '✈️', activity: '🎯',
  restaurant: '🍽️', transport: '🚌', other: '📍',
}

// Build a DOM element used as the AdvancedMarkerElement content
function makePinElement(type) {
  const color = TYPE_COLOR[type] || TYPE_COLOR.other
  const emoji = TYPE_EMOJI[type] || '📍'
  const el = document.createElement('div')
  el.style.cssText = [
    `background:${color}`,
    'color:#fff',
    'border-radius:50% 50% 50% 0',
    'transform:rotate(-45deg)',
    'width:36px',
    'height:36px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'box-shadow:0 2px 8px rgba(0,0,0,.28)',
    'border:2px solid rgba(255,255,255,.9)',
    'cursor:pointer',
  ].join(';')
  const inner = document.createElement('div')
  inner.style.cssText = 'transform:rotate(45deg);font-size:15px;line-height:1'
  inner.textContent = emoji
  el.appendChild(inner)
  return el
}

function infoContent(pin) {
  return `
    <div style="font-size:13px;max-width:220px;line-height:1.5;font-family:'Geist',sans-serif">
      <div style="font-weight:600;margin-bottom:2px">${TYPE_EMOJI[pin.type] || '📍'} ${pin.title}</div>
      ${pin.subtitle ? `<div style="color:#6c6757;font-size:12px">${pin.subtitle}</div>` : ''}
      ${pin.travelTime ? `<div style="margin-top:5px;color:#1f6f4d;font-size:12px">🚶 ${pin.travelTime} from hotel</div>` : ''}
    </div>`
}

// pins: [{ lat, lng, title, subtitle, type, travelTime }]
export default function MapView({ pins = [], height = '300px', drawPath = false }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const polylineRef = useRef(null)
  const infoWindowRef = useRef(null)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    const valid = pins.filter(p => p.lat && p.lng)
    if (!valid.length) return

    async function init() {
      await loadMaps(apiKey)
      const { Map, InfoWindow, Polyline, LatLngBounds } = await window.google.maps.importLibrary('maps')
      const { AdvancedMarkerElement } = await window.google.maps.importLibrary('marker')

      // Create map once — mapId is required for AdvancedMarkerElement
      if (!mapRef.current && containerRef.current) {
        mapRef.current = new Map(containerRef.current, {
          center: { lat: valid[0].lat, lng: valid[0].lng },
          zoom: 13,
          mapId: 'DEMO_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
        })
        infoWindowRef.current = new InfoWindow()
      }
      const map = mapRef.current
      if (!map) return

      // Clear old markers + polyline
      markersRef.current.forEach(m => { m.map = null })
      markersRef.current = []
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null }

      // Place AdvancedMarkerElements
      for (const pin of valid) {
        const marker = new AdvancedMarkerElement({
          position: { lat: pin.lat, lng: pin.lng },
          map,
          title: pin.title,
          content: makePinElement(pin.type || 'other'),
        })
        marker.addListener('click', () => {
          infoWindowRef.current.setContent(infoContent(pin))
          infoWindowRef.current.open({ anchor: marker, map })
        })
        markersRef.current.push(marker)
      }

      // Fit all pins in view
      if (valid.length > 1) {
        const bounds = new LatLngBounds()
        valid.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }))
        map.fitBounds(bounds, 60)
      }

      // Journey polyline (Bookings overview map)
      if (drawPath && valid.length > 1) {
        polylineRef.current = new Polyline({
          path: valid.map(p => ({ lat: p.lat, lng: p.lng })),
          geodesic: true,
          strokeColor: '#1f6f4d',
          strokeOpacity: 0.55,
          strokeWeight: 2.5,
          map,
        })
      }
    }

    init().catch(console.error)
  }, [pins])

  const validCount = pins.filter(p => p.lat && p.lng).length
  if (!validCount) return (
    <div className="map-no-coords">
      <span>📍 No map data yet — add locations via the Places search when editing items</span>
    </div>
  )

  return <div ref={containerRef} className="map-container" style={{ height }} />
}
