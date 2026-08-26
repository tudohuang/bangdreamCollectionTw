// 年度回顧資料：給年度結算牆與 Wrapped 分享圖共用
import { bandKey, BAND_META } from './bands.js'
import { detectCity } from './derive.js'
import { coverSrc } from './cover.js'

function topTally(pairs, limit) {
  return Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, limit)
}

export function yearSummary(events, year) {
  const list = events.filter(e => e.year === Number(year))
  const byBandKey = {}, byPerson = {}, byCity = {}, byMonth = {}
  let attendance = 0, fullBand = 0, core = 0
  for (const e of list) {
    for (const g of (e.relatedGroups || [])) {
      const k = bandKey(g)
      byBandKey[k] = (byBandKey[k] || 0) + 1
    }
    for (const p of (e.people || [])) byPerson[p] = (byPerson[p] || 0) + 1
    const city = detectCity(e); if (city) byCity[city] = (byCity[city] || 0) + 1
    if (e.month) byMonth[e.month] = (byMonth[e.month] || 0) + 1
    attendance += e.attendanceCount || 0
    if (e.isFullBand) fullBand++
    if (e.category === '本體') core++
  }
  const bands = topTally(byBandKey, 99).map(([k, n]) => ({ ...BAND_META[k], n }))
  const topBands = bands.slice(0, 3)
  const topPeople = topTally(byPerson, 3).map(([name, n]) => ({ name, n }))
  const busiestMonth = topTally(byMonth, 1)[0]
  return {
    year: Number(year),
    total: list.length,
    months: Array.from({ length: 12 }, (_, i) => byMonth[i + 1] || 0),
    bands,
    attendance,
    fullBand,
    core,
    side: list.length - core,
    cityCount: Object.keys(byCity).length,
    topCity: topTally(byCity, 1)[0]?.[0] || '',
    topBands,
    topPeople,
    busiestMonth: busiestMonth ? { month: Number(busiestMonth[0]), n: busiestMonth[1] } : null,
  }
}

export function availableYears(events) {
  return [...new Set(events.map(e => e.year).filter(Boolean))].sort((a, b) => b - a)
}

// 每一年一張磚，組成年度結算牆。新的年份排前面，並帶上與前一年的增減。
export function yearWall(events) {
  const years = availableYears(events)
  const summaries = years.map(y => yearSummary(events, y))
  const totalOf = new Map(summaries.map(s => [s.year, s.total]))
  return summaries.map(s => {
    const prev = totalOf.get(s.year - 1)
    return { ...s, prevTotal: prev ?? null, delta: prev == null ? null : s.total - prev }
  })
}

// 空白年份：完全沒有場次的年份也要在牆上留位置，斷層才看得出來
export function wallGaps(events) {
  const years = availableYears(events)
  if (years.length < 2) return []
  const gaps = []
  for (let y = Math.min(...years) + 1; y < Math.max(...years); y++) {
    if (!years.includes(y)) gaps.push(y)
  }
  return gaps
}

// 一年份的封面牆：一場一格，只收有封面的場次。
// 沒封面的場次不放空磚 —— 一整片灰色方塊會把拼貼的節奏打斷；
// 場次總數與封面張數會另外標在抬頭，不會讓人以為那一年只有這幾場。
export function yearTiles(events, year) {
  return events
    .filter(e => e.year === Number(year) && coverSrc(e))
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
    .map(event => ({ key: event.id, url: coverSrc(event), event }))
}
