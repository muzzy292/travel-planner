import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AccommodationModal from '../components/AccommodationModal'
import ParseConfirmationModal from '../components/ParseConfirmationModal'

const TYPES = ['Hotel', 'Airbnb', 'Hostel', 'Resort', 'Apartment', 'Guesthouse', 'Other']

function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null
  const diff = new Date(checkOut) - new Date(checkIn)
  return Math.round(diff / 86400000)
}

export default function Accommodation({ trip }) {
  const [stays, setStays] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [showParse, setShowParse] = useState(false)

  useEffect(() => {
    if (trip) fetchStays()
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
            <span className="label">Total nights</span>
            <span>{totalNights}</span>
          </div>
          {totalCost > 0 && (
            <div className="card">
              <span className="label">Total cost</span>
              <span>${totalCost.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      )}

      {stays.length === 0 && (
        <p className="muted">No accommodation added yet.</p>
      )}

      <div className="stays-list">
        {stays.map((stay) => {
          const nights = nightsBetween(stay.check_in_date, stay.check_out_date)
          return (
            <div key={stay.id} className="stay-card" onClick={() => setModal({ mode: 'edit', item: stay })}>
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
          )
        })}
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
    </div>
  )
}
