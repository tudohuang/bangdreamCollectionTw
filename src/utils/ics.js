// 把場次匯出成行事曆檔（.ics）。全日事件，不處理時刻 — Sheet 只有日期。
import { parseDate } from './datetime.js'

const esc = (s) => String(s ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n')

const ymd = (d) => String(d || '').replace(/-/g, '')

// 全日事件的 DTEND 是「不含」的那天，所以結束日要 +1
function endExclusive(endDate, startDate) {
  const base = parseDate(endDate || startDate)
  if (!base) return null
  base.setDate(base.getDate() + 1)
  const p = (n) => String(n).padStart(2, '0')
  return `${base.getFullYear()}${p(base.getMonth() + 1)}${p(base.getDate())}`
}

// RFC 5545：每行不超過 75 octets，續行以一個空白開頭
function fold(line) {
  if (line.length <= 74) return line
  const out = [line.slice(0, 74)]
  let rest = line.slice(74)
  while (rest.length > 73) {
    out.push(' ' + rest.slice(0, 73))
    rest = rest.slice(73)
  }
  if (rest) out.push(' ' + rest)
  return out.join('\r\n')
}

function eventLink(event) {
  if (typeof location === 'undefined') return ''
  return `${location.origin}${location.pathname}#/event/${event.id}`
}

export function eventToVevent(event, stamp) {
  const start = ymd(event.startDate)
  const end = endExclusive(event.endDate, event.startDate)
  if (!start || !end) return null

  const desc = [
    `#${String(event.number ?? 0).padStart(3, '0')}`,
    (event.relatedGroups || []).join('、'),
    (event.people || []).join('、'),
    event.organizer && `主辦：${event.organizer}`,
    eventLink(event),
  ].filter(Boolean).join('\n')

  return [
    'BEGIN:VEVENT',
    `UID:${event.id}@bangdream-tw-collection`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    fold(`SUMMARY:${esc(event.title || '未命名活動')}`),
    event.venue ? fold(`LOCATION:${esc(event.venue)}`) : null,
    fold(`DESCRIPTION:${esc(desc)}`),
    'END:VEVENT',
  ].filter(Boolean).join('\r\n')
}

export function buildIcs(events, stamp) {
  const body = events.map(e => eventToVevent(e, stamp)).filter(Boolean)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Taiwan BanG Dream Collection//TW//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...body,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}

// 回傳實際寫進檔案的場次數（沒有合法日期的會被略過）
export function downloadIcs(events, filename = 'bangdream-tw.ics') {
  const list = Array.isArray(events) ? events : [events]
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const written = list.filter(e => eventToVevent(e, stamp))
  if (!written.length) return 0

  const blob = new Blob([buildIcs(written, stamp)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return written.length
}
