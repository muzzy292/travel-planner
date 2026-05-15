import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const TYPE_ICONS = { flight: '✈', accommodation: '🏨', activity: '🎯', transport: '🚌', restaurant: '🍽️', other: '📌' }

export default function SortableItem({ item, onEdit, onCalendarSync, onCalendarDelete, onAddToStays, calendarConnected }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isSynced = !!item.calendar_event_id
  const canSync = item.item_type === 'flight' || item.item_type === 'accommodation'
  const isAccommodation = item.item_type === 'accommodation'

  return (
    <div ref={setNodeRef} style={style} className={`event-item ${item.status}`}>
      <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      <div className="event-body" onClick={onEdit}>
        <div className="event-title">
          {item.start_time && <span className="event-time">{item.start_time.slice(0, 5)}</span>}
          <span>{item.title}</span>
          {item.item_type && <span className="type-badge">{TYPE_ICONS[item.item_type] || '📌'}</span>}
          <span className={`status-badge ${item.status}`}>{item.status}</span>
        </div>
        {item.location && <div className="event-location">📍 {item.location}</div>}
        {item.notes && <div className="event-notes">{item.notes}</div>}
        <div className="event-meta-row">
          {item.cost != null && (
            <span className="event-cost">${parseFloat(item.cost).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
          )}
          {item.travelTime && (
            <span className="travel-time-badge">🚶 {item.travelTime}</span>
          )}
        </div>
      </div>
      <div className="item-actions" onClick={(e) => e.stopPropagation()}>
        {canSync && (
          isSynced ? (
            <button className="cal-btn synced" onClick={onCalendarDelete} title="Remove from Google Calendar">🗓 Synced</button>
          ) : (
            <button
              className="cal-btn"
              onClick={onCalendarSync}
              disabled={!calendarConnected}
              title={calendarConnected ? 'Add to Google Calendar' : 'Connect Google Calendar in Settings first'}
            >🗓 Sync</button>
          )
        )}
        {isAccommodation && (
          <button className="item-link-btn" onClick={onAddToStays} title="Add to Stays">🏨 Add stay</button>
        )}
      </div>
    </div>
  )
}
