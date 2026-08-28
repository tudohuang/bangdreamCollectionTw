// 時間的三種切法。都只吃現有欄位（日期、人物），不需要任何新資料。
//
//   firsts()   每個人的初來台與最近一次 —— 一頁看完 57 個人的頭尾
//   gaps()     兩場之間的空白 —— 疫情那三年攤開來自己會說話
//   yearRing() 把所有場次疊到同一年的 365 天上 —— 台灣的邦邦有沒有季節

const day = (d) => (d ? String(d).slice(0, 10) : '')
const toDate = (d) => (day(d) ? new Date(day(d) + 'T00:00:00') : null)
const DAY_MS = 86400000

// 每個人的第一次與最近一次。按「初來台的時間」排，所以這一頁讀起來
// 就是一條「誰先來、誰後來」的隊伍。
export function firsts(events = []) {
  const map = new Map()
  for (const e of events) {
    if (!day(e.startDate)) continue
    for (const name of e.people || []) {
      if (!map.has(name)) map.set(name, { name, list: [] })
      map.get(name).list.push(e)
    }
  }
  const out = []
  for (const v of map.values()) {
    const list = v.list.slice().sort((a, b) => day(a.startDate).localeCompare(day(b.startDate)))
    const first = list[0]
    const last = list[list.length - 1]
    out.push({
      name: v.name,
      count: list.length,
      first,
      last,
      // 只來過一次的人，頭尾是同一場 —— 這件事本身就是重點，不要藏起來
      onlyOnce: list.length === 1,
      // 從第一次到最近一次跨了多久。只來過一次的是 0。
      spanDays: Math.round((toDate(last.startDate) - toDate(first.startDate)) / DAY_MS),
    })
  }
  return out.sort((a, b) =>
    day(a.first.startDate).localeCompare(day(b.first.startDate)) || a.name.localeCompare(b.name))
}

// 相鄰兩場之間的空白。回傳由長到短，附上前後兩場。
// 只算「開演日」之間的距離 —— 跨日活動用開始日，不然快閃店會把空窗吃掉。
export function gaps(events = []) {
  const list = events
    .filter(e => day(e.startDate))
    .slice()
    .sort((a, b) => day(a.startDate).localeCompare(day(b.startDate)))
  const out = []
  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1], next = list[i]
    const days = Math.round((toDate(next.startDate) - toDate(prev.startDate)) / DAY_MS)
    if (days > 0) out.push({ days, prev, next })
  }
  return out.sort((a, b) => b.days - a.days)
}

// 現在還在進行中的空窗（最後一場到今天）。首頁「距上一場幾天」用得到。
export function currentGap(events = [], today = new Date()) {
  const past = events
    .filter(e => day(e.startDate) && day(e.startDate) <= day(today.toISOString()))
    .sort((a, b) => day(b.startDate).localeCompare(day(a.startDate)))
  if (!past.length) return null
  const last = past[0]
  return { days: Math.round((today - toDate(last.startDate)) / DAY_MS), prev: last, next: null }
}

// 一年裡的第幾天（1–366）。跨日活動算成一段，不是一個點。
export function dayOfYear(d) {
  const dt = toDate(d)
  if (!dt) return 0
  return Math.round((dt - new Date(dt.getFullYear(), 0, 0)) / DAY_MS)
}

// 把所有年份疊到同一個 366 格上。每一格記錄那天有哪些場次（跨年份）。
// 用「開始日到結束日」的整段填滿，因為快閃店占的是一段時間不是一天。
export function yearRing(events = []) {
  const cells = Array.from({ length: 367 }, () => [])
  for (const e of events) {
    const s = toDate(e.startDate)
    if (!s) continue
    const en = toDate(e.endDate) || s
    // 上限 60 天：再長的檔期會把整張圖塗滿，反而看不出季節
    const span = Math.min(Math.round((en - s) / DAY_MS), 60)
    for (let i = 0; i <= span; i++) {
      const d = new Date(s.getTime() + i * DAY_MS)
      const n = Math.round((d - new Date(d.getFullYear(), 0, 0)) / DAY_MS)
      if (n >= 1 && n <= 366 && !cells[n].includes(e)) cells[n].push(e)
    }
  }
  return cells
}

// 每個月的場次數（跨年份加總）。年輪旁邊的月標籤用。
export function monthTotals(events = []) {
  const t = Array(13).fill(0)
  for (const e of events) {
    const m = toDate(e.startDate)?.getMonth()
    if (m != null) t[m + 1]++
  }
  return t
}

// 一年中第 n 天 → 「4 月 12 日」。年輪的 tooltip 用，取平年。
export function labelOfDay(n) {
  const d = new Date(2001, 0, n)
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}
