import { useState, useRef } from 'react'

const TYPE_LABELS = {
  flight: '✈ Flight',
  accommodation: '🏨 Stay',
  activity: '🎯 Activity',
  transport: '🚌 Transport',
  other: '📌 Other',
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ParseConfirmationModal({ trip, onImport, onClose }) {
  const [text, setText] = useState('')
  const [images, setImages] = useState([]) // [{base64, mediaType, name, preview}]
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [selected, setSelected] = useState([])
  const fileRef = useRef(null)

  async function handleFiles(files) {
    const valid = Array.from(files).filter((f) => ACCEPTED_TYPES.includes(f.type))
    if (valid.length !== files.length) setError('Only JPEG, PNG, WEBP and GIF images are supported.')
    const newImages = await Promise.all(
      valid.map(async (f) => ({
        base64: await fileToBase64(f),
        mediaType: f.type,
        name: f.name,
        preview: URL.createObjectURL(f),
      }))
    )
    setImages((prev) => [...prev, ...newImages])
  }

  function removeImage(i) {
    setImages((prev) => prev.filter((_, idx) => idx !== i))
  }

  function onDrop(e) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  async function handleParse() {
    if (!text.trim() && images.length === 0) return
    setParsing(true)
    setError(null)
    setResults(null)

    try {
      const res = await fetch('/api/parse-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          images: images.map((img) => ({ base64: img.base64, mediaType: img.mediaType })),
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

  const canParse = text.trim() || images.length > 0

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
              Upload a photo or screenshot of your confirmation, paste the text, or both.
            </p>

            {/* Image upload */}
            <div
              className={`image-drop-zone ${images.length > 0 ? 'has-images' : ''}`}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              {images.length === 0 ? (
                <span className="muted small">📎 Drop images here or click to upload</span>
              ) : (
                <div className="image-previews">
                  {images.map((img, i) => (
                    <div key={i} className="image-preview-item">
                      <img src={img.preview} alt={img.name} />
                      <button
                        className="image-remove"
                        onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                        title="Remove"
                      >×</button>
                    </div>
                  ))}
                  <div className="image-add-more">+ Add more</div>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />

            <div style={{ margin: '0.75rem 0', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>— or paste text —</div>

            <textarea
              className="parse-textarea"
              placeholder="Paste confirmation text here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
            />

            {error && <p className="error" style={{ marginTop: '0.5rem' }}>{error}</p>}
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button className="btn" onClick={handleParse} disabled={parsing || !canParse}>
                {parsing ? 'Extracting…' : 'Extract events'}
              </button>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            {results.length === 0 ? (
              <p className="muted" style={{ margin: '1rem 0' }}>No events found. Try a clearer image or paste the text instead.</p>
            ) : (
              <>
                <p className="muted small" style={{ marginBottom: '0.75rem' }}>
                  {results.length} event{results.length !== 1 ? 's' : ''} found. Stays → Stays + Itinerary. Other events → Itinerary only.
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
