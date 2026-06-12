// 總表 = 原封不動的整張 sheet，毫無修飾。
// 欄位順序與表頭比照原始 CSV，純樸素表格。
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
]

export default function EventTable({ events, onSelect }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          background: '#fff',
          color: '#000',
          fontFamily: 'Arial, "Noto Sans TC", sans-serif',
          fontSize: '13px',
          whiteSpace: 'nowrap',
        }}
      >
        <thead>
          <tr>
            {COLUMNS.map(([label]) => (
              <th key={label} style={{ border: '1px solid #999', background: '#f0f0f0', padding: '4px 8px', textAlign: 'left', fontWeight: 'bold' }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.id} onClick={() => onSelect(e.id)} style={{ cursor: 'pointer' }}>
              {COLUMNS.map(([label, get]) => (
                <td key={label} style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                  {String(get(e))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
