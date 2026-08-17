import { isUrgent } from '../utils/urgency.js'

// 總表 = 原封不動的整張 sheet，毫無修飾 —— 但「樸素」不等於「硬寫死白底黑字」，
// 夜場模式那樣會整片白到刺眼。樣式改吃 .sheet-table（見 index.css），兩種主題都讀得下去。
const COLUMNS = [
  ['年份', e => e.year ?? ''],
  ['開始日期', e => e.startDate ?? ''],
  ['結束日期', e => e.endDate ?? ''],
  ['月份', e => e.month ?? ''],
  ['活動名稱', e => e.title ?? ''],
  ['類型', e => e.type ?? ''],
  ['人物', e => (e.people || []).join('、')],
  ['團體／關聯', e => (e.relatedGroups || []).join('、')],
  ['本體／擦邊', e => e.category ?? ''],
  ['全團', e => (e.isFullBand ? '是' : '否')],
  ['人次', e => e.attendanceCount ?? 0],
  ['緊急性', e => e.urgency ?? ''],
]

export default function EventTable({ events, onSelect }) {
  return (
    <div className="rounded-xl border border-dream-line dark:border-white/10 overflow-auto max-h-[78vh] scrollbar-thin">
      <table className="sheet-table">
        <thead>
          <tr>
            {COLUMNS.map(([label]) => <th key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.id} onClick={() => onSelect(e.id)} className={isUrgent(e) ? 'is-urgent' : ''}>
              {COLUMNS.map(([label, get]) => (
                <td key={label}>{String(get(e))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
