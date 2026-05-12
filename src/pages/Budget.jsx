export default function Budget({ trip }) {
  if (!trip) return <div className="page"><p>No active trip.</p></div>
  return (
    <div className="page">
      <h2>Budget — {trip.name}</h2>
      <p className="coming-soon">Expense tracker coming in the next step.</p>
    </div>
  )
}
