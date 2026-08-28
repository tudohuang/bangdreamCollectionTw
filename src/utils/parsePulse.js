// 「名冊」與「動態」兩個分頁的解析（純函式，瀏覽器與 Node 共用）
//
// 名冊：一列一個追蹤對象（個人或團體）
// 動態：一列一筆日本行程；同一場多人出席就多列，全團活動則記團名一列
import { parseCSV } from './parseEvents.js'

// Sheet 上手打的日期常常少補零（2026-8-16），統一補成 2026-08-16
export function normalizeDate(v = '') {
  const m = /^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/.exec(String(v).trim())
  if (!m) return ''
  const p = (n) => String(Number(n)).padStart(2, '0')
  return m[3] ? `${m[1]}-${p(m[2])}-${p(m[3])}` : `${m[1]}-${p(m[2])}-01`
}

// 類型的分隔符半形全形混用（LIVE/活動 與 LIVE／活動 是同一種），統一成全形
export const normalizeType = (v = '') => v.trim().replace(/\s*[/／]\s*/g, '／')

// 顏色與篩選用「主類型」：取第一段（LIVE／發售活動 → LIVE）
export const primaryType = (v = '') => normalizeType(v).split('／')[0] || ''

const cell = (row, i) => (i >= 0 ? (row[i] || '').trim() : '')

// ---- 名冊 ----
export function parseRosterCsv(text) {
  const rows = parseCSV(text)
  if (rows.length < 2) return []
  const h = rows[0].map(x => x.trim())
  const idx = {
    name: h.indexOf('對象'), kind: h.indexOf('類別'),
    band: h.indexOf('樂團'), role: h.indexOf('角色'), tracked: h.indexOf('追蹤中'),
    // 官方連結：官推、官網、Eventernote。多條用空白或換行分隔。
    links: h.indexOf('連結') >= 0 ? h.indexOf('連結') : h.indexOf('官方連結'),
  }
  return rows.slice(1).map(r => ({
    name: cell(r, idx.name),
    kind: cell(r, idx.kind) === '團體' ? 'band' : 'person',
    band: cell(r, idx.band),
    role: cell(r, idx.role),
    // 「追蹤中」留空視為要追蹤；只有明確填「否」才排除
    tracked: cell(r, idx.tracked) !== '否',
    links: cell(r, idx.links).split(/[\s,、|]+/).filter(u => /^https?:\/\//.test(u)),
  })).filter(x => x.name)
}

// 名冊 → 依樂團分組（團體列排在自己那組的最前面）
export function groupRoster(roster) {
  const groups = []
  const byBand = new Map()
  for (const r of roster) {
    if (!r.tracked) continue
    const key = r.band || '其他'
    if (!byBand.has(key)) {
      const g = { band: key, lead: null, members: [] }
      byBand.set(key, g)
      groups.push(g)
    }
    const g = byBand.get(key)
    if (r.kind === 'band') g.lead = r
    else g.members.push(r)
  }
  return groups
}

// ---- 動態 ----
export function parsePulseCsv(text) {
  const rows = parseCSV(text)
  if (rows.length < 2) return []
  const h = rows[0].map(x => x.trim())
  const col = (...names) => {
    for (const n of names) { const i = h.indexOf(n); if (i >= 0) return i }
    return -1
  }
  const idx = {
    date: col('日期', 'date'), name: col('對象', '人物'), type: col('類型'),
    title: col('標題', '活動名稱'), place: col('地點'), status: col('狀態'),
    url: col('連結', '來源'), note: col('備註'),
  }
  return rows.slice(1).map((r, i) => {
    const date = normalizeDate(cell(r, idx.date))
    const type = normalizeType(cell(r, idx.type))
    return {
      id: `pulse-${i}`,
      date,
      year: date ? Number(date.slice(0, 4)) : null,
      month: date ? Number(date.slice(5, 7)) : null,
      name: cell(r, idx.name),
      type,
      mainType: primaryType(type),
      title: cell(r, idx.title),
      place: cell(r, idx.place),
      status: cell(r, idx.status),
      url: cell(r, idx.url),
      note: cell(r, idx.note),
    }
  }).filter(x => x.name && x.date)
}

// 動態 + 來台場次 → { "對象|YYYY-MM": [項目] }
// 來台場次用活動表的「人物」欄對位；全團場次也掛到團名上（樂團名對得起來的話）
export function buildPulseIndex(pulse, events = [], roster = []) {
  const map = new Map()
  const add = (name, ym, item) => {
    const k = `${name}|${ym}`
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(item)
  }
  for (const p of pulse) {
    if (!p.date) continue
    add(p.name, p.date.slice(0, 7), { where: 'jp', ...p })
  }
  const bandNames = new Set(roster.filter(r => r.kind === 'band').map(r => r.name))
  for (const e of events) {
    if (!e.startDate || e.startDate.includes('??')) continue
    const ym = e.startDate.slice(0, 7)
    const item = {
      where: 'tw', id: e.id, date: e.startDate, title: e.title,
      type: e.type || '來台', mainType: '來台', place: e.venue, url: '',
      year: e.year, month: e.month,
    }
    for (const person of (e.people || [])) add(person, ym, item)
    for (const g of (e.relatedGroups || [])) {
      const root = g.split('／')[0].trim()
      if (bandNames.has(root)) add(root, ym, item)
    }
  }
  return map
}

// 資料裡實際出現過的年月（由小到大），矩陣的欄就照這個長
export function monthsIn(pulse, extraDates = []) {
  const set = new Set()
  for (const p of pulse) if (p.date) set.add(p.date.slice(0, 7))
  for (const d of extraDates) if (d) set.add(d.slice(0, 7))
  return [...set].sort()
}

// start..end 之間的連續月份（含頭尾）。中間沒資料的月份也要留一欄，
// 不然「9 月有動態、12 月有來台」會被擠在一起，看不出中間空了三個月。
export function monthRange(start, end, cap = 14) {
  if (!start) return []
  const out = []
  let [y, m] = start.split('-').map(Number)
  const [ey, em] = (end || start).split('-').map(Number)
  while ((y < ey || (y === ey && m <= em)) && out.length < cap) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    if (++m > 12) { m = 1; y++ }
  }
  return out
}

// 某個月的月曆格子：補滿前後空格，湊成整週（週日起算）
export function monthGrid(ym) {
  if (!ym) return []
  const [y, m] = ym.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const days = new Date(y, m, 0).getDate()
  const cells = Array(first.getDay()).fill(null)
  for (let d = 1; d <= days; d++) {
    cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
}

// 這個月每個人有幾筆行程 → [{ name, count, own, viaBand, first, last }]，忙的排前面。
//
// 給了 roster 就只算「人」，並把團體的行程算到成員頭上：動態表把
// 「Poppin'Party 12/13 京 Premium Live」記成團名一列，但那天五個成員都走不開。
// 沒給 roster 就照 對象 欄原樣統計。
export function monthLoad(pulse, ym, roster = []) {
  const membersOf = new Map()
  const bandNames = new Set()
  for (const r of roster) {
    if (r.kind === 'band') bandNames.add(r.name)
    else if (r.band) {
      if (!membersOf.has(r.band)) membersOf.set(r.band, [])
      membersOf.get(r.band).push(r.name)
    }
  }
  const peopleOnly = roster.length > 0

  const per = new Map()
  const add = (name, date, viaBand) => {
    if (!per.has(name)) per.set(name, { name, count: 0, own: 0, viaBand: 0, first: date, last: date })
    const row = per.get(name)
    row.count++
    row[viaBand ? 'viaBand' : 'own']++
    if (date < row.first) row.first = date
    if (date > row.last) row.last = date
  }

  for (const p of pulse) {
    if (!p.date || p.date.slice(0, 7) !== ym) continue
    const isBand = bandNames.has(p.name)
    if (!peopleOnly || !isBand) add(p.name, p.date, false)
    if (isBand) for (const member of (membersOf.get(p.name) || [])) add(member, p.date, true)
  }
  return [...per.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

// 矩陣要顯示哪些月：從動態最早的月份開始，到「動態最後一個月」與
// 「那之後還有來台場次的最後一個月」之中比較晚的那個為止。
export function pulseMonths(pulse, events = [], cap = 14) {
  const pm = monthsIn(pulse)
  if (!pm.length) return []
  const start = pm[0]
  const twMonths = events
    .map(e => (e.startDate || '').slice(0, 7))
    .filter(ym => ym && ym >= start)
    .sort()
  const end = [pm[pm.length - 1], twMonths[twMonths.length - 1]].filter(Boolean).sort().pop()
  return monthRange(start, end, cap)
}
