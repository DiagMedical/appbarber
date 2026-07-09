const TIMEZONE = 'America/Sao_Paulo'

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

function getParts(value: string | Date) {
  const date = toDate(value)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0)

  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
  }
}

export function getUTC3DateParts(value: string | Date = new Date()) {
  return getParts(value)
}

export function getUTC3DateKey(value: string | Date = new Date()): string {
  const { year, month, day } = getParts(value)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getUTC3MonthKey(value: string | Date): string {
  const { year, month } = getParts(value)
  return `${year}-${String(month).padStart(2, '0')}`
}

export function getUTC3DayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00-03:00`).getUTCDay()
}

export function getUTC3TimeParts(value: string | Date) {
  const { hour, minute } = getParts(value)
  return { hour, minute }
}

export function startOfUTC3DayISO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00-03:00`).toISOString()
}

export function endOfUTC3DayISO(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999-03:00`).toISOString()
}

export function startOfUTC3MonthISO(value: string | Date, monthsBack = 0): string {
  const { year, month } = getParts(value)
  const totalMonths = year * 12 + (month - 1) - monthsBack
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1
  return new Date(`${targetYear}-${String(targetMonth).padStart(2, '0')}-01T00:00:00-03:00`).toISOString()
}

export function getUTC3WeekStart(value: string | Date = new Date()): Date {
  const current = new Date(`${getUTC3DateKey(value)}T12:00:00-03:00`)
  const weekStart = new Date(current)
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
  return weekStart
}

export function addUTC3Days(value: Date, days: number): Date {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE, dateStyle: 'short' }).format(new Date(iso))
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

export function formatTimeRaw(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function toUTC3(date: Date): Date {
  const offset = date.getTimezoneOffset()
  const brtOffset = -180
  const diff = brtOffset + offset
  return new Date(date.getTime() + diff * 60000)
}
