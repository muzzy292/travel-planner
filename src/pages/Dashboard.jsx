import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/briefing.css'

// ── Pure helpers ─────────────────────────────────────────────

function fmtMoney(n) {
  if (!n || isNaN(n)) return '$0'
  if (n >= 10000) return `$${(n / 1000).toFixed(0)}k`
  if (n >= 1000)  return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

function formatDateShort(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function getDaysToGo(trip) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((new Date(trip.start_date + 'T00:00:00') - today) / 86400000)
}

function getTotalDays(trip) {
  return Math.round((new Date(trip.end_date + 'T00:00:00') - new Date(trip.start_date + 'T00:00:00')) / 86400000) + 1
}

function computePhase(trip) {
  if (!trip) return 'preTrip'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(trip.start_date + 'T00:00:00')
  const end   = new Date(trip.end_date   + 'T00:00:00')
  const daysToGo = Math.round((start - today) / 86400000)
  if (daysToGo > 10) return 'preTrip'
  if (daysToGo > 0)  return 'weekOf'
  if (today <= end)  return 'inTrip'
  return 'preTrip'
}

// ── Data builders ────────────────────────────────────────────

function buildNarrative(phaseKey, trip, stays, flights, budgetData, flightCount) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysToGo  = getDaysToGo(trip)
  const totalDays = getTotalDays(trip)
  const budget = parseFloat(trip.budget || 0)
  const spent  = budgetData?.total ?? 0
  const dest   = trip.name || trip.destination || 'your destination'

  if (phaseKey === 'preTrip') {
    const segs = [
      { t: "You're " },
      { t: `${daysToGo} day${daysToGo !== 1 ? 's' : ''} from ${dest}`, mark: 'neutral', source: 'trip' },
      { t: '. ' },
    ]
    const hasStays   = (stays?.length   || 0) > 0
    const hasFlights = (flightCount     || 0) > 0
    if (hasStays && hasFlights) {
      segs.push({ t: `${stays.length} hotel${stays.length !== 1 ? 's' : ''} and ${flightCount} flight${flightCount !== 1 ? 's' : ''}`, mark: 'good', source: 'trip' })
      segs.push({ t: ' are confirmed and ready to go. ' })
    } else if (hasStays) {
      segs.push({ t: `${stays.length} hotel${stays.length !== 1 ? 's' : ''}`, mark: 'good', source: 'trip' })
      segs.push({ t: ' confirmed — add flights in Bookings to complete the picture. ' })
    } else if (hasFlights) {
      segs.push({ t: `${flightCount} flight${flightCount !== 1 ? 's' : ''}`, mark: 'good', source: 'trip' })
      segs.push({ t: ' booked — add accommodation in Bookings. ' })
    } else {
      segs.push({ t: 'No bookings yet — head to Bookings to add flights and hotels.' })
    }
    if (budget > 0) {
      const pct = Math.round((spent / budget) * 100)
      segs.push({ t: `${pct}% of the ${fmtMoney(budget)} budget`, mark: pct > 85 ? 'warm' : 'neutral', source: 'trip' })
      segs.push({ t: ` committed — ${fmtMoney(budget - spent)} still available to flex.` })
    }
    return segs
  }

  if (phaseKey === 'weekOf') {
    const todayStr = today.toISOString().slice(0, 10)
    const segs = [{ t: `${daysToGo} day${daysToGo !== 1 ? 's' : ''} to go. ` }]
    const nextFlight = flights?.filter(f => f.day_date >= todayStr)?.[0]
    if (nextFlight) {
      const [from, to] = (nextFlight.location || '').split(' → ')
      if (from && to) {
        segs.push({ t: `${from} → ${to}`, mark: 'neutral', source: 'trip' })
        segs.push({ t: ` departs ${formatDateShort(nextFlight.day_date)}${nextFlight.start_time ? ` at ${nextFlight.start_time.slice(0, 5)}` : ''}. ` })
      }
    }
    if ((stays?.length || 0) > 0) {
      segs.push({ t: `All ${stays.length} stays confirmed`, mark: 'good', source: 'trip' })
      segs.push({ t: '. ' })
    }
    segs.push({ t: 'Final prep, packing, and online check-in are the priorities this week.' })
    return segs
  }

  if (phaseKey === 'inTrip') {
    const start  = new Date(trip.start_date + 'T00:00:00')
    const end    = new Date(trip.end_date   + 'T00:00:00')
    const dayNum = Math.round((today - start) / 86400000) + 1
    const daysLeft = Math.round((end - today) / 86400000)
    const todayStr = today.toISOString().slice(0, 10)
    const currentStay = stays?.find(s => s.check_in_date <= todayStr && s.check_out_date >= todayStr)
    const segs = [{ t: `Day ${dayNum} of ${totalDays}` }]
    if (currentStay) {
      segs.push({ t: ' — staying at ' })
      segs.push({ t: currentStay.name, mark: 'neutral', source: 'trip' })
      if (currentStay.city) segs.push({ t: ` in ${currentStay.city}` })
    }
    segs.push({ t: '. ' })
    if (daysLeft <= 2) {
      segs.push({ t: `Only ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`, mark: 'warm', source: 'trip' })
      segs.push({ t: ' of the trip — make the most of it. ' })
    } else {
      segs.push({ t: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`, mark: 'neutral', source: 'trip' })
      segs.push({ t: ' on the trip. ' })
    }
    if (budget > 0) {
      const daily = Math.round(budget / totalDays)
      segs.push({ t: `Daily target: $${daily}`, mark: 'neutral', source: 'trip' })
      segs.push({ t: '. ' })
    }
    const nextFlight = flights?.filter(f => f.day_date >= todayStr)?.[0]
    if (nextFlight) {
      const d = Math.round((new Date(nextFlight.day_date + 'T00:00:00') - today) / 86400000)
      segs.push({ t: `Next flight ${d === 0 ? 'today' : `in ${d} day${d !== 1 ? 's' : ''}`}`, mark: d === 0 ? 'warm' : 'neutral', source: 'trip' })
      segs.push({ t: '.' })
    }
    return segs
  }

  return [{ t: `Welcome to your trip briefing for ${dest}.` }]
}

function buildHeroStats(phaseKey, trip, stays, flights, budgetData, flightCount, activityCount) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysToGo  = getDaysToGo(trip)
  const totalDays = getTotalDays(trip)
  const budget = parseFloat(trip.budget || 0)
  const spent  = budgetData?.total ?? 0

  if (phaseKey === 'preTrip') {
    return [
      { l: 'Countdown',  v: `${Math.max(0, daysToGo)}d`, sub: `depart ${formatDateShort(trip.start_date)}` },
      { l: 'Committed',  v: spent > 0 ? fmtMoney(spent) : '—', sub: budget > 0 ? `${Math.round((spent / budget) * 100)}% of ${fmtMoney(budget)}` : 'no budget set' },
      { l: 'Flights',    v: String(flightCount   || 0), sub: 'confirmed', tone: (flightCount   || 0) > 0 ? 'good' : undefined },
      { l: 'Hotels',     v: String(stays?.length || 0), sub: 'booked',    tone: (stays?.length || 0) > 0 ? 'good' : undefined },
      { l: 'Activities', v: String(activityCount || 0), sub: 'in itinerary' },
    ]
  }

  if (phaseKey === 'weekOf') {
    const todayStr = today.toISOString().slice(0, 10)
    const next = flights?.filter(f => f.day_date >= todayStr)?.[0]
    const d = next ? Math.round((new Date(next.day_date + 'T00:00:00') - today) / 86400000) : null
    return [
      { l: 'Countdown',    v: `${Math.max(0, daysToGo)}d`, sub: `depart ${formatDateShort(trip.start_date)}` },
      { l: 'Next flight',  v: d !== null ? (d === 0 ? 'Today' : `${d}d`) : '—', sub: next ? next.title.slice(0, 22) : 'no flights', tone: d === 0 ? 'warm' : undefined },
      { l: 'Hotels',       v: String(stays?.length || 0), sub: 'all confirmed', tone: (stays?.length || 0) > 0 ? 'good' : undefined },
      { l: 'Budget',       v: budget > 0 ? fmtMoney(budget) : '—', sub: budget > 0 ? `${fmtMoney(budget - spent)} flex` : 'not set' },
      { l: 'Activities',   v: String(activityCount || 0), sub: 'planned' },
    ]
  }

  if (phaseKey === 'inTrip') {
    const start  = new Date(trip.start_date + 'T00:00:00')
    const end    = new Date(trip.end_date   + 'T00:00:00')
    const dayNum = Math.round((today - start) / 86400000) + 1
    const left   = Math.round((end - today) / 86400000)
    const daily  = budget > 0 && totalDays > 0 ? Math.round(budget / totalDays) : 0
    return [
      { l: 'Day',          v: `${dayNum} / ${totalDays}`, sub: trip.name },
      { l: 'Daily target', v: daily > 0 ? `$${daily}` : '—', sub: 'per day', tone: 'good' },
      { l: 'Days left',    v: String(left), sub: `end ${formatDateShort(trip.end_date)}`, tone: left <= 2 ? 'warm' : undefined },
      { l: 'Hotels',       v: String(stays?.length || 0), sub: 'confirmed', tone: 'good' },
      { l: 'Activities',   v: String(activityCount || 0), sub: 'planned' },
    ]
  }

  return []
}

function buildTickers(phaseKey, trip, stays, flights, budgetData, flightCount) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysToGo  = getDaysToGo(trip)
  const totalDays = getTotalDays(trip)
  const budget    = parseFloat(trip.budget || 0)
  const spent     = budgetData?.total ?? 0
  const todayStr  = today.toISOString().slice(0, 10)

  const tickers = []

  if (phaseKey === 'inTrip') {
    const start  = new Date(trip.start_date + 'T00:00:00')
    const end    = new Date(trip.end_date   + 'T00:00:00')
    const dayNum = Math.round((today - start) / 86400000) + 1
    const left   = Math.round((end - today) / 86400000)
    tickers.push({ id: 'day', label: 'Trip day', value: `${dayNum}/${totalDays}`, delta: `${left}d left`, trend: 'flat', note: trip.name })
  } else {
    tickers.push({ id: 'countdown', label: 'Countdown', value: `${Math.max(0, daysToGo)}d`, delta: 'to go', trend: 'flat', note: `depart ${formatDateShort(trip.start_date)}` })
  }

  tickers.push({
    id: 'flights', label: 'Flights', value: String(flightCount || 0),
    delta: 'confirmed', trend: 'flat',
    note: (flightCount || 0) === 0 ? 'add in Bookings' : 'all on schedule',
  })

  tickers.push({
    id: 'stays', label: 'Hotels', value: String(stays?.length || 0),
    delta: 'booked', trend: 'flat',
    note: `${totalDays} night${totalDays !== 1 ? 's' : ''} total`,
  })

  if (budget > 0) {
    const pct = Math.round((spent / budget) * 100)
    tickers.push({
      id: 'budget', label: 'Budget',
      value: fmtMoney(budget), delta: `${pct}% used`,
      trend: pct > 90 ? 'up' : 'flat',
      note: `${fmtMoney(budget - spent)} remaining`,
    })
  } else {
    tickers.push({ id: 'budget', label: 'Budget', value: '—', delta: 'not set', trend: 'flat', note: 'add in Settings' })
  }

  const nextFlight = flights?.filter(f => f.day_date >= todayStr)?.[0]
  if (nextFlight) {
    const d = Math.round((new Date(nextFlight.day_date + 'T00:00:00') - today) / 86400000)
    tickers.push({
      id: 'nextflight', label: 'Next flight',
      value: d === 0 ? 'Today' : `${d}d`,
      delta: d === 0 ? 'departs today' : `in ${d} day${d !== 1 ? 's' : ''}`,
      trend: d === 0 ? 'up' : 'flat',
      note: nextFlight.title.slice(0, 22),
    })
  } else {
    tickers.push({ id: 'weather', label: 'Weather', value: '—', delta: 'connect API', trend: 'flat', note: 'Open-Meteo' })
  }

  return tickers
}

function buildWatching(stays, flights) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)
  const items = []

  stays?.slice(0, 2).forEach(stay => {
    items.push({
      what: stay.name || 'Hotel',
      signal: stay.price ? 'Booked rate' : 'Reservation',
      value: stay.price ? fmtMoney(parseFloat(stay.price)) : 'Confirmed',
      since: `check-in ${formatDateShort(stay.check_in_date)}`,
      state: 'flat',
    })
  })

  flights?.filter(f => f.day_date >= todayStr).slice(0, 2).forEach(flight => {
    const [from, to] = (flight.location || '').split(' → ')
    items.push({
      what: from && to ? `${from} → ${to}` : flight.title,
      signal: 'Flight status',
      value: flight.status || 'confirmed',
      since: formatDateShort(flight.day_date),
      state: 'flat',
    })
  })

  return items.slice(0, 4)
}

function buildActionList(upcomingItems) {
  if (!upcomingItems || upcomingItems.length === 0) {
    return [{ id: 'start', label: 'Add items to your itinerary', status: 'now', due: 'Get started' }]
  }
  return upcomingItems.slice(0, 6).map(item => ({
    id: item.id,
    label: item.title,
    status: item.status === 'confirmed' ? 'done' : 'queued',
    due: item.start_time ? item.start_time.slice(0, 5) : formatDateShort(item.day_date),
  }))
}

const SOURCE_LABELS = { trip: 'Itinerary', wx: 'Open-Meteo', fx: 'Wise · OANDA', deals: 'Price watch', ops: 'Operator feed', tide: 'Tide data', group: 'Group' }

const INTEL_ITEMS = [
  { icon: '✈️', title: 'Flight check-in', body: 'Online check-in opens 24h before departure. Download boarding passes to Apple Wallet or Google Pay for offline access.' },
  { icon: '💳', title: 'Cards & cash',    body: 'Notify your bank before travel to avoid blocks. Carry local currency for markets and vendors who may not accept cards.' },
  { icon: '📱', title: 'Connectivity',    body: 'Consider a local SIM or eSIM for data. Download offline maps before landing — Google Maps works well.' },
  { icon: '🔒', title: 'Documents',       body: 'Keep digital copies of passport, insurance, and booking confirmations in a secure cloud folder, accessible offline.' },
]

const PHASE_ACTIONS = {
  preTrip: [
    { kind: 'primary', label: 'View itinerary', icon: '📅' },
    { kind: 'primary', label: 'Open bookings',  icon: '✈️' },
    { kind: 'ghost',   label: 'Check budget',   icon: '💰' },
    { kind: 'ghost',   label: 'Browse wishlist', icon: '⭐' },
  ],
  weekOf: [
    { kind: 'primary', label: 'View itinerary',        icon: '📅' },
    { kind: 'primary', label: 'Check flights',          icon: '✈️' },
    { kind: 'ghost',   label: 'Download offline maps',  icon: '🗺️' },
    { kind: 'ghost',   label: 'Print travel documents', icon: '🛂' },
  ],
  inTrip: [
    { kind: 'primary', label: "Open today's plan",  icon: '📍' },
    { kind: 'primary', label: 'Log an expense',     icon: '💳' },
    { kind: 'ghost',   label: 'Check flights',       icon: '✈️' },
    { kind: 'ghost',   label: 'Budget overview',     icon: '💰' },
  ],
}

// Mock 7-day forecast (would come from Open-Meteo)
const MOCK_FORECAST = [
  { d: 'Mon', hi: 30, lo: 22, p: 40, emoji: '⛅' },
  { d: 'Tue', hi: 32, lo: 23, p: 60, emoji: '🌦️' },
  { d: 'Wed', hi: 28, lo: 21, p: 70, emoji: '⛈️' },
  { d: 'Thu', hi: 31, lo: 22, p: 30, emoji: '☀️' },
  { d: 'Fri', hi: 33, lo: 24, p: 20, emoji: '☀️' },
  { d: 'Sat', hi: 31, lo: 23, p: 45, emoji: '⛅' },
  { d: 'Sun', hi: 29, lo: 22, p: 55, emoji: '🌦️' },
]

// ── Sub-components ───────────────────────────────────────────

function LiveTag() {
  return (
    <span className="bf-livetag">
      <span className="bf-livedot" />
      LIVE · updated just now
    </span>
  )
}

function ConfidenceMeter({ value, label }) {
  const segs = 5
  const filled = Math.round(value * segs)
  return (
    <div className="bf-confidence">
      <span className="bf-confidence-label">Confidence</span>
      <div className="bf-confidence-segs">
        {Array.from({ length: segs }).map((_, i) => (
          <span key={i} className={`bf-confidence-seg${i < filled ? ' on' : ''}`} />
        ))}
      </div>
      <span className="bf-confidence-label">{label}</span>
    </div>
  )
}

function MarkFact({ children, mark, source }) {
  const SCHEMES = {
    good:    { color: '#9fd6b3', chip: 'OPPORTUNITY' },
    warm:    { color: '#ffb88a', chip: 'ACT SOON'    },
    neutral: { color: '#faf7f1', chip: 'STATUS'      },
  }
  const sch = SCHEMES[mark || 'neutral']
  const src = source ? (SOURCE_LABELS[source] || source) : null
  return (
    <span className="bf-fact" style={{ color: sch.color, borderBottom: `1.5px solid ${sch.color}` }}>
      {children}
      <span className="bf-fact-tt">
        <span className="bf-fact-chip" style={{ color: sch.color }}>{sch.chip}</span>
        {src && <span className="bf-fact-src">via {src}</span>}
      </span>
    </span>
  )
}

function CardHeader({ title, right }) {
  return (
    <div className="bf-card-h">
      <h3>{title}</h3>
      {right && <div className="bf-card-h-r">{right}</div>}
    </div>
  )
}

function PhaseTabs({ value, trip, onChange }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysToGo = getDaysToGo(trip)
  const start    = new Date(trip.start_date + 'T00:00:00')
  const end      = new Date(trip.end_date   + 'T00:00:00')
  const dayNum   = Math.round((today - start) / 86400000) + 1
  const tabs = [
    { id: 'preTrip', label: 'Pre-trip', sub: daysToGo > 0 ? `T-${daysToGo}d` : 'before trip' },
    { id: 'weekOf',  label: 'Week of',  sub: daysToGo > 0 && daysToGo <= 14 ? `T-${daysToGo}d` : 'T-7d' },
    { id: 'inTrip',  label: 'In trip',  sub: today >= start && today <= end ? `Day ${dayNum}` : 'on trip' },
  ]
  return (
    <div className="bf-phase-tabs">
      {tabs.map(t => (
        <button key={t.id} className={`bf-phase-tab${value === t.id ? ' on' : ''}`} onClick={() => onChange(t.id)}>
          <span className="bf-phase-tab-l">{t.label}</span>
          <span className="bf-phase-tab-s">{t.sub}</span>
        </button>
      ))}
    </div>
  )
}

function BriefingHero({ phaseKey, trip, narrative, heroStats, actions, onPlayAudio }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysToGo = getDaysToGo(trip)
  const start    = new Date(trip.start_date + 'T00:00:00')
  const dayNum   = Math.round((today - start) / 86400000) + 1
  const total    = getTotalDays(trip)
  const countdownLabel = phaseKey === 'inTrip' ? `Day ${dayNum} of ${total}` : `T-${Math.max(0, daysToGo)}d`

  const hour = new Date().getHours()
  const greeting = hour < 14 ? 'Morning briefing' : 'Evening briefing'
  const localTime = new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) +
    ' · ' + new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <section className="bf-hero">
      <div className="bf-hero-top">
        <div className="bf-hero-top-l">
          <span className="bf-eyebrow">BRIEFING · {countdownLabel}</span>
          <LiveTag />
        </div>
        <div className="bf-hero-top-r">
          <ConfidenceMeter value={0.8} label="4 of 5 sources" />
          <button className="bf-audio-btn" onClick={onPlayAudio} title="Read briefing aloud">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15 9a5 5 0 0 1 0 6" />
            </svg>
            Read aloud
          </button>
        </div>
      </div>

      <div className="bf-hero-body">
        <div className="bf-greeting">
          <h1 className="bf-greeting-title">{greeting}</h1>
          <span className="bf-greeting-meta">You · {localTime}</span>
        </div>

        <p className="bf-narrative">
          {narrative.map((seg, i) =>
            seg.mark
              ? <MarkFact key={i} mark={seg.mark} source={seg.source}>{seg.t}</MarkFact>
              : <span key={i}>{seg.t}</span>
          )}
        </p>

        <div className="bf-actions">
          {actions.map((a, i) => (
            <Link
              key={i}
              to={a.href || (a.label.toLowerCase().includes('itinerary') ? '/itinerary' : a.label.toLowerCase().includes('book') || a.label.toLowerCase().includes('flight') ? '/accommodation' : a.label.toLowerCase().includes('budget') ? '/budget' : a.label.toLowerCase().includes('wishlist') ? '/wishlist' : '/settings')}
              className={`bf-btn ${a.kind}`}
              style={{ textDecoration: 'none' }}
            >
              <span className="bf-btn-icon">{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bf-hero-stats">
        {heroStats.map((s, i) => (
          <div key={i} className="bf-hero-stat">
            <div className="bf-eyebrow">{s.l}</div>
            <div className="bf-hero-stat-v">{s.v}</div>
            <div className={`bf-hero-stat-s${s.tone ? ` ${s.tone}` : ''}`}>{s.sub}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TickerStrip({ tickers }) {
  return (
    <section className="bf-tickers">
      {tickers.map((t, i) => (
        <div key={t.id} className="bf-ticker" style={{ borderRight: i < tickers.length - 1 ? '1px solid var(--line)' : 'none' }}>
          <div className="bf-eyebrow" style={{ fontSize: 9.5 }}>{t.label}</div>
          <div className="bf-ticker-row">
            <span className="bf-ticker-v">{t.value}</span>
            <span className={`bf-ticker-d ${t.trend}`}>
              {t.trend === 'up' ? '▲' : t.trend === 'down' ? '▼' : '■'} {t.delta}
            </span>
          </div>
          <div className="bf-ticker-note">{t.note}</div>
        </div>
      ))}
    </section>
  )
}

function WatchingCard({ items }) {
  return (
    <section className="bf-card">
      <CardHeader title="Watching" right={<Link to="/accommodation" className="bf-link">Bookings →</Link>} />
      {items.length === 0
        ? <p className="bf-muted-sm">Add stays and flights in Bookings to watch them here.</p>
        : items.map((w, i) => (
          <div key={i} className="bf-watch-row" style={{ borderBottom: i < items.length - 1 ? '1px dashed var(--line)' : 'none' }}>
            <div>
              <div className="bf-watch-name">{w.what}</div>
              <div className="bf-watch-sig">{w.signal}</div>
            </div>
            <div className="bf-watch-r">
              <div className="bf-watch-v">{w.value}</div>
              <div className={`bf-watch-d ${w.state}`}>
                {w.state === 'up' ? '▲' : w.state === 'down' ? '▼' : '■'} {w.since}
              </div>
            </div>
          </div>
        ))
      }
    </section>
  )
}

function ActionsCard({ items }) {
  const nowCount = items.filter(p => p.status === 'now').length
  return (
    <section className="bf-card">
      <CardHeader
        title="Actions"
        right={nowCount > 0
          ? <span className="bf-badge warn">{nowCount} due now</span>
          : <span className="bf-badge confirmed">all clear</span>
        }
      />
      <div className="bf-actions-list">
        {items.map(p => {
          const tone  = p.status === 'now' ? 'warm' : p.status === 'done' ? 'confirmed' : p.status === 'blocked' ? 'gold' : 'sky'
          const label = p.status === 'now' ? 'DO NOW' : p.status === 'done' ? 'DONE' : p.status === 'blocked' ? 'WAITING' : 'QUEUED'
          return (
            <div key={p.id} className="bf-action-row">
              <span className={`bf-badge ${tone}`} style={{ fontSize: 10, minWidth: 70, justifyContent: 'center' }}>{label}</span>
              <span className="bf-action-label" style={{
                textDecoration: p.status === 'done' ? 'line-through' : 'none',
                color: p.status === 'done' ? 'var(--muted-2)' : 'var(--ink)',
              }}>{p.label}</span>
              <span className="bf-tiny bf-muted bf-mono">{p.due}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function IntelCard({ items }) {
  return (
    <section className="bf-card">
      <CardHeader title="Local intel" right={<span className="bf-muted-sm">travel tips</span>} />
      <div className="bf-intel-list">
        {items.map((it, i) => (
          <div key={i} className="bf-intel-item">
            <span className="bf-intel-icon">{it.icon}</span>
            <div>
              <div className="bf-intel-title">{it.title}</div>
              <div className="bf-intel-body">{it.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ForecastStrip({ days }) {
  return (
    <div className="bf-forecast">
      {days.map((d, i) => {
        const rainy = d.p >= 50
        return (
          <div key={i} className={`bf-forecast-day${rainy ? ' rainy' : ''}`}>
            <div className="bf-tiny bf-muted bf-mono">{d.d}</div>
            <div className="bf-forecast-emoji">{d.emoji}</div>
            <div className="bf-forecast-hi">{d.hi}°</div>
            <div className="bf-tiny bf-muted bf-mono">{d.lo}°</div>
            <div className="bf-forecast-rain" style={{ color: rainy ? 'var(--sky)' : 'var(--muted-2)' }}>{d.p}%</div>
          </div>
        )
      })}
    </div>
  )
}

function DetailRow({ flights, trip }) {
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)
  const upcoming = (flights || []).filter(f => f.day_date >= todayStr)

  return (
    <div className="bf-detail-row">
      {/* Flights */}
      <section className="bf-card">
        <CardHeader
          title="Flights · all confirmed"
          right={<Link to="/accommodation" className="bf-link">Bookings →</Link>}
        />
        <div className="bf-flights-list">
          {upcoming.length === 0
            ? <p className="bf-muted-sm">No upcoming flights. <Link to="/accommodation" style={{ color: 'var(--accent)' }}>Add in Bookings →</Link></p>
            : upcoming.map((f, i) => {
              const [from, to] = (f.location || '').split(' → ')
              const confLine   = (f.notes || '').split('\n').find(l => l.startsWith('Conf:'))
              const isRisk     = f.status === 'cancelled'
              return (
                <div key={f.id} className="bf-flight-row" style={{ borderTop: i ? '1px dashed var(--line)' : 'none' }}>
                  <div className="bf-flight-route">
                    {from && to ? <>{from} <span style={{ color: 'var(--muted-2)' }}>→</span> {to}</> : '—'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5 }}>{f.title}</div>
                    <div className="bf-tiny bf-muted bf-mono">
                      {new Date(f.day_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {f.start_time && ` · ${f.start_time.slice(0, 5)}`}
                    </div>
                  </div>
                  <div className="bf-tiny bf-mono" style={{ color: isRisk ? 'var(--warm)' : 'var(--accent)' }}>
                    ● {f.status || 'confirmed'}
                  </div>
                  <div className="bf-tiny bf-muted bf-mono" style={{ textAlign: 'right' }}>
                    {confLine ? confLine.replace('Conf:', '').trim() : '—'}
                  </div>
                </div>
              )
            })
          }
        </div>
      </section>

      {/* Weather */}
      <section className="bf-card">
        <CardHeader
          title="14-day weather"
          right={<span className="bf-badge sky" style={{ fontSize: 10 }}>connect Open-Meteo</span>}
        />
        <ForecastStrip days={MOCK_FORECAST} />
        <div className="bf-forecast-notes">
          <span className="bf-tiny bf-muted">Forecast · {trip.destination || trip.name}</span>
          <span className="bf-tiny bf-muted">Mock data — connect Open-Meteo API</span>
        </div>
      </section>
    </div>
  )
}

function BudgetRow({ trip, budgetData, stays }) {
  const budget    = parseFloat(trip.budget || 0)
  const spent     = budgetData?.total ?? 0
  const totalDays = getTotalDays(trip)
  const daily     = budget > 0 && totalDays > 0 ? Math.round(budget / totalDays) : 0

  const stayTotal  = (stays || []).reduce((s, st) => s + parseFloat(st.price || 0), 0)
  const otherSpend = Math.max(0, spent - stayTotal)
  const flex       = Math.max(0, budget - spent)

  const stayPct  = budget > 0 ? Math.min(100,             (stayTotal  / budget) * 100) : 33
  const otherPct = budget > 0 ? Math.min(100 - stayPct,   (otherSpend / budget) * 100) : 33
  const flexPct  = budget > 0 ? Math.max(0, 100 - stayPct - otherPct) : 34

  return (
    <section className="bf-card">
      <CardHeader title="Budget · live forecast" right={<Link to="/budget" className="bf-link">Detail →</Link>} />
      <div className="bf-budget-grid">
        <div>
          <div className="bf-eyebrow" style={{ color: 'var(--muted)', marginBottom: 8 }}>Booked vs flex</div>
          {budget > 0 ? (
            <>
              <div className="bf-budget-bar">
                <div style={{ width: `${stayPct}%`,  background: 'var(--accent)' }} />
                <div style={{ width: `${otherPct}%`, background: 'var(--sky)'    }} />
                <div style={{ width: `${flexPct}%`,  background: 'var(--line-strong)' }} />
              </div>
              <div className="bf-budget-legend">
                <span><span style={{ color: 'var(--accent)' }}>●</span> Stays {fmtMoney(stayTotal)}</span>
                <span><span style={{ color: 'var(--sky)'    }}>●</span> Other {fmtMoney(otherSpend)}</span>
                <span><span style={{ color: 'var(--line-strong)' }}>●</span> Flex {fmtMoney(flex)}</span>
              </div>
            </>
          ) : (
            <p className="bf-muted-sm">Set a budget in <Link to="/settings" style={{ color: 'var(--accent)' }}>Settings</Link> to see the forecast.</p>
          )}
        </div>

        <div className="bf-stat-col">
          <span className="bf-tiny bf-muted">Daily burn forecast</span>
          <span className="bf-budget-big">{daily > 0 ? `$${daily}` : '—'} <span className="bf-tiny bf-muted">/day</span></span>
          {budget > 0 && <span className="bf-tiny" style={{ color: 'var(--accent)' }}>over {totalDays} day{totalDays !== 1 ? 's' : ''}</span>}
        </div>

        <div className="bf-stat-col">
          <span className="bf-tiny bf-muted">Total committed</span>
          <span className="bf-budget-big">{spent > 0 ? fmtMoney(spent) : '$0'}</span>
          <span className="bf-tiny bf-muted">{budget > 0 ? `${Math.round((spent / budget) * 100)}% of ${fmtMoney(budget)}` : 'no budget set'}</span>
        </div>
      </div>
    </section>
  )
}

// ── Main Dashboard page ──────────────────────────────────────

export default function Dashboard({ trip }) {
  const [upcomingItems,  setUpcomingItems]  = useState(null)
  const [stays,          setStays]          = useState(null)
  const [flights,        setFlights]        = useState(null)
  const [budgetData,     setBudgetData]     = useState(null)
  const [flightCount,    setFlightCount]    = useState(null)
  const [activityCount,  setActivityCount]  = useState(null)
  const [phaseOverride,  setPhaseOverride]  = useState(null)

  useEffect(() => {
    if (!trip) return
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const fromDate = today < new Date(trip.start_date + 'T00:00:00')
      ? trip.start_date
      : today.toISOString().slice(0, 10)

    Promise.all([
      supabase.from('itinerary_items').select('id,title,day_date,start_time,item_type,status').eq('trip_id', trip.id).neq('item_type', 'flight').gte('day_date', fromDate).order('day_date').order('order_index').limit(8),
      supabase.from('itinerary_items').select('id,title,day_date,start_time,item_type,status,location,notes,cost').eq('trip_id', trip.id).eq('item_type', 'flight').gte('day_date', fromDate).order('day_date').order('start_time'),
      supabase.from('accommodations').select('id,name,address,city,check_in_date,check_out_date,price').eq('trip_id', trip.id).order('check_in_date'),
      supabase.from('expenses').select('amount').eq('trip_id', trip.id),
      supabase.from('accommodations').select('price').eq('trip_id', trip.id).not('price', 'is', null),
      supabase.from('itinerary_items').select('cost').eq('trip_id', trip.id).not('cost', 'is', null),
      supabase.from('itinerary_items').select('*', { count: 'exact', head: true }).eq('trip_id', trip.id).eq('item_type', 'flight'),
      supabase.from('itinerary_items').select('*', { count: 'exact', head: true }).eq('trip_id', trip.id).eq('item_type', 'activity'),
    ]).then(([itin, flightsRes, staysRes, expenses, stayPrices, itinCosts, fcRes, acRes]) => {
      setUpcomingItems(itin.data        || [])
      setFlights(flightsRes.data        || [])
      setStays(staysRes.data            || [])
      setFlightCount(fcRes.count        ?? 0)
      setActivityCount(acRes.count      ?? 0)
      const expTotal  = (expenses.data   || []).reduce((s, e) => s + parseFloat(e.amount), 0)
      const stayTotal = (stayPrices.data || []).reduce((s, e) => s + parseFloat(e.price),  0)
      const itinTotal = (itinCosts.data  || []).reduce((s, e) => s + parseFloat(e.cost),   0)
      setBudgetData({ total: expTotal + stayTotal + itinTotal })
    })
  }, [trip?.id])

  useEffect(() => { setPhaseOverride(null) }, [trip?.id])

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

  const phaseKey  = phaseOverride || computePhase(trip)
  const narrative = buildNarrative(phaseKey, trip, stays, flights, budgetData, flightCount)
  const heroStats = buildHeroStats(phaseKey, trip, stays, flights, budgetData, flightCount, activityCount)
  const tickers   = buildTickers(phaseKey, trip, stays, flights, budgetData, flightCount)
  const watching  = buildWatching(stays, flights)
  const actions   = buildActionList(upcomingItems)

  function playAudio() {
    if (!('speechSynthesis' in window)) return
    const txt = narrative.map(s => s.t).join('')
    const u   = new SpeechSynthesisUtterance(txt)
    u.rate    = 1.05
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  return (
    <div className="bf-root">
      <div className="bf-page">
        <header className="bf-pageheader">
          <div>
            <div className="bf-eyebrow">{trip.destination || trip.name}</div>
            <h2 className="bf-h2">Trip briefing</h2>
          </div>
          <div className="bf-pageheader-r">
            <PhaseTabs value={phaseKey} trip={trip} onChange={setPhaseOverride} />
          </div>
        </header>

        <BriefingHero
          phaseKey={phaseKey}
          trip={trip}
          narrative={narrative}
          heroStats={heroStats}
          actions={PHASE_ACTIONS[phaseKey] || PHASE_ACTIONS.preTrip}
          onPlayAudio={playAudio}
        />

        <TickerStrip tickers={tickers} />

        <div className="bf-cols-3">
          <WatchingCard items={watching} />
          <ActionsCard  items={actions}  />
          <IntelCard    items={INTEL_ITEMS} />
        </div>

        <DetailRow flights={flights || []} trip={trip} />

        <BudgetRow trip={trip} budgetData={budgetData} stays={stays || []} />

        <footer className="bf-footer">
          <span className="bf-tiny bf-muted">
            Briefing rendered {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · sources: itinerary, bookings, budget
          </span>
          <Link to="/settings" className="bf-link">Briefing settings →</Link>
        </footer>
      </div>
    </div>
  )
}
