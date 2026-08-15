// 緊急性 — Sheet 的「緊急性」欄：留空／「普通」＝一般，「非常」＝全站進緊急狀態。
// 大爆炸級情報（突然宣布來台、開賣、變更）用這個欄位一次點亮整個網站。
import { eventStatus } from './datetime.js'

export const URGENT_VALUE = '非常'
export const URGENT_LABEL = '緊急'

// isUrgent 由 parseEvents 算好；內建 events.json 沒這欄時退回讀字串，兩邊都認得
export const isUrgent = (e) => !!(e && (e.isUrgent || e.urgency === URGENT_VALUE))

// 還「活著」的緊急場次才值得霸佔全站頂端：已結束的留卡片上的紅標就好
export const isUrgentLive = (e, today) => isUrgent(e) && eventStatus(e, today) !== 'past'

// 全站緊急清單：日期近的排前面，沒日期的（剛宣布、細節未定）排最前
export function urgentEvents(events, today) {
  return (events || [])
    .filter(e => isUrgentLive(e, today))
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
}
