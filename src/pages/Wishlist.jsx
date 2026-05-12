export default function Wishlist({ trip }) {
  if (!trip) return <div className="page"><p>No active trip.</p></div>
  return (
    <div className="page">
      <h2>Wishlist — {trip.name}</h2>
      <p className="coming-soon">Ideas board coming in the next step.</p>
    </div>
  )
}
