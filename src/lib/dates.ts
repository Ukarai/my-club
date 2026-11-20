// Date helpers. Dates are stored as ISO strings (YYYY-MM-DD).
export function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return ""
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function ageFrom(dob: string | null) {
  if (!dob) return null
  const [y, m, d] = dob.split("-").map(Number)
  const now = new Date()
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d))
    age--
  return age
}

export function daysUntil(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  const target = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  return Math.round((target - start) / 86400000)
}

export function parseIso(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** "19 Nov", or "9 Mar 2027" outside the current year. */
export function shortDate(iso: string) {
  const date = parseIso(iso)
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== new Date().getFullYear() && {
      year: "numeric",
    }),
  })
}

export function inDays(days: number) {
  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  return `in ${days} days`
}
