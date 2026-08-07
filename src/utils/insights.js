// 把現有欄位算成「說得出口的事實」：空白年份、樂團出席、聲優分布。
// 全部從 events 推導，Sheet 不用多填任何一格。
import { BAND_META } from './bands.js'
import { eventBands } from './context.js'

// BAND_META 裡真正的樂團（排掉「其他」與泛用的 BanG Dream! 標籤）
const CANON = new Set(
  Object.entries(BAND_META)
    .filter(([k]) => k !== 'other' && k !== 'bang')
    .map(([, m]) => m.name)
)

// 收藏裡完全沒有場次的連續年份（只看最早與最晚年之間的洞）
export function yearGaps(events) {
  const years = [...new Set(events.map(e => e.year).filter(Boolean))].sort((a, b) => a - b)
  const gaps = []
  for (let i = 1; i < years.length; i++) {
    const prev = years[i - 1], cur = years[i]
    if (cur - prev > 1) {
      gaps.push({
        after: prev,
        before: cur,
        from: prev + 1,
        to: cur - 1,
        length: cur - prev - 1,
      })
    }
  }
  return gaps
}

// 每個團的出席狀況：core = 本體（官方邦邦場）、total = 含聲優個人場
export function bandPresence(events) {
  const rows = new Map()
  for (const e of events) {
    for (const b of eventBands(e)) {
      if (!rows.has(b)) rows.set(b, { band: b, core: 0, total: 0, canon: CANON.has(b) })
      const r = rows.get(b)
      r.total += 1
      if (e.category === '本體') r.core += 1
    }
  }
  return [...rows.values()].sort((a, b) => b.core - a.core || b.total - a.total)
}

// 只有聲優個人來過、還沒有官方場次的團
export function bandsWithoutCore(events) {
  return bandPresence(events).filter(r => r.canon && r.core === 0).map(r => r.band)
}

export function peopleFrequency(events) {
  const count = {}
  for (const e of events) for (const p of (e.people || [])) count[p] = (count[p] || 0) + 1
  const entries = Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return {
    total: entries.length,
    once: entries.filter(([, c]) => c === 1).map(([p]) => p),
    top: entries.map(([name, n]) => ({ name, count: n })),
  }
}

export function busiestYear(events) {
  const count = {}
  for (const e of events) if (e.year) count[e.year] = (count[e.year] || 0) + 1
  const top = Object.entries(count).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]
  return top ? { year: Number(top[0]), count: top[1] } : null
}

// 首頁那幾句：只留下不需要解釋、也不會講錯的事實
export function siteInsights(events) {
  const out = []
  if (!events.length) return out

  const gap = yearGaps(events).sort((a, b) => b.length - a.length)[0]
  if (gap) {
    out.push({
      icon: 'calendar',
      text: gap.length === 1
        ? `${gap.from} 年整年一場都沒有`
        : `${gap.from}–${gap.to} 連續 ${gap.length} 年，一場都沒有`,
    })
  }

  const busiest = busiestYear(events)
  if (busiest && busiest.count > 1) {
    out.push({ icon: 'bolt', text: `${busiest.year} 年 ${busiest.count} 場，是目前最多的一年` })
  }

  const pf = peopleFrequency(events)
  if (pf.total && pf.once.length) {
    out.push({ icon: 'microphone', text: `${pf.total} 位聲優來過，其中 ${pf.once.length} 位只來過一次` })
  }

  const absent = bandsWithoutCore(events)
  if (absent.length) {
    out.push({ icon: 'guitar', text: `${absent.join('、')} 只有聲優個人來過，還沒有官方場次` })
  }

  return out
}
