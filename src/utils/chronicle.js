// 一場活動的「史料層」。
//
// 詳情頁原本只回答「這場是什麼」：日期、場地、出演者。那份資料任何認真的人
// 都重建得出來。真正留不住的是「這場發生的時候，周圍在發生什麼」——
// 什麼時候公布的、前後兩個月台灣還有哪些場、那段時間她們在日本在跑什麼。
//
// 這裡把那一層算出來。資料全部來自站上已有的東西：
// 更新日誌（公布日）、活動表（前後文）、動態分頁（日本行程）。
import { announcedMap } from './changelog.js'

const DAY = 86400000
const parse = (d) => (d ? Date.parse(`${d}T00:00:00Z`) : NaN)
const between = (a, b) => {
  const [x, y] = [parse(a), parse(b)]
  return Number.isFinite(x) && Number.isFinite(y) ? Math.round((y - x) / DAY) : null
}

// 前後找多遠：台灣場次抓兩個半月，其他行程抓一個月（再遠就跟這場無關了）
const AROUND_DAYS = 45
const ELSEWHERE_DAYS = 30

// 「公布 → 開賣 → 演出」這條線
export function milestones(event, log = [], today) {
  if (!event?.startDate) return []
  const announced = announcedMap(log).get(event.stableId ?? event.number)
  const out = []

  const push = (key, label, date, note) => {
    if (!date) return
    out.push({ key, label, date, note, offset: between(date, event.startDate) })
  }

  push('announced', '公布', announced, '第一次出現在這份資料裡')
  push('ticket', '開賣', event.ticketDate)
  push('show', '演出', event.startDate)
  if (event.endDate && event.endDate !== event.startDate) push('end', '結束', event.endDate)

  // 只有一個點就不是時間線，是一個日期
  if (out.length < 2) return []
  return out.sort((a, b) => a.date.localeCompare(b.date))
    .map(m => ({ ...m, ago: today ? between(m.date, today) : null }))
}

// 同一段時間，台灣還發生了什麼
export function around(event, allEvents = [], days = AROUND_DAYS) {
  if (!event?.startDate) return []
  return allEvents
    .filter(e => e.id !== event.id && e.startDate)
    .map(e => ({ event: e, offset: between(event.startDate, e.startDate) }))
    .filter(x => x.offset !== null && Math.abs(x.offset) <= days)
    .sort((a, b) => a.offset - b.offset)
}

// 同一段時間，出演者在別的地方在跑什麼。
// 這是這站唯一別人重建不出來的東西 —— 得有人每個月手動記。
export function elsewhereAround(event, pulse = [], days = ELSEWHERE_DAYS) {
  if (!event?.startDate || !pulse.length) return []
  const people = new Set(event.people || [])
  if (!people.size) return []

  const rows = pulse
    .filter(p => p.date && people.has(p.name))
    .map(p => ({ ...p, offset: between(event.startDate, p.date) }))
    .filter(p => p.offset !== null && Math.abs(p.offset) <= days)

  const byPerson = new Map()
  for (const r of rows) {
    if (!byPerson.has(r.name)) byPerson.set(r.name, [])
    byPerson.get(r.name).push(r)
  }

  return [...byPerson.entries()]
    .map(([name, list]) => ({ name, list: list.sort((a, b) => a.offset - b.offset) }))
    .sort((a, b) => b.list.length - a.list.length)
}

export function chronicle(event, { changelog = [], allEvents = [], pulse = [], today } = {}) {
  return {
    milestones: milestones(event, changelog, today),
    around: around(event, allEvents),
    elsewhere: elsewhereAround(event, pulse),
  }
}

// 「當天」「3 天前」「兩週後」—— 相對這場活動
export function offsetLabel(offset) {
  if (offset === 0) return '當天'
  const n = Math.abs(offset)
  const side = offset < 0 ? '前' : '後'
  if (n < 7) return `${n} 天${side}`
  if (n < 30) return `${Math.round(n / 7)} 週${side}`
  return `${Math.round(n / 30)} 個月${side}`
}

// 里程碑相對演出的說法。offset 為正代表這件事在演出之前。
export const beforeShowLabel = (offset) =>
  offset === 0 ? '當天' : `演出${offset > 0 ? '前' : '後'} ${offsetLabel(Math.abs(offset)).replace(/[前後]$/, '')}`
