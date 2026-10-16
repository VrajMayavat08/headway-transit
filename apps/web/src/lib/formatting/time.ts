type TimeValue = string | number | Date | null | undefined

function asDate(value: TimeValue) {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(typeof value === 'number' ? value * 1000 : value)
  return Number.isFinite(date.getTime()) ? date : null
}

export function formatLocalDateTime(value: TimeValue, unavailable = 'Unavailable') {
  const date = asDate(value)
  if (!date) return unavailable
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
  }).format(date)
}

export function formatLocalTime(value: TimeValue, unavailable = '—') {
  const date = asDate(value)
  if (!date) return unavailable
  return new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
  }).format(date)
}

export function formatLocalDate(value: TimeValue, unavailable = 'Unavailable') {
  const date = asDate(value)
  if (!date) return unavailable
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}
