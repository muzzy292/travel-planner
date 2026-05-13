import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AccommodationModal from '../components/AccommodationModal'

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
        <button className="btn" onClick={() => setModal({ mode: 'add' })}>+ Add stay</button>
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
    </div>
  )
}
