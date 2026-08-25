// 緊急性：Sheet 的「緊急性」欄。留空或「普通」＝一般，「非常」＝全站進入緊急狀態。
import { eventStatus } from './datetime.js'

export const URGENT_VALUE = '非常'
export const URGENT_LABEL = '緊急'

// isUrgent 由 parseEvents 算好；內建 events.json 沒有這個欄位時退回讀字串
export const isUrgent = (e) => !!(e && (e.isUrgent || e.urgency === URGENT_VALUE))

// 只有尚未結束的緊急場次會佔用全站頂端；已結束的仍保留卡片上的紅色標記
export const isUrgentLive = (e, today) => isUrgent(e) && eventStatus(e, today) !== 'past'

// 全站緊急清單：日期近的排前面；沒有日期的（剛宣布、細節未定）排最前
export function urgentEvents(events, today) {
  return (events || [])
    .filter(e => isUrgentLive(e, today))
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
}
