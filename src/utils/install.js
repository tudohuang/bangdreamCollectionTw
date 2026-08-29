// 「加到主畫面」的時機與記憶。
//
// 不上架商店的話，這一步就是全部 —— 一個人會不會把這站當 App 用，
// 完全取決於他有沒有把它加到主畫面。所以邀請的時機比邀請本身重要。
//
// 原本的做法有三個問題：
//   1. 進站 12 秒就邀請。那時候他還在決定要不要看下去，最容易反射性按 ×。
//   2. 按了 × 就永遠不再出現。而最可能安裝的人，正是那些回訪很多次的人 ——
//      他們第一次按掉之後，就再也沒有機會了。
//   3. 按掉之後沒有任何其他入口。除非他自己知道 Safari 分享選單那招。
//
// 改成：等這個人表現出投入（回訪三次，或標過「我去過」）才邀請；
// 按掉是暫時收起來不是永久；另外在「我的」放一個常駐的安靜入口。

const VISITS_KEY = 'bdtw-visits'
const SNOOZE_KEY = 'bdtw-install-snooze'

// 回訪幾次之後才值得邀請。三次是「這不是路過」的門檻。
const MIN_VISITS = 3
// 按掉之後收起來多久。30 天夠久到不煩人，又不會永遠失去機會。
const SNOOZE_DAYS = 30

const read = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k, v) => { try { localStorage.setItem(k, String(v)) } catch { /* 無痕模式 */ } }

// 每次載入算一次造訪，但同一天只算一次 ——
// 不然重新整理三下就達標，那不叫回訪。
export function countVisit(today = new Date().toISOString().slice(0, 10)) {
  let rec
  try { rec = JSON.parse(read(VISITS_KEY) || '{}') } catch { rec = {} }
  if (rec.last === today) return rec.n || 1
  const n = (rec.n || 0) + 1
  write(VISITS_KEY, JSON.stringify({ n, last: today }))
  return n
}

export function visitCount() {
  try { return JSON.parse(read(VISITS_KEY) || '{}').n || 0 } catch { return 0 }
}

export function snooze(now = Date.now()) {
  write(SNOOZE_KEY, now + SNOOZE_DAYS * 86400000)
}

export function isSnoozed(now = Date.now()) {
  const until = Number(read(SNOOZE_KEY) || 0)
  return until > now
}

// 現在該不該主動邀請？
//
// 條件是「這個人已經投入了」——回訪夠多次，或者標過自己去過哪幾場
// （標記是最強的訊號：他在把這站當成自己的紀錄）。
export function shouldInvite({ attendedCount = 0, now = Date.now() } = {}) {
  if (isSnoozed(now)) return false
  return visitCount() >= MIN_VISITS || attendedCount > 0
}
