// 日期 / 星期 / 活動狀態（過去・即將・進行中）
const WD = ['日', '一', '二', '三', '四', '五', '六']

export function parseDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '')
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function todayStr(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

export function weekday(dateStr) {
  const dt = parseDate(dateStr)
  return dt ? `週${WD[dt.getDay()]}` : ''
}

// past | upcoming | ongoing | unknown
export function eventStatus(e, today = todayStr()) {
  const s = e.startDate, en = e.endDate || e.startDate
  if (!s || s.includes('??')) return 'unknown'
  if (en < today) return 'past'
  if (s > today) return 'upcoming'
  return 'ongoing'
}

export function daysUntil(dateStr, today = todayStr()) {
  const a = parseDate(today), b = parseDate(dateStr)
  if (!a || !b) return null
  return Math.round((b - a) / 86400000)
}

export const STATUS_LABEL = {
  past: '已結束',
  upcoming: '即將舉行',
  ongoing: '進行中',
  unknown: '日期未定',
}
