import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AccommodationModal from '../components/AccommodationModal'
import ParseConfirmationModal from '../components/ParseConfirmationModal'
import FlightBookingModal from '../components/FlightBookingModal'

const TYPES = ['Hotel', 'Airbnb', 'Hostel', 'Resort', 'Apartment', 'Guesthouse', 'Other']

function GapBanner({ gap, onAdd }) {
  return (
    <div className="accommodation-gap">
      <div className="gap-icon">⚠️</div>
      <div className="gap-body">
        <span className="gap-title">No accommodation — {gap.nights} night{gap.nights > 1 ? 's' : ''}</span>
        <span className="gap-dates">{gap.from} → {gap.to}</span>
      </div>
      <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={onAdd}>+ Book</button>
    </div>
  )
}

function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null
  const diff = new Date(checkOut) - new Date(checkIn)
  return Math.round(diff / 86400000)
}

export default function Accommodation({ trip }) {
  const [stays, setStays] = useState([])
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [flightModal, setFlightModal] = useState(null)
  const [showParse, setShowParse] = useState(false)

  useEffect(() => {
    if (trip) { fetchStays(); fetchFlights() }
  }, [trip?.id])

  async function fetchStays() {
    setLoading(true)
    const { data } = await supabase
      .from('accommodations')
      .select('*')
      .eq('trip_id', trip.id)
      .order('check_in_date', { ascending: true })
    setStays(data || [])
    setLoading(false)
  }

  async function fetchFlights() {
    const { data } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', trip.id)
      .eq('item_type', 'flight')
      .order('day_date')
      .order('start_time')
    setFlights(data || [])
  }

  async function saveFlight(payload) {
    if (flightModal.mode === 'add') {
      const { data, error } = await supabase
        .from('itinerary_items')
        .insert({ ...payload, trip_id: trip.id, order_index: 0 })
        .select().single()
      if (!error && data) setFlights((prev) => [...prev, data].sort((a, b) => a.day_date.localeCompare(b.day_date)))
    } else {
      const { data, error } = await supabase
        .from('itinerary_items')
        .update(payload)
        .eq('id', flightModal.item.id)
        .select().single()
      if (!error && data) setFlights((prev) => prev.map((f) => f.id === flightModal.item.id ? data : f))
    }
    setFlightModal(null)
  }

  async function deleteFlight(id) {
    await supabase.from('itinerary_items').delete().eq('id', id)
    setFlights((prev) => prev.filter((f) => f.id !== id))
    setFlightModal(null)
  }

  async function saveStay(payload) {
    if (modal.mode === 'add') {
      const { data, error } = await supabase
        .from('accommodations')
        .insert({ ...payload, trip_id: trip.id })
        .select()
        .single()
      if (!error) setStays((prev) => [...prev, data].sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date)))
    } else {
      const { data, error } = await supabase
        .from('accommodations')
        .update(payload)
        .eq('id', modal.item.id)
        .select()
        .single()
      if (!error) setStays((prev) => prev.map((s) => (s.id === modal.item.id ? data : s)))
    }
    setModal(null)
  }

  async function handleImport(parsedItems) {
    const stayItems = parsedItems.filter((i) => i.item_type === 'accommodation')
    const otherItems = parsedItems.filter((i) => i.item_type !== 'accommodation')

    // Insert stays
    for (const item of stayItems) {
      const { data } = await supabase
        .from('accommodations')
        .insert({
          trip_id: trip.id,
          name: item.title,
          type: 'Hotel',
          address: item.address || item.location || null,
          city: item.city || null,
          check_in_date: item.day_date,
          check_in_time: item.start_time || null,
          check_out_date: item.check_out_date || null,
          check_out_time: item.check_out_time || null,
          confirmation_number: item.confirmation_number || null,
          notes: item.notes || null,
        })
        .select()
        .single()
      if (data) setStays((prev) => [...prev, data].sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date)))
    }

    // Push all items to itinerary
    const itinInserts = parsedItems.map((item, idx) => ({
      trip_id: trip.id,
      day_date: item.day_date,
      title: item.item_type === 'accommodation' ? `Check-in: ${item.title}` : item.title,
      notes: item.notes || null,
      location: item.address || item.location || null,
      start_time: item.start_time || null,
      item_type: item.item_type || 'other',
      status: 'tentative',
      order_index: idx,
    }))
    if (itinInserts.length > 0) {
      await supabase.from('itinerary_items').insert(itinInserts)
    }

    // Also push check-out day to itinerary for accommodation
    const checkoutInserts = stayItems
      .filter((i) => i.check_out_date)
      .map((item, idx) => ({
        trip_id: trip.id,
        day_date: item.check_out_date,
        title: `Check-out: ${item.title}`,
        notes: null,
        location: item.address || item.location || null,
        start_time: item.check_out_time || null,
        item_type: 'accommodation',
        status: 'tentative',
        order_index: itinInserts.length + idx,
      }))
    if (checkoutInserts.length > 0) {
      await supabase.from('itinerary_items').insert(checkoutInserts)
    }
  }

  async function deleteStay(id) {
    await supabase.from('accommodations').delete().eq('id', id)
    setStays((prev) => prev.filter((s) => s.id !== id))
    setModal(null)
  }

  if (!trip) return <div className="page"><p>No active trip.</p></div>
  if (loading) return <div className="page"><p>Loading…</p></div>

  const totalNights = stays.reduce((sum, s) => sum + (nightsBetween(s.check_in_date, s.check_out_date) || 0), 0)
  const totalCost = stays.reduce((sum, s) => sum + (parseFloat(s.price || 0)), 0)

  // Compute accommodation gaps within the trip
  function getGaps() {
    const gaps = []
    const sorted = [...stays].filter((s) => s.check_in_date && s.check_out_date)
    const tripStart = trip.start_date
    const tripEnd = trip.end_date

    const checkpoints = [
      { type: 'trip_start', date: tripStart },
      ...sorted.flatMap((s) => [
        { type: 'check_in', date: s.check_in_date },
        { type: 'check_out', date: s.check_out_date },
      ]),
      { type: 'trip_end', date: tripEnd },
    ]

    // Before first stay
    if (sorted.length === 0) {
      const nights = nightsBetween(tripStart, tripEnd)
      if (nights > 0) gaps.push({ from: tripStart, to: tripEnd, nights, insertAfter: null })
    } else {
      // Gap before first stay
      const first = sorted[0]
      const beforeNights = nightsBetween(tripStart, first.check_in_date)
      if (beforeNights > 0) gaps.push({ from: tripStart, to: first.check_in_date, nights: beforeNights, insertAfter: null })

      // Gaps between stays
      for (let i = 0; i < sorted.length - 1; i++) {
        const gapNights = nightsBetween(sorted[i].check_out_date, sorted[i + 1].check_in_date)
        if (gapNights > 0) gaps.push({ from: sorted[i].check_out_date, to: sorted[i + 1].check_in_date, nights: gapNights, insertAfter: sorted[i].id })
      }

      // Gap after last stay
      const last = sorted[sorted.length - 1]
      const afterNights = nightsBetween(last.check_out_date, tripEnd)
      if (afterNights > 0) gaps.push({ from: last.check_out_date, to: tripEnd, nights: afterNights, insertAfter: last.id })
    }
    return gaps
  }

  const gaps = getGaps()
  const unbookedNights = gaps.reduce((sum, g) => sum + g.nights, 0)

  return (
    <div className="page">
      <div className="page-header">
        <h2>Accommodation — {trip.name}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowParse(true)}>📋 Import confirmation</button>
          <button className="btn" onClick={() => setModal({ mode: 'add' })}>+ Add stay</button>
        </div>
      </div>

      {stays.length > 0 && (
        <div className="summary-cards" style={{ marginBottom: '1.5rem' }}>
          <div className="card">
            <span className="label">Stays</span>
            <span>{stays.length}</span>
          </div>
          <div className="card">
            <span className="label">Booked nights</span>
            <span>{totalNights}</span>
          </div>
          {unbookedNights > 0 && (
            <div className="card card-warning">
              <span className="label">Unbooked nights</span>
              <span>{unbookedNights}</span>
            </div>
          )}
          {totalCost > 0 && (
            <div className="card">
              <span className="label">Total cost</span>
              <span>${totalCost.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      )}

      {stays.length === 0 && gaps.length === 0 && (
        <p className="muted">No accommodation added yet.</p>
      )}

      <div className="stays-list">
        {/* Gap before first stay */}
        {gaps.filter((g) => g.insertAfter === null).map((gap, i) => (
          <GapBanner key={`gap-before-${i}`} gap={gap} onAdd={() => setModal({ mode: 'add' })} />
        ))}

        {stays.map((stay) => {
          const nights = nightsBetween(stay.check_in_date, stay.check_out_date)
          const gapAfter = gaps.find((g) => g.insertAfter === stay.id)
          return (
            <div key={stay.id}>
            <div className="stay-card" onClick={() => setModal({ mode: 'edit', item: stay })}>
              <div className="stay-header">
                <div>
                  <span className="stay-type-badge">{stay.type}</span>
                  <span className="stay-name">{stay.name}</span>
                </div>
                {stay.price && <span className="stay-price">${parseFloat(stay.price).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>}
              </div>
              {stay.address && <div className="stay-address">📍 {stay.address}</div>}
              <div className="stay-dates">
                <div className="stay-date-block">
                  <span className="label">Check-in</span>
                  <span>{stay.check_in_date}{stay.check_in_time ? ` at ${stay.check_in_time.slice(0, 5)}` : ''}</span>
                </div>
                <div className="stay-nights">{nights ? `${nights} night${nights > 1 ? 's' : ''}` : ''}</div>
                <div className="stay-date-block">
                  <span className="label">Check-out</span>
                  <span>{stay.check_out_date}{stay.check_out_time ? ` at ${stay.check_out_time.slice(0, 5)}` : ''}</span>
                </div>
              </div>
              {stay.confirmation_number && (
                <div className="stay-confirmation">Confirmation: <strong>{stay.confirmation_number}</strong></div>
              )}
              {stay.notes && <div className="stay-notes">{stay.notes}</div>}
              {stay.url && <a className="stay-url" href={stay.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>View booking</a>}
            </div>
            {gapAfter && <GapBanner gap={gapAfter} onAdd={() => setModal({ mode: 'add' })} />}
            </div>
          )
        })}
      </div>

      {/* Flights section */}
      <div className="flights-section">
        <div className="flights-section-header">
          <h3>✈️ Flights</h3>
          <button className="btn" onClick={() => setFlightModal({ mode: 'add' })}>+ Add flight</button>
        </div>
        {flights.length === 0 && <p className="muted small">No flights added yet.</p>}
        <div className="flight-cards">
          {flights.map((flight) => {
            const [from = '', to = ''] = (flight.location || '').split(' → ')
            const confLine = (flight.notes || '').split('\n').find(l => l.startsWith('Conf:'))
            const arrLine = (flight.notes || '').split('\n').find(l => l.startsWith('Arrives:'))
            return (
              <div key={flight.id} className={`flight-booking-card flight-booking-${flight.status}`} onClick={() => setFlightModal({ mode: 'edit', item: flight })}>
                <div className="fbc-top">
                  <div className="fbc-title">
                    <span className="fbc-icon">✈️</span>
                    <span className="fbc-name">{flight.title}</span>
                  </div>
                  <span className={`fbc-status fbc-status-${flight.status}`}>{flight.status}</span>
                </div>
                {flight.location && (
                  <div className="fbc-route">{from} <span className="fbc-arrow">→</span> {to}</div>
                )}
                <div className="fbc-meta">
                  <span>{new Date(flight.day_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  {flight.start_time && <span>Departs {flight.start_time.slice(0, 5)}</span>}
                  {arrLine && <span>{arrLine.replace('Arrives:', 'Arrives').trim()}</span>}
                </div>
                <div className="fbc-bottom">
                  {confLine && <span className="fbc-conf">{confLine.replace('Conf:', 'Conf:').trim()}</span>}
                  {flight.cost && <span className="fbc-cost">${parseFloat(flight.cost).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modal && (
        <AccommodationModal
          mode={modal.mode}
          item={modal.item}
          types={TYPES}
          trip={trip}
          onSave={saveStay}
          onDelete={deleteStay}
          onClose={() => setModal(null)}
        />
      )}
      {showParse && (
        <ParseConfirmationModal
          trip={trip}
          onImport={handleImport}
          onClose={() => setShowParse(false)}
        />
      )}
      {flightModal && (
        <FlightBookingModal
          mode={flightModal.mode}
          item={flightModal.item}
          trip={trip}
          onSave={saveFlight}
          onDelete={deleteFlight}
          onClose={() => setFlightModal(null)}
        />
      )}
    </div>
  )
}
