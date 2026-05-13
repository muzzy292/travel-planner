import { useState } from 'react'

const today = new Date().toISOString().slice(0, 10)
const EMPTY = { amount: '', category: 'Food & Drink', date: today, notes: '' }

export default function ExpenseModal({ mode, item, categories, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(mode === 'edit' ? {
    amount: item.amount,
    category: item.category,
    date: item.date,
    notes: item.notes || '',
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...form, amount: parseFloat(form.amount), notes: form.notes || null })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? 'Add expense' : 'Edit expense'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <label>
            Amount (AUD)
            <input type="number" name="amount" value={form.amount} onChange={onChange} required autoFocus min="0" step="0.01" placeholder="0.00" />
          </label>
          <label>
            Category
            <select name="category" value={form.category} onChange={onChange}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Date
            <input type="date" name="date" value={form.date} onChange={onChange} required />
          </label>
          <label>
            Notes (optional)
            <input name="notes" value={form.notes} onChange={onChange} placeholder="e.g. Dinner at Ichiran" />
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
