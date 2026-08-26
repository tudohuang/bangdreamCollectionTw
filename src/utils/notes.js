// 每場活動的個人紀錄（存在這台裝置的 localStorage）。
//
// 為什麼不是一個純文字欄位：Eventernote 的「ノート」把感想與物販備忘分開記，
// 因為那是兩種不同的東西 —— 一個是事後回想，一個是當天要用的。
// 這裡沿用那個分法，再加上圖鑑側需要的「票排了沒」。
//
// 綁永久鍵不綁圖鑑編號 —— 編號可以重排，筆記不能跟著對到別場活動。

const KEY = 'bdtw-notes'

// 一則筆記的形狀。全部選填，沒填的欄位不會存進去。
const FIELDS = ['line', 'goods', 'seat', 'with', 'ticket']

export const TICKET_STATES = [
  ['none', '還沒處理'],
  ['planned', '打算去'],
  ['ticketed', '票到手'],
  ['done', '已完成'],
]

const keyOf = (event) => String(event?.stableId ?? event?.number ?? '')

export function loadNotes() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {} }
  catch { return {} }
}

export function saveNotes(notes) {
  try { localStorage.setItem(KEY, JSON.stringify(notes)) } catch { /* 無痕模式或空間滿了 */ }
}

export const noteOf = (notes, event) => notes[keyOf(event)] || {}

// 回傳新的 notes 物件，不改原本的 —— React 才看得出變化
export function setNote(notes, event, patch) {
  const id = keyOf(event)
  const merged = { ...notes[id], ...patch }
  // 只留有值的欄位，空字串不佔空間也不會被誤判成「有寫」
  const cleaned = {}
  for (const f of FIELDS) {
    const v = merged[f]
    if (typeof v === 'string' ? v.trim() : v) cleaned[f] = typeof v === 'string' ? v.trim() : v
  }
  const next = { ...notes }
  if (Object.keys(cleaned).length) next[id] = cleaned
  else delete next[id]
  return next
}

export const hasNote = (notes, event) => Object.keys(noteOf(notes, event)).length > 0

// 圖鑑側：這一格「填滿了沒」。
// 分成幾個維度是因為缺的東西不一樣，補的方式也不一樣。
export function slotStatus(event, { attended, notes }) {
  const note = noteOf(notes, event)
  return {
    attended: !!attended,
    hasNote: !!note.line || !!note.goods,
    hasCover: !!event.cover,
    hasImpression: !!event.impression || !!event.oneLine,
    ticket: note.ticket || 'none',
  }
}

// 整份圖鑑的完成度。Discogs 的 Collection 給的是「你有幾張」，
// 這裡多給一層「哪些格子還缺東西」—— 因為這站的目的是把史料補齊，
// 不只是記錄自己去過幾場。
export function dexProgress(events, { attended, notes }) {
  let went = 0, noted = 0, covered = 0, impressed = 0
  for (const e of events) {
    const s = slotStatus(e, { attended: attended?.has(e.id), notes })
    if (s.attended) went++
    if (s.hasNote) noted++
    if (s.hasCover) covered++
    if (s.hasImpression) impressed++
  }
  const total = events.length || 1
  const pct = (n) => Math.round((n / total) * 100)
  return {
    total: events.length,
    went, noted, covered, impressed,
    wentPct: pct(went), notedPct: pct(noted),
    coveredPct: pct(covered), impressedPct: pct(impressed),
  }
}
