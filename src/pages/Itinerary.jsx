export default function Itinerary({ trip }) {
  if (!trip) return <div className="page"><p>No active trip.</p></div>
  return (
    <div className="page">
      <h2>Itinerary — {trip.name}</h2>
      <p className="coming-soon">Day-by-day planner coming in the next step.</p>
    </div>
  )
}
