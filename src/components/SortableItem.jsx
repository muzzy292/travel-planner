import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SortableItem({ item, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`event-item ${item.status}`}>
      <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      <div className="event-body" onClick={onEdit}>
        <div className="event-title">
          {item.start_time && <span className="event-time">{item.start_time.slice(0, 5)}</span>}
          <span>{item.title}</span>
          <span className={`status-badge ${item.status}`}>{item.status}</span>
        </div>
        {item.location && <div className="event-location">📍 {item.location}</div>}
        {item.notes && <div className="event-notes">{item.notes}</div>}
      </div>
    </div>
  )
}
