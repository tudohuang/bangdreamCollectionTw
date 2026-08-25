// 里程碑：哪幾場在收藏史上是「第一次」「隔最久」「最多人」。
// 一次算完整份收藏（Map），避免每張卡片各自掃一遍。
import { sortChrono, eventBands, daysBetween } from './context.js'
import { yearGaps } from './insights.js'

// 越前面越重要 — 卡片只秀一個時取第一個
const ORDER = ['first-ever', 'comeback', 'first-core', 'long-gap', 'biggest']

export function milestoneMap(events = []) {
  const chrono = sortChrono(events)
  const map = new Map()
  const add = (id, key, label) => {
    if (!map.has(id)) map.set(id, [])
    map.get(id).push({ key, label })
  }

  if (!chrono.length) return map

  // 全站最早的一場
  add(chrono[0].id, 'first-ever', '一切的開始')

  // 空白之後的第一場
  for (const g of yearGaps(chrono)) {
    const first = chrono.find(e => e.year === g.before)
    if (first) add(first.id, 'comeback', `空白 ${g.length} 年後的第一場`)
  }

  // 每個團的首場官方場次 + 睽違太久
  const seenCore = new Set()
  const lastSeen = {}
  for (const e of chrono) {
    for (const b of eventBands(e)) {
      if (e.category === '本體' && !seenCore.has(b)) {
        seenCore.add(b)
        add(e.id, 'first-core', `${b} 首場官方場次`)
      }
      const gap = lastSeen[b] ? daysBetween(lastSeen[b], e.startDate) : null
      if (gap != null && gap >= 730) {
        const years = Math.floor(gap / 365)
        // 擦邊場來的是聲優個人，不能說成「樂團再來」
        add(e.id, 'long-gap', e.category === '本體'
          ? `${b} 睽違 ${years} 年再來`
          : `${b} 相關場次睽違 ${years} 年`)
      }
      lastSeen[b] = e.startDate || lastSeen[b]
    }
  }

  // 單場最多人次（並列就都給）
  const maxAtt = Math.max(0, ...chrono.map(e => e.attendanceCount || 0))
  if (maxAtt > 1) {
    for (const e of chrono) {
      if ((e.attendanceCount || 0) === maxAtt) add(e.id, 'biggest', `單場最多聲優 · ${maxAtt} 人`)
    }
  }

  // 依重要性排序；卡片只顯示第一個
  for (const list of map.values()) {
    list.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))
  }
  return map
}
