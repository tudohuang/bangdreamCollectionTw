// 上次看到哪。
//
// 這站有 59 筆、而且一直在長。回訪的人現在得從頭滾一次才找得到上次在看的
// 那一場 —— 尤其手機上，卡牆很長。
//
// 只存在瀏覽器裡，跟「我去過」一樣不上傳。存的也只有一個 id 與時間，
// 不記錄瀏覽軌跡。

const KEY = 'bdtw-last-seen'
// 超過兩週就不提了 —— 那已經不是「接著看」，是另一次造訪
const MAX_AGE_DAYS = 14

const store = () => (typeof localStorage === 'undefined' ? null : localStorage)

export function rememberSeen(id) {
  if (!id) return
  try {
    store()?.setItem(KEY, JSON.stringify({ id, at: Date.now() }))
  } catch { /* 無痕模式或空間滿了：記不住不是錯誤 */ }
}

export function getLastSeen(events = [], now = Date.now()) {
  let raw
  try { raw = store()?.getItem(KEY) } catch { return null }
  if (!raw) return null

  let rec
  try { rec = JSON.parse(raw) } catch { return null }
  if (!rec?.id || !rec?.at) return null

  const days = (now - rec.at) / 86400000
  if (days > MAX_AGE_DAYS || days < 0) return null

  const event = events.find(e => e.id === rec.id)
  if (!event) return null            // 那筆被刪掉或改了 id
  return { event, days }
}

export function clearLastSeen() {
  try { store()?.removeItem(KEY) } catch { /* 同上 */ }
}

// ------------------------------------------------------------------ 上次來之後新增了什麼
//
// 站上所有「4 天前公布」都是相對於現在，對回訪的人來說不夠 ——
// 他要問的是「我上次來之後有什麼新的」。
//
// 基準用「上次看到的最大編號」而不是 changelog 的日期：
// changelog 只有跑 npm run import 時才會長一筆，現在總共才 1 筆，
// 綁它的話這個功能幾乎不會觸發。編號是每一筆都有的，永遠對得準。
const MARK_KEY = 'bdtw-seen-upto'

const maxNumberOf = (events = []) =>
  events.reduce((n, e) => Math.max(n, Number(e.number) || 0), 0)

// 上次來的時候看到哪一號。第一次來回 null —— 那時候沒有「新增」這件事，
// 59 場全部都是新的，講出來只是廢話。
export function seenUpTo() {
  try {
    const v = Number(store()?.getItem(MARK_KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch { return null }
}

// 基準只增不減。
//
// 抓 Sheet 失敗時網站會退回內建的 events.json，那份可能比 Sheet 少幾筆。
// 如果照單全收把基準寫小，下次來就會把已經看過的場次又當成「新增」。
export function markSeenUpTo(events = []) {
  const n = maxNumberOf(events)
  if (n <= 0) return
  const prev = seenUpTo()
  if (prev != null && n <= prev) return
  try { store()?.setItem(MARK_KEY, String(n)) } catch { /* 無痕 */ }
}

// 上次來之後多出來的場次，新的在前。
export function newSinceLastVisit(events = []) {
  const mark = seenUpTo()
  if (mark == null) return []
  return events
    .filter(e => (Number(e.number) || 0) > mark)
    .sort((a, b) => (b.number || 0) - (a.number || 0))
}

// 「剛剛」「3 天前」——精確到小時沒有意義，這只是給人定位用的
export function agoLabel(days) {
  if (days < 0.04) return '剛剛'
  if (days < 1) return '今天'
  if (days < 2) return '昨天'
  return `${Math.floor(days)} 天前`
}
