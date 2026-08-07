// 一場活動在整個收藏史裡的座標：第幾次、隔多久、同一天還有誰。
// 全部從現有欄位算出來，不需要 Sheet 多填任何一格。
import { rootGroup } from './bands.js'
import { parseDate, todayStr } from './datetime.js'

// 時序鍵：日期優先，同日再用編號 — 讓「第 N 次」穩定可重現
function chronoKey(e) {
  return `${e.startDate || '9999-99-99'}#${String(e.number ?? 0).padStart(5, '0')}`
}

export function sortChrono(events = []) {
  return [...events].sort((a, b) => {
    const ka = chronoKey(a), kb = chronoKey(b)
    return ka < kb ? -1 : ka > kb ? 1 : 0
  })
}

export function daysBetween(from, to) {
  const a = parseDate(from), b = parseDate(to)
  if (!a || !b) return null
  return Math.round((b - a) / 86400000)
}

// 「7 年前」「3 個月前」「12 天前」；未來或當天回 null（頭圖已經在講倒數了）
export function agoLabel(days) {
  if (days == null || days <= 0) return null
  if (days >= 365) return `${Math.floor(days / 365)} 年前`
  if (days >= 30) return `${Math.floor(days / 30)} 個月前`
  return `${days} 天前`
}

// 「EXPO／Talk／手渡／上映會」→ 四顆標籤（半形斜線也吃）
export function typeTags(e) {
  return String(e.type || '').split(/[／/]/).map(s => s.trim()).filter(Boolean)
}

// 一場活動牽涉到的主團（去重）
export function eventBands(e) {
  return [...new Set((e.relatedGroups || []).map(rootGroup).filter(Boolean))]
}

// 在某個已排序序列裡，這場是第幾個 → { nth, total, prev }
function serialFor(list, event) {
  const i = list.findIndex(e => e.id === event.id)
  if (i < 0) return { nth: null, total: list.length, prev: null }
  return { nth: i + 1, total: list.length, prev: i > 0 ? list[i - 1] : null }
}

export function eventContext(event, allEvents = [], today = todayStr()) {
  const pool = allEvents.some(e => e.id === event.id) ? allEvents : [...allEvents, event]
  const chrono = sortChrono(pool)
  const index = chrono.findIndex(e => e.id === event.id)

  const band = eventBands(event)[0] || ''
  const bandSerial = band ? serialFor(chrono.filter(e => eventBands(e).includes(band)), event) : null
  const venueSerial = event.venue ? serialFor(chrono.filter(e => e.venue === event.venue), event) : null
  const orgSerial = event.organizer ? serialFor(chrono.filter(e => e.organizer === event.organizer), event) : null
  const yearSerial = serialFor(chrono.filter(e => e.year === event.year), event)

  const people = (event.people || []).map(name => {
    const s = serialFor(chrono.filter(e => (e.people || []).includes(name)), event)
    return { name, nth: s.nth, total: s.total, isFirst: s.nth === 1 }
  })

  return {
    band,
    bandNth: bandSerial?.nth ?? null,
    bandTotal: bandSerial?.total ?? 0,
    prevBandEvent: bandSerial?.prev ?? null,
    daysSinceLastBand: bandSerial?.prev
      ? daysBetween(bandSerial.prev.startDate, event.startDate)
      : null,

    venueNth: venueSerial?.nth ?? null,
    venueTotal: venueSerial?.total ?? 0,
    organizerNth: orgSerial?.nth ?? null,
    organizerTotal: orgSerial?.total ?? 0,

    people,
    yearNth: yearSerial.nth,
    yearTotal: yearSerial.total,

    sameDay: event.startDate
      ? chrono.filter(e => e.id !== event.id && e.startDate === event.startDate)
      : [],

    ago: agoLabel(daysBetween(event.startDate, today)),

    index,
    total: chrono.length,
    prevChrono: index > 0 ? chrono[index - 1] : null,
    nextChrono: index >= 0 && index < chrono.length - 1 ? chrono[index + 1] : null,
    chrono,
  }
}
