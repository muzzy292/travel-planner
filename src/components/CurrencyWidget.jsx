import { useEffect, useState } from 'react'

const DEST_CURRENCY = {
  vietnam: { code: 'vnd', display: 'VND', flag: '🇻🇳' },
  japan: { code: 'jpy', display: 'JPY', flag: '🇯🇵' },
  thailand: { code: 'thb', display: 'THB', flag: '🇹🇭' },
  indonesia: { code: 'idr', display: 'IDR', flag: '🇮🇩' },
  bali: { code: 'idr', display: 'IDR', flag: '🇮🇩' },
  singapore: { code: 'sgd', display: 'SGD', flag: '🇸🇬' },
  'hong kong': { code: 'hkd', display: 'HKD', flag: '🇭🇰' },
  cambodia: { code: 'usd', display: 'USD', flag: '🇰🇭' },
  laos: { code: 'lak', display: 'LAK', flag: '🇱🇦' },
  malaysia: { code: 'myr', display: 'MYR', flag: '🇲🇾' },
  'new zealand': { code: 'nzd', display: 'NZD', flag: '🇳🇿' },
  uk: { code: 'gbp', display: 'GBP', flag: '🇬🇧' },
  england: { code: 'gbp', display: 'GBP', flag: '🇬🇧' },
  france: { code: 'eur', display: 'EUR', flag: '🇫🇷' },
  europe: { code: 'eur', display: 'EUR', flag: '🇪🇺' },
  italy: { code: 'eur', display: 'EUR', flag: '🇮🇹' },
  germany: { code: 'eur', display: 'EUR', flag: '🇩🇪' },
  spain: { code: 'eur', display: 'EUR', flag: '🇪🇸' },
  greece: { code: 'eur', display: 'EUR', flag: '🇬🇷' },
  usa: { code: 'usd', display: 'USD', flag: '🇺🇸' },
  'united states': { code: 'usd', display: 'USD', flag: '🇺🇸' },
  india: { code: 'inr', display: 'INR', flag: '🇮🇳' },
  korea: { code: 'krw', display: 'KRW', flag: '🇰🇷' },
  china: { code: 'cny', display: 'CNY', flag: '🇨🇳' },
  dubai: { code: 'aed', display: 'AED', flag: '🇦🇪' },
  uae: { code: 'aed', display: 'AED', flag: '🇦🇪' },
  mexico: { code: 'mxn', display: 'MXN', flag: '🇲🇽' },
}

function detectCurrency(destination) {
  if (!destination) return null
  const lower = destination.toLowerCase()
  for (const [key, val] of Object.entries(DEST_CURRENCY)) {
    if (lower.includes(key)) return val
  }
  return null
}

function fmt(n) {
  if (n >= 1000) return Math.round(n).toLocaleString('en-AU')
  if (n >= 10) return n.toFixed(2)
  return n.toFixed(4)
}

const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

export default function CurrencyWidget({ destination }) {
  const [rate, setRate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState(null)
  const currency = detectCurrency(destination)

  useEffect(() => {
    if (!currency) { setLoading(false); return }
    fetchRate()
  }, [destination])

  async function fetchRate() {
    setLoading(true)
    const cacheKey = `fx_aud_${currency.code}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { r, ts, date } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL) { setRate(r); setUpdatedAt(date); setLoading(false); return }
      }
    } catch {}

    try {
      const res = await fetch(
        'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aud.json'
      )
      const data = await res.json()
      const r = data.aud?.[currency.code]
      if (r) {
        try { localStorage.setItem(cacheKey, JSON.stringify({ r, ts: Date.now(), date: data.date })) } catch {}
        setRate(r)
        setUpdatedAt(data.date)
      }
    } catch {}
    setLoading(false)
  }

  if (!currency) return null

  return (
    <div className="db-section">
      <div className="db-section-header">
        <h3>💱 Currency</h3>
        {updatedAt && <span className="muted small">Updated {updatedAt}</span>}
      </div>
      {loading && <p className="muted small">Loading…</p>}
      {rate && (
        <div className="db-currency">
          <div className="db-currency-flag">{currency.flag}</div>
          <div className="db-currency-rates">
            <div className="db-currency-main-rate">
              1 AUD = <strong>{fmt(rate)} {currency.display}</strong>
            </div>
            <div className="db-currency-refs">
              <span>$10 → {fmt(rate * 10)}</span>
              <span>$50 → {fmt(rate * 50)}</span>
              <span>$100 → {fmt(rate * 100)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
