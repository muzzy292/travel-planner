// Destination info helpers — uses restcountries.com (free, no key required)

// Maps destination keywords to a canonical country name for the REST Countries API
const DEST_COUNTRY_MAP = [
  { words: ['vietnam', 'ho chi minh', 'hanoi', 'hoi an', 'da nang', 'saigon', 'phu quoc', 'hue', 'nha trang'], country: 'Vietnam' },
  { words: ['thailand', 'bangkok', 'phuket', 'chiang mai', 'koh samui', 'koh phangan', 'pattaya', 'krabi'], country: 'Thailand' },
  { words: ['japan', 'tokyo', 'osaka', 'kyoto', 'hiroshima', 'sapporo', 'nara', 'fukuoka'], country: 'Japan' },
  { words: ['indonesia', 'bali', 'jakarta', 'lombok', 'yogyakarta', 'komodo'], country: 'Indonesia' },
  { words: ['singapore'], country: 'Singapore' },
  { words: ['cambodia', 'phnom penh', 'siem reap', 'angkor'], country: 'Cambodia' },
  { words: ['malaysia', 'kuala lumpur', 'penang', 'langkawi', 'borneo', 'sabah'], country: 'Malaysia' },
  { words: ['philippines', 'manila', 'cebu', 'boracay', 'palawan', 'el nido'], country: 'Philippines' },
  { words: ['india', 'mumbai', 'delhi', 'goa', 'jaipur', 'rajasthan', 'agra', 'kerala'], country: 'India' },
  { words: ['nepal', 'kathmandu', 'pokhara'], country: 'Nepal' },
  { words: ['sri lanka', 'colombo', 'kandy'], country: 'Sri Lanka' },
  { words: ['dubai', 'abu dhabi', 'emirates'], country: 'United Arab Emirates' },
  { words: ['hong kong'], country: 'Hong Kong' },
  { words: ['china', 'beijing', 'shanghai', 'chengdu', 'guilin'], country: 'China' },
  { words: ['south korea', 'korea', 'seoul', 'busan', 'jeju'], country: 'South Korea' },
  { words: ['taiwan', 'taipei'], country: 'Taiwan' },
  { words: ['france', 'paris', 'nice', 'lyon', 'marseille'], country: 'France' },
  { words: ['italy', 'rome', 'florence', 'venice', 'milan', 'amalfi'], country: 'Italy' },
  { words: ['spain', 'madrid', 'barcelona', 'seville', 'ibiza'], country: 'Spain' },
  { words: ['germany', 'berlin', 'munich', 'hamburg', 'frankfurt'], country: 'Germany' },
  { words: ['netherlands', 'amsterdam'], country: 'Netherlands' },
  { words: ['portugal', 'lisbon', 'porto', 'algarve'], country: 'Portugal' },
  { words: ['greece', 'athens', 'santorini', 'mykonos', 'crete'], country: 'Greece' },
  { words: ['croatia', 'dubrovnik', 'split', 'hvar'], country: 'Croatia' },
  { words: ['austria', 'vienna', 'salzburg', 'innsbruck'], country: 'Austria' },
  { words: ['switzerland', 'zurich', 'geneva', 'bern', 'interlaken'], country: 'Switzerland' },
  { words: ['czech', 'prague'], country: 'Czech Republic' },
  { words: ['uk', 'united kingdom', 'england', 'london', 'scotland', 'edinburgh', 'manchester'], country: 'United Kingdom' },
  { words: ['ireland', 'dublin'], country: 'Ireland' },
  { words: ['usa', 'united states', 'new york', 'los angeles', 'miami', 'hawaii', 'las vegas', 'san francisco', 'chicago'], country: 'United States' },
  { words: ['canada', 'toronto', 'vancouver', 'montreal', 'banff'], country: 'Canada' },
  { words: ['new zealand', 'auckland', 'queenstown', 'christchurch', 'wellington'], country: 'New Zealand' },
  { words: ['mexico', 'cancun', 'mexico city', 'playa del carmen', 'tulum'], country: 'Mexico' },
  { words: ['peru', 'lima', 'cusco', 'machu picchu'], country: 'Peru' },
  { words: ['brazil', 'rio', 'sao paulo', 'salvador'], country: 'Brazil' },
  { words: ['south africa', 'cape town', 'johannesburg'], country: 'South Africa' },
  { words: ['turkey', 'istanbul', 'cappadocia', 'ankara', 'antalya'], country: 'Turkey' },
  { words: ['egypt', 'cairo', 'luxor', 'sharm'], country: 'Egypt' },
  { words: ['morocco', 'marrakech', 'casablanca', 'fez'], country: 'Morocco' },
  { words: ['maldives', 'male'], country: 'Maldives' },
  { words: ['fiji', 'nadi', 'suva'], country: 'Fiji' },
]

// Power plug type info keyed by ISO 3166-1 alpha-2 country code
// Framed from an Australian traveller's perspective (Australia uses Type I)
const PLUG_INFO = {
  VN: { plugs: 'A, B, C',    adapter: 'Yes — bring a universal adapter' },
  TH: { plugs: 'A, B, C',    adapter: 'Yes — bring a universal adapter' },
  JP: { plugs: 'A, B',       adapter: 'Yes — Type A/B adapter needed' },
  ID: { plugs: 'C, F',       adapter: 'Yes — Type C/F adapter needed' },
  SG: { plugs: 'G',          adapter: 'Yes — Type G adapter needed' },
  MY: { plugs: 'G',          adapter: 'Yes — Type G adapter needed' },
  PH: { plugs: 'A, B, C',    adapter: 'Yes — bring a universal adapter' },
  IN: { plugs: 'C, D, M',    adapter: 'Yes — bring a universal adapter' },
  NP: { plugs: 'C, D, M',    adapter: 'Yes — bring a universal adapter' },
  LK: { plugs: 'D, G, M',    adapter: 'Yes — Type G adapter needed' },
  AE: { plugs: 'G',          adapter: 'Yes — Type G adapter needed' },
  HK: { plugs: 'G',          adapter: 'Yes — Type G adapter needed' },
  CN: { plugs: 'A, C, I',    adapter: 'Usually no — Type I (Australian) plugs work in most sockets' },
  KR: { plugs: 'C, F',       adapter: 'Yes — Type C/F adapter needed' },
  TW: { plugs: 'A, B',       adapter: 'Yes — Type A/B adapter needed' },
  KH: { plugs: 'A, C, G',    adapter: 'Yes — bring a universal adapter' },
  FR: { plugs: 'C, E',       adapter: 'Yes — Type C/E adapter needed' },
  DE: { plugs: 'C, F',       adapter: 'Yes — Type C/F adapter needed' },
  IT: { plugs: 'C, F, L',    adapter: 'Yes — Type C/F adapter needed' },
  ES: { plugs: 'C, F',       adapter: 'Yes — Type C/F adapter needed' },
  PT: { plugs: 'C, F',       adapter: 'Yes — Type C/F adapter needed' },
  GR: { plugs: 'C, F',       adapter: 'Yes — Type C/F adapter needed' },
  NL: { plugs: 'C, F',       adapter: 'Yes — Type C/F adapter needed' },
  BE: { plugs: 'C, E',       adapter: 'Yes — Type C/E adapter needed' },
  AT: { plugs: 'C, F',       adapter: 'Yes — Type C/F adapter needed' },
  CH: { plugs: 'C, J',       adapter: 'Yes — Type C/J adapter needed' },
  HR: { plugs: 'C, F',       adapter: 'Yes — Type C/F adapter needed' },
  CZ: { plugs: 'C, E',       adapter: 'Yes — Type C/E adapter needed' },
  GB: { plugs: 'G',          adapter: 'Yes — Type G adapter needed' },
  IE: { plugs: 'G',          adapter: 'Yes — Type G adapter needed' },
  US: { plugs: 'A, B',       adapter: 'Yes — Type A/B adapter needed' },
  CA: { plugs: 'A, B',       adapter: 'Yes — Type A/B adapter needed' },
  NZ: { plugs: 'I',          adapter: 'No — same plug as Australia' },
  FJ: { plugs: 'I',          adapter: 'No — same plug as Australia' },
  MX: { plugs: 'A, B',       adapter: 'Yes — Type A/B adapter needed' },
  PE: { plugs: 'A, B, C',    adapter: 'Yes — bring a universal adapter' },
  BR: { plugs: 'C, N',       adapter: 'Yes — Type C/N adapter needed' },
  ZA: { plugs: 'C, D, M, N', adapter: 'Yes — bring a universal adapter' },
  TR: { plugs: 'C, F',       adapter: 'Yes — Type C/F adapter needed' },
  EG: { plugs: 'C, F',       adapter: 'Yes — Type C/F adapter needed' },
  MA: { plugs: 'C, E',       adapter: 'Yes — Type C/E adapter needed' },
  MV: { plugs: 'D, G, J, K', adapter: 'Yes — Type G adapter needed' },
}

function resolveCountryName(destination) {
  if (!destination) return null
  const lower = ` ${destination.toLowerCase()} `
  for (const { words, country } of DEST_COUNTRY_MAP) {
    if (words.some(w => lower.includes(w.toLowerCase()))) return country
  }
  // Fall back to the raw destination string and hope it's a country name
  return destination
}

function parseTimezoneOffset(tz) {
  // e.g. "UTC+07:00", "UTC-05:00", "UTC"
  if (!tz || tz === 'UTC') return 0
  const m = tz.match(/UTC([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!m) return 0
  const sign  = m[1] === '+' ? 1 : -1
  const hours = parseInt(m[2], 10)
  const mins  = parseInt(m[3] || '0', 10)
  return sign * (hours + mins / 60)
}

export async function fetchCountryInfo(destination) {
  const countryName = resolveCountryName(destination)
  if (!countryName) return null
  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fields=name,capital,languages,currencies,timezones,flags,idd,cca2`
    )
    if (!res.ok) return null
    const data = await res.json()
    const c = Array.isArray(data) ? data[0] : data
    if (!c || c.status === 404) return null

    // Time zone vs Melbourne (AEST = UTC+10)
    const tz       = c.timezones?.[0] || 'UTC'
    const tzOffset = parseTimezoneOffset(tz)
    const diff     = tzOffset - 10
    const diffStr  = diff === 0
      ? 'Same time as Melbourne'
      : diff > 0
        ? `${diff}h ahead of Melbourne`
        : `${Math.abs(diff)}h behind Melbourne`

    // Languages (max 2)
    const langs = Object.values(c.languages || {}).slice(0, 2).join(', ') || null

    // Currency
    const currencyStr = Object.entries(c.currencies || {})
      .map(([code, { name, symbol }]) => `${name} (${symbol || code})`)
      .slice(0, 2)
      .join(', ') || null

    // Calling code
    const callingCode = c.idd?.root
      ? `${c.idd.root}${(c.idd.suffixes || [])[0] || ''}`
      : null

    // Plug info
    const plugData = PLUG_INFO[c.cca2] || null

    return {
      name:          c.name?.common,
      flag:          c.flags?.emoji || null,
      capital:       (c.capital || [])[0] || null,
      languages:     langs,
      currency:      currencyStr,
      timeDiff:      diffStr,
      timezone:      tz,
      callingCode,
      plugs:         plugData?.plugs  || null,
      adapterNeeded: plugData?.adapter || null,
    }
  } catch (e) {
    console.error('Country info fetch failed:', e)
    return null
  }
}
