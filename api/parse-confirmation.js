export const config = { runtime: 'edge' }

const SYSTEM_PROMPT = `You are a travel confirmation parser. Extract all events from travel confirmation emails or booking text.

Return a JSON array of items. Each item must have:
- title: string (concise name, e.g. "Flight SQ211 Sydney → Singapore", "Sofitel Hanoi", "Hoi An day tour")
- day_date: string (YYYY-MM-DD — event date, not booking date)
- start_time: string or null (HH:MM 24-hour)
- item_type: one of "flight", "accommodation", "activity", "transport", "other"
- notes: string or null (key details: flight number, duration, included meals, etc.)
- location: string or null (airport code + city, hotel name + city, or venue)

For accommodation items, also include these extra fields:
- check_out_date: string (YYYY-MM-DD check-out date)
- check_out_time: string or null (HH:MM check-out time if mentioned)
- confirmation_number: string or null (booking/confirmation reference)
- address: string or null (full property address if mentioned)

Rules:
- Extract ALL distinct events (outbound + return flights = 2 items; one accommodation item per property stay)
- For accommodation: day_date = check-in date, start_time = check-in time
- For flights: day_date = departure date, start_time = departure time (local)
- If year is not mentioned, infer from trip date range
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
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      items = JSON.parse(cleaned)
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
