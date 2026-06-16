// Local-date helpers. Never use Date.toISOString() to derive a YYYY-MM-DD
// "calendar date" — it converts to UTC, which shifts the date back a day in
// positive-UTC timezones (e.g. Australia, where local midnight is the previous
// afternoon in UTC). These format from local components instead.

// Format a Date as YYYY-MM-DD using its local components.
export function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Today's calendar date as YYYY-MM-DD, in the user's local timezone.
export function todayStr() {
  return toDateStr(new Date())
}
