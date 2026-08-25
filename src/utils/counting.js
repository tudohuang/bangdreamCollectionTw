// 統計口徑：「59 場」到底是 59 個什麼。
//
// 一筆資料可能是一天、兩天，也可能是一間開十天的快閃店。
// 別人拿我們的數字跟其他整理比對時，口徑講不清楚就沒有可信度，
// 所以這裡把「筆數 / 日數 / 場次」拆開算，並且把定義一起回傳給畫面顯示。

// 這些類型是「一段期間」而不是「一場演出」，跨很多天也只算一場
const SPAN_TYPES = new Set(['快閃店', '展覽', '特展', 'EXPO'])

const primaryType = (e) => String(e?.type || '').split(/[／/、]/)[0].trim()

const dayList = (e) => {
  const start = e?.startDate
  if (!start) return []
  const end = e.endDate || start
  const out = []
  for (let d = new Date(`${start}T00:00:00Z`), stop = new Date(`${end}T00:00:00Z`);
       d <= stop && out.length < 400;
       d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out.length ? out : [start]
}

// 單筆的場次：Sheet 有填「場次」就用它，否則用天數推（期間型活動一律算 1）
export function sessionsOf(event) {
  const explicit = Number(event?.sessions ?? event?.extras?.['場次'])
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  if (SPAN_TYPES.has(primaryType(event))) return 1
  return Math.max(1, dayList(event).length)
}

export const isMultiDay = (e) => e?.startDate && e?.endDate && e.startDate !== e.endDate

// 全站（或任一子集）的三種數字
export function countingSummary(events = []) {
  const list = events.filter(e => e && e.startDate)
  const active = new Set()
  let spanDays = 0, sessions = 0, explicit = 0

  for (const e of list) {
    const days = dayList(e)
    days.forEach(d => active.add(d))
    spanDays += days.length
    sessions += sessionsOf(e)
    if (Number(e.sessions ?? e.extras?.['場次']) > 0) explicit++
  }

  return {
    records: events.length,        // 幾筆活動紀錄（就是站上的編號數）
    dated: list.length,            // 其中有日期的
    activeDays: active.size,       // 有活動的日子（重疊的同一天只算一次）
    spanDays,                      // 各筆天數相加（同一天有兩筆就算兩天）
    sessions,                      // 推估場次
    explicitSessions: explicit,    // 其中由 Sheet 明確標註的筆數
    multiDay: list.filter(isMultiDay).length,
  }
}

// 給畫面用的口徑說明；有了它，別人問「你算 26 我算 31」才答得出來
export const COUNTING_NOTES = [
  ['活動紀錄', '一筆 = 圖鑑裡的一個編號。跨日公演目前算一筆。'],
  ['活動日', '有活動的日曆天，同一天有兩場也只算一天。'],
  ['場次', '有標「場次」就用標的；沒標的用天數推，快閃店與展覽這類期間型活動一律算一場。'],
]
