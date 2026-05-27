// Proxy for Frankfurter historical exchange rates — avoids browser CORS block
export default async function handler(req, res) {
  const to = (req.query.to || 'USD').toUpperCase().slice(0, 5)

  const end   = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 30)
  const fmt = d => d.toISOString().slice(0, 10)

  try {
    const upstream = await fetch(
      `https://api.frankfurter.app/${fmt(start)}..${fmt(end)}?from=AUD&to=${to}`
    )
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'Upstream error' })
      return
    }
    const data = await upstream.json()
    // Cache at Vercel edge for 1 hour, serve stale for up to 4 hours
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=14400')
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch rate history' })
  }
}
