import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useTrip() {
  const [trips, setTrips] = useState([])
  const [activeTrip, setActiveTrip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrips()
  }, [])

  async function fetchTrips() {
    setLoading(true)
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('start_date', { ascending: true })
    if (!error) {
      setTrips(data)
      if (data.length > 0) setActiveTrip(data[0])
    }
    setLoading(false)
  }

  async function createTrip(trip) {
    const { data, error } = await supabase.from('trips').insert(trip).select().single()
    if (!error) {
      setTrips((prev) => [...prev, data])
      setActiveTrip(data)
    }
    return { data, error }
  }

  async function updateTrip(id, updates) {
    const { data, error } = await supabase.from('trips').update(updates).eq('id', id).select().single()
    if (!error) {
      setTrips((prev) => prev.map((t) => (t.id === id ? data : t)))
      if (activeTrip?.id === id) setActiveTrip(data)
    }
    return { data, error }
  }

  return { trips, activeTrip, setActiveTrip, loading, createTrip, updateTrip, refetch: fetchTrips }
}
