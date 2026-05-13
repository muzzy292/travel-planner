import { useState } from 'react'

const EMPTY = { title: '', category: 'Activities', notes: '', url: '' }

export default function WishlistModal({ mode, item, categories, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(mode === 'edit' ? {
    title: item.title,
    category: item.category || 'Activities',
    notes: item.notes || '',
    url: item.url || '',
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...form, url: form.url || null, notes: form.notes || null })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add idea' : 'Edit idea'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <label>
            Title
            <input name="title" value={form.title} onChange={onChange} required autoFocus placeholder="e.g. Ramen at Ichiran" />
          </label>
          <label>
            Category
            <select name="category" value={form.category} onChange={onChange}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Notes (optional)
            <textarea name="notes" value={form.notes} onChange={onChange} rows={3} placeholder="Any details…" />
          </label>
          <label>
            Link (optional)
            <input name="url" value={form.url} onChange={onChange} placeholder="https://…" type="url" />
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
