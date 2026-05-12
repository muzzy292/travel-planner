import { Link } from 'react-router-dom'

export default function Dashboard({ trip }) {
  if (!trip) {
    return (
      <div className="page">
        <h2>No trips yet</h2>
        <p><Link to="/settings">Create your first trip</Link></p>
      </div>
    )
  }

  const today = new Date()
  const start = new Date(trip.start_date)
  const end = new Date(trip.end_date)
  const daysRemaining = Math.max(0, Math.ceil((end - today) / 86400000))

  return (
    <div className="page">
      <h2>{trip.name}</h2>
      <p className="destination">{trip.destination}</p>
      <div className="summary-cards">
        <div className="card">
          <span className="label">Dates</span>
          <span>{start.toLocaleDateString()} – {end.toLocaleDateString()}</span>
        </div>
        <div className="card">
          <span className="label">Days Remaining</span>
          <span>{daysRemaining}</span>
        </div>
        <div className="card">
          <span className="label">Budget</span>
          <span>${trip.budget?.toLocaleString()}</span>
        </div>
      </div>
      <nav className="quick-links">
        <Link to="/itinerary" className="btn">Itinerary</Link>
        <Link to="/wishlist" className="btn">Wishlist</Link>
        <Link to="/budget" className="btn">Budget</Link>
        <Link to="/settings" className="btn">Settings</Link>
      </nav>
    </div>
  )
}
