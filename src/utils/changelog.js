// 更新日誌的讀取端。資料由 npm run import 產生（見 scripts/changelog.mjs）。
//
// 站上最有時效性的資訊是「剛剛又公布了誰」，但 Sheet 本身沒有「何時被加進來」，
// 所以那個時間戳只存在 changelog.json 裡。
import bundled from '../data/events.json' with { type: 'json' }

const keyOf = (e) => e?.stableId ?? e?.number
const itemKey = (x) => x?.id ?? x?.number
const BUNDLED_IDS = new Set(bundled.map(keyOf))

// 每個編號第一次出現在日誌裡的日期
export function announcedMap(log = []) {
  const map = new Map()
  for (const entry of [...log].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    for (const item of entry.added || []) {
      if (!map.has(itemKey(item))) map.set(itemKey(item), entry.date)
    }
  }
  return map
}

// 混合時間軸：日誌裡的新增與異動，加上「Sheet 已經有、但還沒同步進日誌」的那些。
// 後者是即時抓 Sheet 才看得到的，站長還沒跑 npm run import 之前就先顯示出來。
export function recentFeed(log = [], events = [], limit = 8) {
  const byId = new Map(events.map(e => [keyOf(e), e]))
  const feed = []

  for (const e of events) {
    if (!BUNDLED_IDS.has(keyOf(e))) feed.push({ kind: 'added', date: null, event: e })
  }

  for (const entry of log) {
    for (const item of entry.added || []) {
      const event = byId.get(itemKey(item))
      if (event) feed.push({ kind: 'added', date: entry.date, event })
    }
    for (const item of entry.changed || []) {
      const event = byId.get(itemKey(item))
      if (event) feed.push({ kind: 'changed', date: entry.date, event, fields: item.fields || [] })
    }
  }

  // 同一場只留最新的一筆，未入日誌的（date 為 null）排最前面
  const seen = new Set()
  return feed
    .filter(x => (seen.has(x.event.id + x.kind) ? false : seen.add(x.event.id + x.kind)))
    .sort((a, b) => (a.date === b.date ? 0 : !a.date ? -1 : !b.date ? 1 : (a.date < b.date ? 1 : -1)))
    .slice(0, limit)
}

// 首頁的「最近公布」：只要新增、只要還沒結束的，最近的排前面
export function justAnnounced(log = [], events = [], today = new Date().toISOString().slice(0, 10)) {
  return recentFeed(log, events, 60)
    .filter(x => x.kind === 'added' && (x.event.endDate || x.event.startDate || '9999') >= today)
    .slice(0, 5)
}

export function daysAgoLabel(date, today = new Date().toISOString().slice(0, 10)) {
  if (!date) return '剛剛加入'
  const diff = Math.round((Date.parse(today) - Date.parse(date)) / 86400000)
  if (!Number.isFinite(diff)) return date
  if (diff <= 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff < 7) return `${diff} 天前`
  if (diff < 30) return `${Math.floor(diff / 7)} 週前`
  return date.replace(/-/g, '/').slice(2)
}

// 「本週新增 N」；日誌只到日為單位，所以用 7 天窗
export function weeklyCount(log = [], today = new Date().toISOString().slice(0, 10)) {
  const since = new Date(Date.parse(today) - 7 * 86400000).toISOString().slice(0, 10)
  return log
    .filter(e => e.date > since && e.date <= today)
    .reduce((n, e) => n + (e.added?.length || 0), 0)
}
