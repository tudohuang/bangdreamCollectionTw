import { isUrgent } from '../utils/urgency.js'

// 總表：比照原始 sheet 的欄位順序，不做額外整理。
// 樣式走 .sheet-table（見 index.css），淺色與夜場模式都有定義。
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
