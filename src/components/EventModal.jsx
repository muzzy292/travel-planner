import { useState } from 'react'

const EMPTY = { title: '', start_time: '', location: '', notes: '', status: 'tentative' }

export default function EventModal({ mode, day, item, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(mode === 'edit' ? {
    title: item.title,
    start_time: item.start_time || '',
    location: item.location || '',
    notes: item.notes || '',
    status: item.status,
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const label = new Date(day + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...form, start_time: form.start_time || null, location: form.location || null, notes: form.notes || null })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add event' : 'Edit event'}</h3>
          <span className="modal-date">{label}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <label>
            Title
            <input name="title" value={form.title} onChange={onChange} required autoFocus placeholder="e.g. Shinjuku walking tour" />
          </label>
          <label>
            Time (optional)
            <input type="time" name="start_time" value={form.start_time} onChange={onChange} />
          </label>
          <label>
            Location (optional)
            <input name="location" value={form.location} onChange={onChange} placeholder="e.g. Shinjuku Station East Exit" />
          </label>
          <label>
            Notes (optional)
            <textarea name="notes" value={form.notes} onChange={onChange} rows={3} placeholder="Any details…" />
          </label>
          <label>
            Status
            <select name="status" value={form.status} onChange={onChange}>
              <option value="tentative">Tentative</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </label>
          <div className="modal-actions">
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            {mode === 'edit' && !confirmDelete && (
              <button className="btn btn-danger" type="button" onClick={() => setConfirmDelete(true)}>Delete</button>
            )}
            {confirmDelete && (
              <button className="btn btn-danger" type="button" onClick={() => onDelete(item.id)}>Confirm delete</button>
            )}
            <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
