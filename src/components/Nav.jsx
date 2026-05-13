import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home', icon: '⊞' },
  { to: '/itinerary', label: 'Plan', icon: '📅' },
  { to: '/accommodation', label: 'Stays', icon: '🏨' },
  { to: '/wishlist', label: 'Wishlist', icon: '✨' },
  { to: '/budget', label: 'Budget', icon: '💰' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Nav({ trips, activeTrip, setActiveTrip, signOut }) {
  return (
    <>
      {/* Top bar */}
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
        {/* Desktop links */}
        <div className="nav-links nav-desktop">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/itinerary">Itinerary</NavLink>
          <NavLink to="/accommodation">Stays</NavLink>
          <NavLink to="/wishlist">Wishlist</NavLink>
          <NavLink to="/budget">Budget</NavLink>
          <NavLink to="/settings">Settings</NavLink>
          <button onClick={signOut} className="btn-signout">Sign out</button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="nav-bottom">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className="nav-tab" end={tab.to === '/'}>
            <span className="nav-tab-icon">{tab.icon}</span>
            <span className="nav-tab-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
