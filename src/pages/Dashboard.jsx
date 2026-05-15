import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import WeatherWidget from '../components/WeatherWidget'
import CurrencyWidget from '../components/CurrencyWidget'
import CityDaysWidget from '../components/CityDaysWidget'
import FlightWidget from '../components/FlightWidget'

function DestinationClock({ timezone }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    if (!timezone) return
    function tick() {
      setTime(new Date().toLocaleTimeString('en-AU', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timezone])
  if (!timezone || !time) return null
  const tzLabel = timezone.split('/').pop().replace(/_/g, ' ')
  return (
    <div className="db-clock">
      <span className="db-clock-label">🕐 {tzLabel}</span>
      <span className="db-clock-time">{time}</span>
    </div>
  )
}

function TripStatus({ trip }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(trip.start_date + 'T00:00:00')
  const end = new Date(trip.end_date + 'T00:00:00')
  const totalDays = Math.round((end - start) / 86400000) + 1

  if (today < start) {
    const daysTo = Math.round((start - today) / 86400000)
    const pct = 0
    return (
      <div className="db-hero">
        <div className="db-hero-label">Countdown</div>
        <div className="db-hero-number">{daysTo}</div>
        <div className="db-hero-sub">days to go</div>
        <div className="db-hero-dates">
          {start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} →{' '}
          {end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}{totalDays} days
        </div>
      </div>
    )
  }

  if (today <= end) {
    const dayNum = Math.round((today - start) / 86400000) + 1
    const pct = Math.min(100, (dayNum / totalDays) * 100)
    const daysLeft = Math.round((end - today) / 86400000)
    return (
      <div className="db-hero db-hero-active">
        <div className="db-hero-label">You're on your trip!</div>
        <div className="db-hero-number">Day {dayNum}<span className="db-hero-of"> / {totalDays}</span></div>
        <div className="db-hero-sub">{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</div>
        <div className="db-trip-bar">
          <div className="db-trip-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="db-hero-dates">
          {end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    )
  }

  return (
    <div className="db-hero db-hero-done">
      <div className="db-hero-label">Trip complete</div>
      <div className="db-hero-number">✓</div>
      <div className="db-hero-sub">{trip.destination}</div>
      <div className="db-hero-dates">
        {start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} –{' '}
        {end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  )
}

const TYPE_ICONS = { flight: '✈', accommodation: '🏨', activity: '🎯', transport: '🚌' }

export default function Dashboard({ trip }) {
  const [upcomingItems, setUpcomingItems] = useState(null)
  const [stays, setStays] = useState(null)
  const [flights, setFlights] = useState(null)
  const [budgetData, setBudgetData] = useState(null)

  useEffect(() => {
    if (!trip) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fromDate = today < new Date(trip.start_date + 'T00:00:00') ? trip.start_date : today.toISOString().slice(0, 10)

    Promise.all([
      // Next 6 non-flight itinerary items from today/trip start
      supabase
        .from('itinerary_items')
        .select('id, title, day_date, start_time, item_type, status')
        .eq('trip_id', trip.id)
        .neq('item_type', 'flight')
        .gte('day_date', fromDate)
        .order('day_date').order('order_index')
        .limit(6),

      // All future flights
      supabase
        .from('itinerary_items')
        .select('id, title, day_date, start_time, item_type, status, location, notes')
        .eq('trip_id', trip.id)
        .eq('item_type', 'flight')
        .gte('day_date', fromDate)
        .order('day_date').order('start_time'),

      // Accommodations for weather + city days widgets
      supabase
        .from('accommodations')
        .select('id, name, address, city, check_in_date, check_out_date, price')
        .eq('trip_id', trip.id)
        .order('check_in_date'),

      // Budget totals
      supabase.from('expenses').select('amount').eq('trip_id', trip.id),
      supabase.from('accommodations').select('price').eq('trip_id', trip.id).not('price', 'is', null),
      supabase.from('itinerary_items').select('cost').eq('trip_id', trip.id).not('cost', 'is', null),
    ]).then(([itin, flightsRes, staysRes, expenses, stayPrices, itinCosts]) => {
      setUpcomingItems(itin.data || [])
      setFlights(flightsRes.data || [])
      setStays(staysRes.data || [])

      const expTotal = (expenses.data || []).reduce((s, e) => s + parseFloat(e.amount), 0)
      const stayTotal = (stayPrices.data || []).reduce((s, e) => s + parseFloat(e.price), 0)
      const itinTotal = (itinCosts.data || []).reduce((s, e) => s + parseFloat(e.cost), 0)
      setBudgetData({ total: expTotal + stayTotal + itinTotal })
    })
  }, [trip?.id])

  if (!trip) {
    return (
      <div className="page">
        <h2>No trips yet</h2>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          <Link to="/settings">Create your first trip →</Link>
        </p>
      </div>
    )
  }

  const budget = parseFloat(trip.budget || 0)
  const spent = budgetData?.total ?? null
  const remaining = budget > 0 && spent !== null ? budget - spent : null
  const pct = budget > 0 && spent !== null ? Math.min(100, (spent / budget) * 100) : 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function formatDay(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    d.setHours(0, 0, 0, 0)
    const diff = Math.round((d - today) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  // Group upcoming items by date
  const grouped = []
  if (upcomingItems) {
    for (const item of upcomingItems) {
      const last = grouped[grouped.length - 1]
      if (last && last.date === item.day_date) {
        last.items.push(item)
      } else {
        grouped.push({ date: item.day_date, items: [item] })
      }
    }
  }

  return (
    <div className="page">
      <div className="db-header">
        <div>
          <h2>{trip.name}</h2>
          <p className="destination">{trip.destination}</p>
        </div>
        <DestinationClock timezone={trip.timezone} />
      </div>

      <TripStatus trip={trip} />

      {/* Upcoming itinerary */}
      <div className="db-section">
        <div className="db-section-header">
          <h3>Upcoming</h3>
          <Link to="/itinerary" className="db-section-link">View all →</Link>
        </div>
        {upcomingItems === null && <p className="muted small">Loading…</p>}
        {upcomingItems !== null && upcomingItems.length === 0 && (
          <p className="muted small">No upcoming events. <Link to="/itinerary">Add to itinerary →</Link></p>
        )}
        {grouped.map(({ date, items }) => (
          <div key={date} className="db-day-group">
            <div className="db-day-label">{formatDay(date)}</div>
            {items.map((item) => (
              <div key={item.id} className={`db-event ${item.status}`}>
                <span className="db-event-icon">{TYPE_ICONS[item.item_type] || '📌'}</span>
                <span className="db-event-title">{item.title}</span>
                {item.start_time && <span className="db-event-time">{item.start_time.slice(0, 5)}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <FlightWidget flights={flights} />
      <CityDaysWidget stays={stays} />

      {/* Budget snapshot */}
      {budget > 0 && spent !== null && (
        <div className="db-section">
          <div className="db-section-header">
            <h3>Budget</h3>
            <Link to="/budget" className="db-section-link">View all →</Link>
          </div>
          <div className="db-budget">
            <div className="db-budget-row">
              <div className="db-budget-stat">
                <span className="label">Spent</span>
                <span className="db-budget-amount">${spent.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="db-budget-stat">
                <span className="label">Remaining</span>
                <span className={`db-budget-amount ${remaining < 0 ? 'over' : ''}`}>
                  ${Math.abs(remaining).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                  {remaining < 0 && ' over'}
                </span>
              </div>
              <div className="db-budget-stat">
                <span className="label">Budget</span>
                <span className="db-budget-amount">${budget.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="db-budget-bar-wrap">
              <div className="progress-bar">
                <div className={`progress-fill ${pct >= 100 ? 'over-budget' : pct >= 80 ? 'warning' : ''}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="db-budget-pct">{pct.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="db-widgets-row">
        <WeatherWidget stays={stays} destination={trip.destination} />
        <CurrencyWidget destination={trip.destination} />
      </div>
    </div>
  )
}
