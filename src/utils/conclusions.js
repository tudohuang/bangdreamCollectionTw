// 有結論的統計。
//
// 圖表只回答「多少」，不回答「所以呢」。而這份資料最容易被誤讀的地方，
// 剛好都在圖表看不見的地方 —— 樂團被列在活動上不代表本體來過，
// 一筆紀錄不代表一場演出。
//
// 一張卡一句話。結論跟但書寫在同一行，不另外掛一行小字 ——
// 七張卡各配一段灰字會讓整頁看起來很吵，而那些字沒人會讀。
import { rootGroup } from './bands.js'
import { detectCity } from './derive.js'
import { relationOf, relationBreakdown } from './relation.js'
import { countingSummary } from './counting.js'

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

const tally = (arr) =>
  [...arr.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())]
    .sort((a, b) => b[1] - a[1])

const NORTH = ['台北', '臺北', '新北', '桃園', '基隆']

export function conclusions(events = []) {
  const out = []
  const dated = events.filter(e => e.year)
  if (!dated.length) return out

  const years = dated.map(e => e.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const byYear = new Map(tally(years))

  // ── 1. 近年集中度 ──────────────────────────────
  const thisYear = new Date().getFullYear()
  const recentFrom = thisYear - 1
  const recent = dated.filter(e => e.year >= recentFrom).length
  const earlier = dated.filter(e => e.year < recentFrom).length
  const thisYearCount = byYear.get(thisYear) || 0

  if (thisYearCount) {
    out.push({
      key: 'concentration',
      text: thisYearCount > earlier
        ? `${thisYear} 一年 ${thisYearCount} 筆，比 ${minYear}–${recentFrom - 1} 七年加起來還多`
        : `${thisYear} 佔全站 ${pct(thisYearCount, events.length)}%`,
    })
  }

  // ── 2. 最常來的人，以及那些次數其實是什麼 ──────────
  const people = tally(dated.flatMap(e => e.people || []))
  if (people.length) {
    const [name, count] = people[0]
    const mine = dated.filter(e => (e.people || []).includes(name))
    const official = mine.filter(e => relationOf(e).tier === 'official').length
    out.push({
      key: 'top-person',
      text: official === count
        ? `最常來的${name} ${count} 筆，全部是官方本體`
        : `最常來的${name} ${count} 筆，只有 ${official} 筆是官方本體`,
      href: `#/person/${encodeURIComponent(name)}`,
    })
  }

  // ── 3. 樂團虛胖：被列在活動上 ≠ 本體來過 ──────────
  const bandRows = new Map()
  for (const e of dated) {
    for (const g of new Set((e.relatedGroups || []).map(rootGroup))) {
      if (!bandRows.has(g)) bandRows.set(g, { total: 0, official: 0 })
      const row = bandRows.get(g)
      row.total++
      if (relationOf(e).tier === 'official') row.official++
    }
  }
  const inflated = [...bandRows.entries()]
    .filter(([, r]) => r.total >= 3)
    .sort((a, b) => (a[1].official / a[1].total) - (b[1].official / b[1].total))[0]

  if (inflated && inflated[1].official < inflated[1].total) {
    const [band, r] = inflated
    out.push({
      key: 'band-inflation',
      text: r.official === 0
        ? `${band} 出現在 ${r.total} 筆活動，沒有一筆是本體`
        : `${band} 出現在 ${r.total} 筆活動，只有 ${r.official} 筆是本體`,
      href: `#/band/${encodeURIComponent(band)}`,
    })
  }

  // ── 4. 關聯程度分布 ────────────────────────────
  const rel = relationBreakdown(dated)
  out.push({
    key: 'relation',
    text: `官方本體 ${rel.counts.official} · 強關聯 ${rel.counts.strong} · 弱關聯 ${rel.counts.weak}`
      + (rel.inferred === rel.total ? '，全由規則推論' : rel.inferred ? `，${rel.inferred} 筆由規則推論` : ''),
  })

  // ── 5. 城市集中度 ──────────────────────────────
  const cities = dated.map(detectCity).filter(Boolean)
  if (cities.length) {
    const north = cities.filter(c => NORTH.some(n => c.includes(n))).length
    out.push({
      key: 'city',
      text: `${pct(north, cities.length)}% 的活動在北部`,
    })
  }

  // ── 6. 疫情斷層 ────────────────────────────────
  const gaps = []
  for (let y = minYear; y <= maxYear; y++) if (!byYear.get(y)) gaps.push(y)
  if (gaps.length) {
    const runs = gaps.reduce((acc, y) => {
      const last = acc[acc.length - 1]
      if (last && y === last[last.length - 1] + 1) last.push(y)
      else acc.push([y])
      return acc
    }, [])
    const longest = runs.sort((a, b) => b.length - a.length)[0]
    out.push({
      key: 'gap',
      text: longest.length === 1
        ? `${longest[0]} 年整年掛零`
        : `${longest[0]}–${longest[longest.length - 1]} 連續 ${longest.length} 年掛零`,
    })
  }

  // ── 7. 一筆不等於一場 ──────────────────────────
  const c = countingSummary(events)
  if (c.multiDay) {
    out.push({
      key: 'counting',
      text: `${c.records} 筆紀錄 ≠ ${c.sessions} 場演出，其中 ${c.multiDay} 筆跨日`,
    })
  }

  return out
}

// 這幾條是這份資料最容易被誤讀的地方，跟數字無關，所以寫死
export const CAVEATS = [
  ['樂團出現 ≠ 樂團本體來台', '成員以個人身分來台時，活動上仍會標註她所屬的團。'],
  ['聲優來台 ≠ 邦邦企劃來台', '全站三分之二的紀錄是聲優個人或其他作品的行程。'],
  ['活動紀錄 ≠ 實際場次', '一筆可能是一天、兩天，也可能是一間開十天的快閃店。'],
  ['完售 ≠ 唯一的成功標準', '場館大小、票價、檔期都不同，數字之間不一定可比。'],
]
