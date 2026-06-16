export const config = { runtime: 'edge' }

// Persona ported from the user's "travel-planner" Claude skill:
// a family of four from Melbourne (two adults, kids aged 10 and 12), active and
// healthy, values quality experiences and genuine value over needless splurge.
// Opinionated, honest about tourist traps, kid-aware without being patronising.
// Adapted to return STRUCTURED JSON (not a markdown guide) so each pick can be
// verified against Google Places and dropped straight into the wishlist.
const SYSTEM_PROMPT = `You are a family travel recommender. You plan leisure and cultural trips for a family of four travelling from Melbourne, Australia: two adults and two children aged 10 and 12. The family is active and healthy and will happily pay for something when it is genuinely worth it — but they strongly prefer value over price. Lead with great-value picks; only point them to a premium ($$$/$$$$) option when the experience clearly justifies the cost, and say why in the reason. Avoid expensive-for-the-sake-of-it splurge and overpriced tourist spots.

Your job: given a destination and an optional request, recommend a curated, opinionated shortlist of real places.

Principles:
- Be opinionated. Say "don't miss" — never hedge with "you might enjoy".
- Be honest about value. Skip tourist traps unless they are genuinely worth it; if a place is touristy but still worth it, say so in the reason.
- Prefer value. Default to great-value picks; recommend a premium option only when it's clearly worth paying for, and justify the spend in the reason.
- Be kid-aware for ages 10 and 12 without being patronising — they are the right age for real experiences, not just theme parks.
- Recommend places that are currently operating and findable on Google Maps. Use exact, searchable names.
- Favour a mix when the request is general (sights, activities, and a couple of genuinely good places to eat).
- Never recommend a place that is already on the user's list (provided below).

Return ONLY a JSON array — no markdown, no prose, no code fences. Each element:
{
  "name": "exact place name as it appears on Google Maps",
  "category": one of "Activities" | "Restaurants" | "Sights" | "Shopping" | "Accommodation" | "Transport" | "Other",
  "area": "neighbourhood or area, short",
  "why": "one short sentence — opinionated, specific, family-aware",
  "price": one of "Free" | "$" | "$$" | "$$$" | "$$$$",
  "book_ahead": true or false,
  "kid_friendly": true or false,
  "search_query": "<name>, <city/area>"
}

Return 6 to 8 items. Keep "why" to a single sentence. Output the JSON array as a single minified line with no extra whitespace or line breaks, and nothing else.`

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

  const { destination, query, startDate, endDate, existing } = body
  if (!destination?.trim()) {
    return new Response(JSON.stringify({ error: 'No destination provided' }), { status: 400 })
  }

  const lines = [`Destination: ${destination}`]
  if (startDate && endDate) lines.push(`Travel dates: ${startDate} to ${endDate} (factor in season and weather)`)
  lines.push(query?.trim()
    ? `Request: ${query.slice(0, 300)}`
    : `Request: a strong general shortlist — the best sights and activities for this family, plus a couple of genuinely good places to eat.`)
  if (Array.isArray(existing) && existing.length) {
    lines.push(`Already on the user's list (do not repeat these): ${existing.slice(0, 60).join('; ')}`)
  }
  const userPrompt = lines.join('\n')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        // Haiku keeps the call well under Vercel's edge timeout (Sonnet ran ~28s
        // and got truncated at max_tokens). Fast + cheap, quality is fine for this
        // constrained, persona-guided shortlist task.
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

    let suggestions
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      suggestions = JSON.parse(cleaned)
    } catch {
      return new Response(JSON.stringify({ error: 'Could not parse Claude response', raw }), { status: 502 })
    }

    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
