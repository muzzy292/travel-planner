import { useState } from 'react'

const TYPE_LABELS = {
  flight: '✈ Flight',
  accommodation: '🏨 Stay',
  activity: '🎯 Activity',
  transport: '🚌 Transport',
  other: '📌 Other',
}

export default function ParseConfirmationModal({ trip, onImport, onClose }) {
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [selected, setSelected] = useState([])

  async function handleParse() {
    if (!text.trim()) return
    setParsing(true)
    setError(null)
    setResults(null)

    try {
      const res = await fetch('/api/parse-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          tripStartDate: trip.start_date,
          tripEndDate: trip.end_date,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Parse failed')
      setResults(data.items || [])
      setSelected(data.items.map((_, i) => i))
    } catch (e) {
      setError(e.message)
    } finally {
      setParsing(false)
    }
  }

  function toggleSelect(i) {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    )
  }

  async function handleImport() {
    const toImport = results.filter((_, i) => selected.includes(i))
    await onImport(toImport)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Import from confirmation</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {!results ? (
          <>
            <p className="muted small" style={{ marginBottom: '0.75rem' }}>
              Paste a booking confirmation email or PDF text. Claude will extract stays and itinerary events.
            </p>
            <textarea
              className="parse-textarea"
              placeholder="Paste your confirmation text here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
            />
            {error && <p className="error" style={{ marginTop: '0.5rem' }}>{error}</p>}
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button className="btn" onClick={handleParse} disabled={parsing || !text.trim()}>
                {parsing ? 'Parsing…' : 'Extract events'}
              </button>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            {results.length === 0 ? (
              <p className="muted" style={{ margin: '1rem 0' }}>No events found. Try pasting more of the confirmation text.</p>
            ) : (
              <>
                <p className="muted small" style={{ marginBottom: '0.75rem' }}>
                  {results.length} event{results.length !== 1 ? 's' : ''} found. Stays will be added to Stays + Itinerary. Other events go to Itinerary only.
                </p>
                <div className="parse-results">
                  {results.map((item, i) => (
                    <label key={i} className={`parse-item ${selected.includes(i) ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selected.includes(i)}
                        onChange={() => toggleSelect(i)}
                      />
                      <div className="parse-item-body">
                        <div className="parse-item-top">
                          <span className="parse-type-badge">{TYPE_LABELS[item.item_type] || item.item_type}</span>
                          <span className="parse-item-date">
                            {item.day_date}{item.start_time ? ` · ${item.start_time}` : ''}
                            {item.item_type === 'accommodation' && item.check_out_date ? ` → ${item.check_out_date}` : ''}
                          </span>
                        </div>
                        <div className="parse-item-title">{item.title}</div>
                        {item.confirmation_number && (
                          <div className="parse-item-notes">Ref: {item.confirmation_number}</div>
                        )}
                        {item.notes && <div className="parse-item-notes">{item.notes}</div>}
                        {(item.address || item.location) && (
                          <div className="parse-item-location">📍 {item.address || item.location}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              {results.length > 0 && (
                <button className="btn" onClick={handleImport} disabled={selected.length === 0}>
                  Import {selected.length} event{selected.length !== 1 ? 's' : ''}
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => { setResults(null); setError(null) }}>
                ← Back
              </button>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
