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

const ITIN_TYPE_CATEGORY = {
  flight: 'Flights',
  accommodation: 'Accommodation',
  activity: 'Activities',
  transport: 'Transport',
}

export default function Budget({ trip, session }) {
  const [expenses, setExpenses] = useState([])
  const [stays, setStays] = useState([])
  const [itinCosts, setItinCosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filterCat, setFilterCat] = useState('All')

  useEffect(() => {
    if (trip) fetchAll()
  }, [trip?.id])

  async function fetchAll() {
    setLoading(true)
    const [expRes, stayRes, itinRes] = await Promise.all([
      supabase.from('expenses').select('*').eq('trip_id', trip.id).order('date', { ascending: false }),
      supabase.from('accommodations').select('id, name, check_in_date, price').eq('trip_id', trip.id).not('price', 'is', null),
      supabase.from('itinerary_items').select('id, title, day_date, item_type, cost').eq('trip_id', trip.id).not('cost', 'is', null),
    ])
    setExpenses(expRes.data || [])
    setStays(stayRes.data || [])
    setItinCosts(itinRes.data || [])
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

  // Build unified rows from all three sources
  const stayRows = stays.map((s) => ({
    id: `stay-${s.id}`,
    source: 'stay',
    category: 'Accommodation',
    label: s.name,
    date: s.check_in_date,
    amount: parseFloat(s.price),
  }))

  const itinRows = itinCosts.map((i) => ({
    id: `itin-${i.id}`,
    source: 'itinerary',
    category: ITIN_TYPE_CATEGORY[i.item_type] || 'Misc',
    label: i.title,
    date: i.day_date,
    amount: parseFloat(i.cost),
  }))

  const expenseRows = expenses.map((e) => ({
    id: `exp-${e.id}`,
    source: 'expense',
    category: e.category,
    label: e.notes || e.category,
    date: e.date,
    amount: parseFloat(e.amount),
    raw: e,
  }))

  const allRows = [...stayRows, ...itinRows, ...expenseRows]
  const total = allRows.reduce((sum, r) => sum + r.amount, 0)
  const budget = parseFloat(trip.budget || 0)
  const remaining = budget - total
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0

  const byCategory = CATEGORIES.map((cat) => {
    const catTotal = allRows.filter((r) => r.category === cat).reduce((s, r) => s + r.amount, 0)
    return { cat, total: catTotal }
  }).filter((c) => c.total > 0)

  const filtered = filterCat === 'All' ? allRows : allRows.filter((r) => r.category === filterCat)
  const filteredSorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date))

  const SOURCE_BADGE = {
    stay: { label: 'Stay', bg: '#fef3c7', color: '#92400e' },
    itinerary: { label: 'Itinerary', bg: '#eff6ff', color: '#1d4ed8' },
    expense: { label: 'Expense', bg: '#f0fdf4', color: '#166534' },
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Budget — {trip.name}</h2>
        <button className="btn" onClick={() => setModal({ mode: 'add' })}>+ Add expense</button>
      </div>

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

      <div className="expense-list-header">
        <h3>All costs</h3>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <button className={`filter-btn ${filterCat === 'All' ? 'active' : ''}`} onClick={() => setFilterCat('All')}>All</button>
          {CATEGORIES.map((cat) => (
            <button key={cat} className={`filter-btn ${filterCat === cat ? 'active' : ''}`} onClick={() => setFilterCat(cat)}>{cat}</button>
          ))}
        </div>
      </div>

      {filteredSorted.length === 0 && <p className="muted" style={{ marginTop: '0.75rem' }}>No costs yet.</p>}

      <div className="expense-list">
        {filteredSorted.map((row) => {
          const badge = SOURCE_BADGE[row.source]
          return (
            <div
              key={row.id}
              className={`expense-row ${row.source === 'expense' ? 'clickable' : ''}`}
              onClick={() => row.source === 'expense' && setModal({ mode: 'edit', item: row.raw })}
            >
              <div className="expense-dot" style={{ background: CATEGORY_COLOURS[row.category] }} />
              <div className="expense-info">
                <span className="expense-cat">{row.category}</span>
                {row.label && row.label !== row.category && <span className="expense-notes">{row.label}</span>}
                <span className="expense-meta">
                  {row.date}
                  <span className="source-badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                </span>
              </div>
              <span className="expense-amount">${row.amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
            </div>
          )
        })}
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
