import { useEffect, useRef } from 'react'
import { loadMaps } from '../lib/maps'

// Pin type → colour
const TYPE_COLOR = {
  hotel:       '#2563eb',
  flight:      '#7c3aed',
  activity:    '#16a34a',
  restaurant:  '#dc2626',
  transport:   '#d97706',
  other:       '#64748b',
}

const TYPE_EMOJI = {
  hotel: '🏨', flight: '✈️', activity: '🎯',
  restaurant: '🍽️', transport: '🚌', other: '📍',
}

function markerIcon(type) {
  const color = TYPE_COLOR[type] || TYPE_COLOR.other
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 1.5,
    scale: 1.6,
    anchor: { x: 12, y: 22 },
  }
}

function infoContent(pin) {
  return `
    <div style="font-size:13px;max-width:220px;line-height:1.5">
      <div style="font-weight:600;margin-bottom:2px">${TYPE_EMOJI[pin.type] || '📍'} ${pin.title}</div>
      ${pin.subtitle ? `<div style="color:#64748b;font-size:12px">${pin.subtitle}</div>` : ''}
      ${pin.travelTime ? `<div style="margin-top:5px;color:#2563eb;font-size:12px">🚶 ${pin.travelTime} from hotel</div>` : ''}
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
      const { Marker } = await window.google.maps.importLibrary('marker')

      // Create map once
      if (!mapRef.current && containerRef.current) {
        mapRef.current = new Map(containerRef.current, {
          center: { lat: valid[0].lat, lng: valid[0].lng },
          zoom: 13,
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
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null }

      // Add markers
      for (const pin of valid) {
        const marker = new Marker({
          position: { lat: pin.lat, lng: pin.lng },
          map,
          title: pin.title,
          icon: markerIcon(pin.type || 'other'),
        })
        marker.addListener('click', () => {
          infoWindowRef.current.setContent(infoContent(pin))
          infoWindowRef.current.open(map, marker)
        })
        markersRef.current.push(marker)
      }

      // Fit bounds
      if (valid.length > 1) {
        const bounds = new LatLngBounds()
        valid.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }))
        map.fitBounds(bounds, 60)
      }

      // Journey polyline
      if (drawPath && valid.length > 1) {
        polylineRef.current = new Polyline({
          path: valid.map(p => ({ lat: p.lat, lng: p.lng })),
          geodesic: true,
          strokeColor: '#2563eb',
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
