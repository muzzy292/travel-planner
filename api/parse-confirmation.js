export const config = { runtime: 'edge' }

const SYSTEM_PROMPT = `You are a travel confirmation parser. Extract itinerary items from travel confirmation emails or booking text.

Return a JSON array of items. Each item must have:
- title: string (concise event name, e.g. "Flight SQ211 Sydney → Singapore", "Check-in Sofitel Hanoi", "Hoi An day tour")
- day_date: string (YYYY-MM-DD format — use the date of the event, not booking date)
- start_time: string or null (HH:MM 24-hour format if a time is mentioned, else null)
- item_type: one of "flight", "accommodation", "activity", "transport", "other"
- notes: string or null (key details: flight number, confirmation code, address, duration, included meals, check-in/out times etc.)
- location: string or null (airport, hotel name and city, or venue)

Rules:
- Extract ALL distinct events from the text (e.g. outbound + return flights = 2 items, check-in + check-out = 1 accommodation item)
- For accommodation, use check-in date as day_date
- For flights, use departure date and time (local departure)
- If a year is not mentioned and the dates seem future, use the current or next calendar year as appropriate
- Return ONLY a valid JSON array, no markdown, no explanation`

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const { text, tripStartDate, tripEndDate } = body
  if (!text?.trim()) {
    return new Response(JSON.stringify({ error: 'No text provided' }), { status: 400 })
  }

  const userPrompt = `Trip date range: ${tripStartDate} to ${tripEndDate}

Confirmation text:
${text.slice(0, 8000)}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: `Claude API error: ${response.status}`, detail: err }), { status: 502 })
    }

    const data = await response.json()
    const raw = data.content?.[0]?.text?.trim() || '[]'

    let items
    try {
      items = JSON.parse(raw)
    } catch {
      return new Response(JSON.stringify({ error: 'Could not parse Claude response', raw }), { status: 502 })
    }

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
