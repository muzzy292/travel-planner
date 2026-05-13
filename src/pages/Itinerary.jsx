import { useEffect, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { supabase } from '../lib/supabase'
import SortableItem from '../components/SortableItem'
import EventModal from '../components/EventModal'
import ParseConfirmationModal from '../components/ParseConfirmationModal'

function getDays(start, end) {
  const days = []
  const cur = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function buildCalendarEvent(item, day) {
  const base = { summary: item.title, description: item.notes || '' }
  if (item.start_time) {
    const start = `${day}T${item.start_time}`
    return { ...base, start: { dateTime: start, timeZone: 'Australia/Sydney' }, end: { dateTime: start, timeZone: 'Australia/Sydney' }, location: item.location || '' }
  }
  return { ...base, start: { date: day }, end: { date: day }, location: item.location || '' }
}

export default function Itinerary({ trip, calendarConnected, pushEvent, deleteCalendarEvent }) {
  const [items, setItems] = useState([])
  const [stays, setStays] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [showParse, setShowParse] = useState(false)
  const [syncError, setSyncError] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    if (trip) {
      fetchItems()
      fetchCalendarEvents()
      fetchStays()
    }
  }, [trip?.id])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', trip.id)
      .order('day_date')
      .order('order_index')
    setItems(data || [])
    setLoading(false)
  }

  async function fetchStays() {
    const { data } = await supabase
      .from('accommodations')
      .select('id, name, type, check_in_date, check_out_date, check_in_time, check_out_time, address')
      .eq('trip_id', trip.id)
      .order('check_in_date')
    setStays(data || [])
  }

  async function fetchCalendarEvents() {
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('trip_id', trip.id)
    setCalendarEvents(data || [])
  }

  async function saveEvent(payload) {
    if (modal.mode === 'add') {
      const dayItems = items.filter((i) => i.day_date === modal.day)
      const { data, error } = await supabase
        .from('itinerary_items')
        .insert({ ...payload, trip_id: trip.id, day_date: modal.day, order_index: dayItems.length })
        .select()
        .single()
      if (!error) setItems((prev) => [...prev, data])
    } else {
      const { data, error } = await supabase
        .from('itinerary_items')
        .update(payload)
        .eq('id', modal.item.id)
        .select()
        .single()
      if (!error) setItems((prev) => prev.map((i) => (i.id === modal.item.id ? data : i)))
    }
    setModal(null)
  }

  async function deleteEvent(id) {
    await supabase.from('itinerary_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setModal(null)
  }

  async function handleDragEnd(event, day) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const dayItems = items.filter((i) => i.day_date === day)
    const oldIndex = dayItems.findIndex((i) => i.id === active.id)
    const newIndex = dayItems.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(dayItems, oldIndex, newIndex).map((item, idx) => ({ ...item, order_index: idx }))
    setItems((prev) => [...prev.filter((i) => i.day_date !== day), ...reordered])
    await Promise.all(
      reordered.map((item) =>
        supabase.from('itinerary_items').update({ order_index: item.order_index }).eq('id', item.id)
      )
    )
  }

  async function addParsedItems(parsedItems) {
    const inserts = parsedItems.map((item, idx) => ({
      trip_id: trip.id,
      day_date: item.day_date,
      title: item.title,
      notes: item.notes || null,
      location: item.location || null,
      start_time: item.start_time || null,
      item_type: item.item_type || 'other',
      status: 'tentative',
      order_index: idx,
    }))
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert(inserts)
      .select()
    if (!error && data) setItems((prev) => [...prev, ...data])
  }

  async function handleCalendarSync(item, day) {
    setSyncError(null)
    try {
      const eventPayload = buildCalendarEvent(item, day)
      await pushEvent(trip.id, item.item_type, item.id, eventPayload)
      await fetchCalendarEvents()
    } catch (e) {
      setSyncError(e.message)
    }
  }

  async function handleLogToBudget(item) {
    const categoryMap = { flight: 'Flights', accommodation: 'Accommodation', activity: 'Activities', transport: 'Transport' }
    const category = categoryMap[item.item_type] || 'Misc'
    await supabase.from('expenses').insert({
      trip_id: trip.id,
      category,
      amount: item.cost,
      date: item.day_date,
      notes: item.title,
    })
  }

  async function handleCalendarDelete(item) {
    setSyncError(null)
    const calEvent = calendarEvents.find((e) => e.item_id === item.id)
    if (!calEvent) return
    try {
      await deleteCalendarEvent(calEvent.google_event_id, calEvent.id)
      setCalendarEvents((prev) => prev.filter((e) => e.id !== calEvent.id))
    } catch (e) {
      setSyncError(e.message)
    }
  }

  if (!trip) return <div className="page"><p>No active trip.</p></div>
  if (loading) return <div className="page"><p>Loading…</p></div>

  const days = getDays(trip.start_date, trip.end_date)

  function staysForDay(day) {
    return stays.filter((s) => s.check_in_date <= day && s.check_out_date >= day)
  }

  function stayLabel(stay, day) {
    if (day === stay.check_in_date) return `Check-in${stay.check_in_time ? ` at ${stay.check_in_time.slice(0, 5)}` : ''}`
    if (day === stay.check_out_date) return `Check-out${stay.check_out_time ? ` at ${stay.check_out_time.slice(0, 5)}` : ''}`
    return 'Staying'
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Itinerary — {trip.name}</h2>
        <button className="btn btn-secondary" onClick={() => setShowParse(true)}>📋 Import confirmation</button>
      </div>
      {syncError && <p className="error" style={{ marginBottom: '1rem' }}>{syncError}</p>}
      <div className="itinerary-days">
        {days.map((day, i) => {
          const dayItems = items.filter((item) => item.day_date === day).sort((a, b) => a.order_index - b.order_index)
          const label = new Date(day + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
          return (
            <div key={day} className="day-block">
              <div className="day-header">
                <span className="day-label">Day {i + 1} — {label}</span>
                <button className="btn-add" onClick={() => setModal({ mode: 'add', day })}>+ Add</button>
              </div>
              {staysForDay(day).map((stay) => (
                <a key={stay.id} className="stay-banner" href="/accommodation" title="View in Stays">
                  <span className="stay-banner-icon">🏨</span>
                  <span className="stay-banner-name">{stay.name}</span>
                  <span className="stay-banner-label">{stayLabel(stay, day)}</span>
                  {stay.address && <span className="stay-banner-address">📍 {stay.address}</span>}
                </a>
              ))}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, day)}>
                <SortableContext items={dayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="day-events">
                    {dayItems.length === 0 && <p className="empty-day">No events yet</p>}
                    {dayItems.map((item) => {
                      const calEvent = calendarEvents.find((e) => e.item_id === item.id)
                      return (
                        <SortableItem
                          key={item.id}
                          item={{ ...item, calendar_event_id: calEvent?.id }}
                          onEdit={() => setModal({ mode: 'edit', day, item })}
                          onCalendarSync={() => handleCalendarSync(item, day)}
                          onCalendarDelete={() => handleCalendarDelete(item)}
                          onLogToBudget={() => handleLogToBudget(item)}
                          calendarConnected={calendarConnected}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )
        })}
      </div>
      {modal && (
        <EventModal
          mode={modal.mode}
          day={modal.day}
          item={modal.item}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={() => setModal(null)}
        />
      )}
      {showParse && (
        <ParseConfirmationModal
          trip={trip}
          onAdd={addParsedItems}
          onClose={() => setShowParse(false)}
        />
      )}
    </div>
  )
}
