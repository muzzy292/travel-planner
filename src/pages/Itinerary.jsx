import { useEffect, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { supabase } from '../lib/supabase'
import SortableItem from '../components/SortableItem'
import EventModal from '../components/EventModal'

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

export default function Itinerary({ trip }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { mode: 'add'|'edit', day, item? }

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    if (trip) fetchItems()
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

  if (!trip) return <div className="page"><p>No active trip.</p></div>
  if (loading) return <div className="page"><p>Loading…</p></div>

  const days = getDays(trip.start_date, trip.end_date)

  return (
    <div className="page">
      <h2>Itinerary — {trip.name}</h2>
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, day)}>
                <SortableContext items={dayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="day-events">
                    {dayItems.length === 0 && <p className="empty-day">No events yet</p>}
                    {dayItems.map((item) => (
                      <SortableItem key={item.id} item={item} onEdit={() => setModal({ mode: 'edit', day, item })} />
                    ))}
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
    </div>
  )
}
