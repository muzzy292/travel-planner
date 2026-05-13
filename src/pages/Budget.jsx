import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ExpenseModal from '../components/ExpenseModal'

const CATEGORIES = ['Flights', 'Accommodation', 'Food & Drink', 'Activities', 'Transport', 'Shopping', 'Misc']

const CATEGORY_COLOURS = {
  'Flights': '#6366f1',
  'Accommodation': '#f59e0b',
  'Food & Drink': '#22c55e',
  'Activities': '#3b82f6',
  'Transport': '#f97316',
  'Shopping': '#ec4899',
  'Misc': '#94a3b8',
}

export default function Budget({ trip, session }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filterCat, setFilterCat] = useState('All')

  useEffect(() => {
    if (trip) fetchExpenses()
  }, [trip?.id])

  async function fetchExpenses() {
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', trip.id)
      .order('date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  async function saveExpense(payload) {
    if (modal.mode === 'add') {
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...payload, trip_id: trip.id, paid_by: session?.user?.email })
        .select()
        .single()
      if (!error) setExpenses((prev) => [data, ...prev])
    } else {
      const { data, error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', modal.item.id)
        .select()
        .single()
      if (!error) setExpenses((prev) => prev.map((e) => (e.id === modal.item.id ? data : e)))
    }
    setModal(null)
  }

  async function deleteExpense(id) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    setModal(null)
  }

  if (!trip) return <div className="page"><p>No active trip.</p></div>
  if (loading) return <div className="page"><p>Loading…</p></div>

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const budget = parseFloat(trip.budget || 0)
  const remaining = budget - total
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0

  const byCategory = CATEGORIES.map((cat) => {
    const catTotal = expenses.filter((e) => e.category === cat).reduce((s, e) => s + parseFloat(e.amount), 0)
    return { cat, total: catTotal }
  }).filter((c) => c.total > 0)

  const filtered = filterCat === 'All' ? expenses : expenses.filter((e) => e.category === filterCat)

  return (
    <div className="page">
      <div className="page-header">
        <h2>Budget — {trip.name}</h2>
        <button className="btn" onClick={() => setModal({ mode: 'add' })}>+ Add expense</button>
      </div>

      {/* Summary */}
      <div className="budget-summary">
        <div className="budget-totals">
          <div className="card">
            <span className="label">Total budget</span>
            <span className="budget-amount">${budget.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="card">
            <span className="label">Spent</span>
            <span className="budget-amount spent">${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="card">
            <span className="label">Remaining</span>
            <span className={`budget-amount ${remaining < 0 ? 'over' : 'remaining'}`}>
              ${Math.abs(remaining).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              {remaining < 0 && ' over'}
            </span>
          </div>
        </div>

        {budget > 0 && (
          <div className="progress-bar-wrap">
            <div className="progress-bar">
              <div
                className={`progress-fill ${pct >= 100 ? 'over-budget' : pct >= 80 ? 'warning' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="progress-label">{pct.toFixed(0)}% of budget used</span>
          </div>
        )}

        {/* Category breakdown */}
        {byCategory.length > 0 && (
          <div className="category-breakdown">
            <h3>By category</h3>
            <div className="category-bars">
              {byCategory.map(({ cat, total: catTotal }) => (
                <div key={cat} className="category-row">
                  <span className="cat-label">{cat}</span>
                  <div className="cat-bar-wrap">
                    <div
                      className="cat-bar-fill"
                      style={{ width: total > 0 ? `${(catTotal / total) * 100}%` : '0%', background: CATEGORY_COLOURS[cat] }}
                    />
                  </div>
                  <span className="cat-amount">${catTotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expense list */}
      <div className="expense-list-header">
        <h3>Expenses</h3>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <button className={`filter-btn ${filterCat === 'All' ? 'active' : ''}`} onClick={() => setFilterCat('All')}>All</button>
          {CATEGORIES.map((cat) => (
            <button key={cat} className={`filter-btn ${filterCat === cat ? 'active' : ''}`} onClick={() => setFilterCat(cat)}>{cat}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && <p className="muted" style={{ marginTop: '0.75rem' }}>No expenses yet.</p>}

      <div className="expense-list">
        {filtered.map((exp) => (
          <div key={exp.id} className="expense-row" onClick={() => setModal({ mode: 'edit', item: exp })}>
            <div className="expense-dot" style={{ background: CATEGORY_COLOURS[exp.category] }} />
            <div className="expense-info">
              <span className="expense-cat">{exp.category}</span>
              {exp.notes && <span className="expense-notes">{exp.notes}</span>}
              <span className="expense-meta">{exp.date} · {exp.paid_by?.split('@')[0]}</span>
            </div>
            <span className="expense-amount">${parseFloat(exp.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>

      {modal && (
        <ExpenseModal
          mode={modal.mode}
          item={modal.item}
          categories={CATEGORIES}
          onSave={saveExpense}
          onDelete={deleteExpense}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
