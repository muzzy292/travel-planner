import { useState } from 'react'
import { requestCalendarToken } from '../lib/google'
import { supabase } from '../lib/supabase'

export function useCalendar() {
  const [accessToken, setAccessToken] = useState(null)
  const [connected, setConnected] = useState(false)

  function connect() {
    requestCalendarToken((tokenResponse) => {
      if (tokenResponse.access_token) {
        setAccessToken(tokenResponse.access_token)
        setConnected(true)
      }
    })
  }

  async function pushEvent(tripId, itemType, itemId, eventPayload) {
    if (!accessToken) throw new Error('Not connected to Google Calendar')

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?key=${import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      }
    )
    const googleEvent = await res.json()
    if (!res.ok) throw new Error(googleEvent.error?.message || 'Calendar push failed')

    await supabase.from('calendar_events').insert({
      trip_id: tripId,
      google_event_id: googleEvent.id,
      item_type: itemType,
      item_id: itemId,
    })

    return googleEvent
  }

  async function deleteEvent(googleEventId, calendarEventId) {
    if (!accessToken) throw new Error('Not connected to Google Calendar')

    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
    )

    await supabase.from('calendar_events').delete().eq('id', calendarEventId)
  }

  return { connected, connect, pushEvent, deleteEvent }
}
