import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard({ trip }) {
  const [spent, setSpent] = useState(null)
  const [itineraryCount, setItineraryCount] = useState(null)
  const [wishlistCount, setWishlistCount] = useState(null)

  useEffect(() => {
    if (!trip) return
    Promise.all([
      supabase.from('expenses').select('amount').eq('trip_id', trip.id),
      supabase.from('itinerary_items').select('id', { count: 'exact' }).eq('trip_id', trip.id),
      supabase.from('wishlist_items').select('id', { count: 'exact' }).eq('trip_id', trip.id),
    ]).then(([expenses, itinerary, wishlist]) => {
      const total = (expenses.data || []).reduce((s, e) => s + parseFloat(e.amount), 0)
      setSpent(total)
      setItineraryCount(itinerary.count ?? 0)
      setWishlistCount(wishlist.count ?? 0)
    })
  }, [trip?.id])

  if (!trip) {
    return (
      <div className="page">
        <h2>No trips yet</h2>
        <p><Link to="/settings">Create your first trip</Link></p>
      </div>
    )
  }

  const today = new Date()
  const start = new Date(trip.start_date + 'T00:00:00')
  const end = new Date(trip.end_date + 'T00:00:00')
  const totalDays = Math.ceil((end - start) / 86400000) + 1
  const daysRemaining = Math.max(0, Math.ceil((end - today) / 86400000))
  const budget = parseFloat(trip.budget || 0)
  const pct = budget > 0 && spent !== null ? Math.min(100, (spent / budget) * 100) : 0

  return (
    <div className="page">
      <h2>{trip.name}</h2>
      <p className="destination">{trip.destination}</p>

      <div className="summary-cards">
        <div className="card">
          <span className="label">Dates</span>
          <span>{start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} – {end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <div className="card">
          <span className="label">Duration</span>
          <span>{totalDays} days</span>
        </div>
        <div className="card">
          <span className="label">Days Remaining</span>
          <span>{daysRemaining}</span>
        </div>
        <div className="card">
          <span className="label">Itinerary events</span>
          <span>{itineraryCount ?? '…'}</span>
        </div>
        <div className="card">
          <span className="label">Wishlist ideas</span>
          <span>{wishlistCount ?? '…'}</span>
        </div>
      </div>

      {budget > 0 && spent !== null && (
        <div className="dashboard-budget">
          <div className="dashboard-budget-row">
            <span className="label">Budget</span>
            <span className="db-numbers">
              <span className="db-spent">${spent.toLocaleString('en-AU', { minimumFractionDigits: 2 })} spent</span>
              <span className="db-sep"> / </span>
              <span>${budget.toLocaleString('en-AU', { minimumFractionDigits: 2 })} total</span>
            </span>
          </div>
          <div className="progress-bar">
            <div className={`progress-fill ${pct >= 100 ? 'over-budget' : pct >= 80 ? 'warning' : ''}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <nav className="quick-links">
        <Link to="/itinerary" className="btn">Itinerary</Link>
        <Link to="/wishlist" className="btn">Wishlist</Link>
        <Link to="/budget" className="btn">Budget</Link>
        <Link to="/settings" className="btn">Settings</Link>
      </nav>
    </div>
  )
}
