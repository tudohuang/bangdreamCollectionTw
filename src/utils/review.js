// 年度回顧資料：給 YearReview 卡片與 Wrapped 分享圖共用
import { bandKey, BAND_META } from './bands.js'
import { detectCity } from './derive.js'

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
  const topBands = topTally(byBandKey, 3).map(([k, n]) => ({ ...BAND_META[k], n }))
  const topPeople = topTally(byPerson, 3).map(([name, n]) => ({ name, n }))
  const busiestMonth = topTally(byMonth, 1)[0]
  return {
    year: Number(year),
    total: list.length,
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
