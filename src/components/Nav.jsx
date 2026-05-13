import { NavLink } from 'react-router-dom'

export default function Nav({ trips, activeTrip, setActiveTrip, signOut }) {
  return (
    <nav className="app-nav">
      <div className="nav-left">
        <span className="nav-brand">Travel Planner</span>
        {trips.length > 1 && (
          <select
            value={activeTrip?.id || ''}
            onChange={(e) => setActiveTrip(trips.find((t) => t.id === e.target.value))}
            className="trip-select"
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        {trips.length === 1 && activeTrip && (
          <span className="trip-name">{activeTrip.name}</span>
        )}
      </div>
      <div className="nav-links">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/itinerary">Itinerary</NavLink>
        <NavLink to="/accommodation">Stays</NavLink>
        <NavLink to="/wishlist">Wishlist</NavLink>
        <NavLink to="/budget">Budget</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        <button onClick={signOut} className="btn-signout">Sign out</button>
      </div>
    </nav>
  )
}
