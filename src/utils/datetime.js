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

// 全站唯一的倒數用詞。卡片、票根、詳情、緊急橫幅都走這支，
// 才不會同一件事在四個地方講成四種話（「43 天後」「還有 43 天」「43 天後開演」…）。
//   short：卡片／橫幅等空間小的地方  long：詳情等可以講整句的地方
export function countdownLabel(e, { style = 'short', today = todayStr() } = {}) {
  const st = eventStatus(e, today)
  if (st === 'ongoing') return '進行中'
  if (st !== 'upcoming') return ''
  const d = daysUntil(e.startDate, today)
  if (d == null || d < 0) return ''
  if (d === 0) return style === 'long' ? '就是今天' : '今天'
  return style === 'long' ? `還有 ${d} 天` : `${d} 天後`
}

export const STATUS_LABEL = {
  past: '已結束',
  upcoming: '即將舉行',
  ongoing: '進行中',
  unknown: '日期未定',
}
