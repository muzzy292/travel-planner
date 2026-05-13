import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useTrip } from './hooks/useTrip'
import { useCalendar } from './hooks/useCalendar'
import Nav from './components/Nav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Itinerary from './pages/Itinerary'
import Wishlist from './pages/Wishlist'
import Budget from './pages/Budget'
import Settings from './pages/Settings'
import './styles/global.css'

export default function App() {
  const { session, loading, denied, signIn, signOut } = useAuth()
  const { trips, activeTrip, setActiveTrip, createTrip, updateTrip } = useTrip()
  const { connected: calendarConnected, connect: connectCalendar } = useCalendar()

  if (loading) return <div className="loading">Loading…</div>
  if (!session) return <Login signIn={signIn} denied={denied} />

  return (
    <BrowserRouter>
      <Nav
        trips={trips}
        activeTrip={activeTrip}
        setActiveTrip={setActiveTrip}
        signOut={signOut}
      />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard trip={activeTrip} />} />
          <Route path="/itinerary" element={<Itinerary trip={activeTrip} />} />
          <Route path="/wishlist" element={<Wishlist trip={activeTrip} session={session} />} />
          <Route path="/budget" element={<Budget trip={activeTrip} />} />
          <Route path="/settings" element={<Settings trip={activeTrip} createTrip={createTrip} updateTrip={updateTrip} calendarConnected={calendarConnected} connectCalendar={connectCalendar} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
