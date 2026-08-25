// 活動資料的異動比對。npm run import 會用它，讓每次同步 Sheet 都留下一筆紀錄。
//
// 為什麼需要：站上最有價值的資訊是「剛剛又公布了誰」，但 Sheet 只存活動本身，
// 沒有「什麼時候被加進來的」。這裡把每次同步的差異寫進 src/data/changelog.json，
// 那份檔案跟著 repo 走，時間一久就是一份真實的公布史。

// 會被追蹤的欄位；改動這些才算「異動」，補心得或換封面不算
const WATCHED = [
  ['startDate', '日期'],
  ['endDate', '結束日期'],
  ['venue', '場地'],
  ['city', '城市'],
  ['title', '名稱'],
  ['ticketUrl', '售票'],
  ['urgency', '緊急性'],
  ['people', '出演者'],
]

const same = (a, b) =>
  Array.isArray(a) || Array.isArray(b)
    ? JSON.stringify(a || []) === JSON.stringify(b || [])
    : (a || '') === (b || '')

const keyOf = (e) => e?.stableId ?? e?.number
const brief = (e) => ({ id: keyOf(e), number: e.number, title: e.title, startDate: e.startDate })

// 舊快照 vs 新資料 → { added, changed }
export function diffEvents(prev = [], next = []) {
  const before = new Map(prev.map(e => [keyOf(e), e]))
  const added = [], changed = []

  for (const e of next) {
    const old = before.get(keyOf(e))
    if (!old) { added.push(brief(e)); continue }

    const fields = WATCHED
      .filter(([key]) => !same(old[key], e[key]))
      .map(([, label]) => label)
    if (fields.length) changed.push({ ...brief(e), fields })
  }
  return { added, changed }
}

// 把這次的差異併進 changelog 陣列（同一天再跑一次會合併，不是新增一筆）
export function appendEntry(log = [], { added, changed }, date) {
  if (!added.length && !changed.length) return log

  const rest = log.filter(x => x.date !== date)
  const todayBefore = log.find(x => x.date === date)
  const merge = (a = [], b = []) => {
    const seen = new Map(a.map(x => [x.id ?? x.number, x]))
    for (const x of b) seen.set(x.id ?? x.number, x)
    return [...seen.values()].sort((p, q) => (q.id ?? q.number) - (p.id ?? p.number))
  }

  return [{
    date,
    added: merge(todayBefore?.added, added),
    changed: merge(todayBefore?.changed, changed),
  }, ...rest].sort((a, b) => (a.date < b.date ? 1 : -1))
}
