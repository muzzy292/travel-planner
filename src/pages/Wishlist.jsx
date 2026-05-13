import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import WishlistModal from '../components/WishlistModal'
import PromoteModal from '../components/PromoteModal'
import PlacesDiscover from '../components/PlacesDiscover'

const CATEGORIES = ['Activities', 'Restaurants', 'Sights', 'Shopping', 'Accommodation', 'Transport', 'Other']

export default function Wishlist({ trip, session }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [modal, setModal] = useState(null)
  const [promoteItem, setPromoteItem] = useState(null)
  const [showDiscover, setShowDiscover] = useState(false)

  useEffect(() => {
    if (trip) fetchItems()
  }, [trip?.id])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function saveItem(payload) {
    if (modal.mode === 'add') {
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert({ ...payload, trip_id: trip.id, added_by: session?.user?.email })
        .select()
        .single()
      if (!error) setItems((prev) => [data, ...prev])
    } else {
      const { data, error } = await supabase
        .from('wishlist_items')
        .update(payload)
        .eq('id', modal.item.id)
        .select()
        .single()
      if (!error) setItems((prev) => prev.map((i) => (i.id === modal.item.id ? data : i)))
    }
    setModal(null)
  }

  async function deleteItem(id) {
    await supabase.from('wishlist_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setModal(null)
  }

  async function toggleFavourite(item) {
    const { data } = await supabase
      .from('wishlist_items')
      .update({ is_favourite: !item.is_favourite })
      .eq('id', item.id)
      .select()
      .single()
    if (data) setItems((prev) => prev.map((i) => (i.id === item.id ? data : i)))
  }

  async function promoteToItinerary(itemId, day) {
    const { data: itinItem } = await supabase
      .from('itinerary_items')
      .insert({ trip_id: trip.id, day_date: day, title: promoteItem.title, notes: promoteItem.notes, status: 'tentative', order_index: 0 })
      .select()
      .single()
    if (itinItem) {
      const { data } = await supabase
        .from('wishlist_items')
        .update({ promoted_to_itinerary_id: itinItem.id })
        .eq('id', itemId)
        .select()
        .single()
      if (data) setItems((prev) => prev.map((i) => (i.id === itemId ? data : i)))
    }
    setPromoteItem(null)
  }

  if (!trip) return <div className="page"><p>No active trip.</p></div>
  if (loading) return <div className="page"><p>Loading…</p></div>

  const categories = ['All', ...CATEGORIES]
  const filtered = filter === 'All' ? items : items.filter((i) => i.category === filter)
  const favourites = filtered.filter((i) => i.is_favourite)
  const rest = filtered.filter((i) => !i.is_favourite)
  const displayed = [...favourites, ...rest]

  return (
    <div className="page">
      <div className="page-header">
        <h2>Wishlist — {trip.name}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowDiscover((v) => !v)}>
            {showDiscover ? 'Hide discover' : '🔍 Discover ideas'}
          </button>
          <button className="btn" onClick={() => setModal({ mode: 'add' })}>+ Add idea</button>
        </div>
      </div>

      {showDiscover && (
        <PlacesDiscover
          destination={trip.destination}
          onAddToWishlist={async (payload) => {
            const { data, error } = await supabase
              .from('wishlist_items')
              .insert({ ...payload, trip_id: trip.id, added_by: session?.user?.email })
              .select()
              .single()
            if (!error) setItems((prev) => [data, ...prev])
          }}
        />
      )}

      <div className="filter-bar">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${filter === cat ? 'active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {displayed.length === 0 && (
        <p className="muted" style={{ marginTop: '1rem' }}>No ideas yet{filter !== 'All' ? ` in ${filter}` : ''}. Add one!</p>
      )}

      <div className="wishlist-grid">
        {displayed.map((item) => (
          <div key={item.id} className={`wishlist-card ${item.is_favourite ? 'favourite' : ''} ${item.promoted_to_itinerary_id ? 'promoted' : ''}`}>
            <div className="wishlist-card-header">
              <span className="wishlist-category">{item.category}</span>
              <button
                className={`fav-btn ${item.is_favourite ? 'active' : ''}`}
                onClick={() => toggleFavourite(item)}
                title={item.is_favourite ? 'Remove favourite' : 'Favourite'}
              >★</button>
            </div>
            <div className="wishlist-title" onClick={() => setModal({ mode: 'edit', item })}>{item.title}</div>
            {item.notes && <div className="wishlist-notes">{item.notes}</div>}
            {item.url && <a className="wishlist-url" href={item.url} target="_blank" rel="noreferrer">View link</a>}
            <div className="wishlist-footer">
              <span className="wishlist-added-by">{item.added_by?.split('@')[0]}</span>
              {item.promoted_to_itinerary_id
                ? <span className="promoted-badge">Added to itinerary</span>
                : <button className="btn-promote" onClick={() => setPromoteItem(item)}>→ Add to itinerary</button>
              }
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <WishlistModal
          mode={modal.mode}
          item={modal.item}
          categories={CATEGORIES}
          onSave={saveItem}
          onDelete={deleteItem}
          onClose={() => setModal(null)}
        />
      )}

      {promoteItem && (
        <PromoteModal
          item={promoteItem}
          trip={trip}
          onPromote={promoteToItinerary}
          onClose={() => setPromoteItem(null)}
        />
      )}
    </div>
  )
}
