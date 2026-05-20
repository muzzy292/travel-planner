// Exchange rate helpers — uses open.er-api.com (free, no key required)

const DEST_CURRENCY_MAP = [
  { words: ['vietnam', 'ho chi minh', 'hanoi', 'hoi an', 'da nang', 'saigon', 'phu quoc', 'hue', 'nha trang'], code: 'VND' },
  { words: ['thailand', 'bangkok', 'phuket', 'chiang mai', 'koh samui', 'koh phangan', 'pattaya'], code: 'THB' },
  { words: ['japan', 'tokyo', 'osaka', 'kyoto', 'hiroshima', 'sapporo', 'nara', 'fukuoka'], code: 'JPY' },
  { words: ['indonesia', 'bali', 'jakarta', 'lombok', 'yogyakarta', 'komodo'], code: 'IDR' },
  { words: ['singapore'], code: 'SGD' },
  { words: ['cambodia', 'phnom penh', 'siem reap', 'angkor'], code: 'KHR' },
  { words: ['malaysia', 'kuala lumpur', ' kl ', 'penang', 'langkawi', 'borneo', 'sabah'], code: 'MYR' },
  { words: ['philippines', 'manila', 'cebu', 'boracay', 'palawan', 'el nido'], code: 'PHP' },
  { words: ['india', 'mumbai', 'delhi', 'goa', 'jaipur', 'rajasthan', 'agra', 'kerala'], code: 'INR' },
  { words: ['nepal', 'kathmandu', 'pokhara'], code: 'NPR' },
  { words: ['sri lanka', 'colombo', 'kandy'], code: 'LKR' },
  { words: ['dubai', 'uae', 'abu dhabi', 'emirates'], code: 'AED' },
  { words: ['hong kong'], code: 'HKD' },
  { words: ['china', 'beijing', 'shanghai', 'chengdu', 'guilin', 'xian'], code: 'CNY' },
  { words: ['south korea', 'korea', 'seoul', 'busan', 'jeju'], code: 'KRW' },
  { words: ['taiwan', 'taipei', 'taichung'], code: 'TWD' },
  { words: ['europe', 'france', 'paris', 'italy', 'rome', 'florence', 'venice', 'spain', 'madrid', 'barcelona', 'germany', 'berlin', 'amsterdam', 'netherlands', 'portugal', 'lisbon', 'greece', 'athens', 'santorini', 'croatia', 'dubrovnik', 'austria', 'vienna', 'prague', 'czech', 'belgium', 'brussels'], code: 'EUR' },
  { words: ['switzerland', 'zurich', 'geneva', 'bern', 'interlaken'], code: 'CHF' },
  { words: ['uk', 'united kingdom', 'england', 'london', 'scotland', 'ireland', 'edinburgh', 'manchester'], code: 'GBP' },
  { words: ['usa', 'united states', 'new york', 'los angeles', 'miami', 'hawaii', 'las vegas', 'san francisco', 'chicago', 'boston'], code: 'USD' },
  { words: ['canada', 'toronto', 'vancouver', 'montreal', 'banff'], code: 'CAD' },
  { words: ['new zealand', 'auckland', 'queenstown', 'christchurch', 'wellington'], code: 'NZD' },
  { words: ['mexico', 'cancun', 'mexico city', 'playa del carmen', 'cabo', 'oaxaca', 'tulum'], code: 'MXN' },
  { words: ['peru', 'lima', 'cusco', 'machu picchu'], code: 'PEN' },
  { words: ['brazil', 'rio', 'sao paulo', 'salvador'], code: 'BRL' },
  { words: ['south africa', 'cape town', 'johannesburg', 'safari'], code: 'ZAR' },
  { words: ['turkey', 'istanbul', 'cappadocia', 'ankara'], code: 'TRY' },
  { words: ['egypt', 'cairo', 'luxor', 'sharm'], code: 'EGP' },
  { words: ['morocco', 'marrakech', 'casablanca', 'fez'], code: 'MAD' },
]

export function guessCurrency(destination) {
  if (!destination) return 'USD'
  const lower = ` ${destination.toLowerCase()} `
  for (const { words, code } of DEST_CURRENCY_MAP) {
    if (words.some(w => lower.includes(w))) return code
  }
  return 'USD'
}

// Fetches all rates from AUD in one call, returns rate for the requested currency
export async function fetchRate(to) {
  const res = await fetch(`https://open.er-api.com/v6/latest/AUD`)
  if (!res.ok) throw new Error(`ExchangeRate-API ${res.status}`)
  const data = await res.json()
  if (data.result !== 'success') throw new Error('Rate fetch failed')
  const rate = data.rates[to]
  if (rate == null) throw new Error(`No rate for ${to}`)
  return { rate, updated: data.time_last_update_utc }
}
