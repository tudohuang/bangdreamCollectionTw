import { useMemo, useState } from 'react'
import { yearRing, monthTotals, labelOfDay } from '../utils/chronology.js'
import { primaryMeta } from '../utils/bands.js'

// 年輪：把 2018–2026 全部疊到同一年的 366 天上。
//
// 為什麼是圓的：問題本身是循環的 ——「台灣的邦邦有沒有季節」。
// 攤成長條圖的話，12 月與 1 月會被切在兩端，看不出那是連著的。
// 圓形也讓「空的那一段」變成一個看得見的缺口。
//
// 每一根刺是一天，長度是那天有幾場（跨年份加總）。

const CX = 160, CY = 160, R0 = 92, R_MAX = 132
const MONTH_START = [0, 1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335] // 平年，第 n 天

export default function YearRing({ events, onSelect }) {
  const cells = useMemo(() => yearRing(events), [events])
  const totals = useMemo(() => monthTotals(events), [events])
  const [hover, setHover] = useState(null)

  const peak = Math.max(...cells.map(c => c.length), 1)
  const peakMonth = totals.indexOf(Math.max(...totals.slice(1)))
  const activeDays = cells.filter(c => c.length).length

  // 一天 → 角度。從 12 點鐘開始順時針，1/1 在正上方。
  const angle = (n) => (n / 366) * 2 * Math.PI - Math.PI / 2
  const point = (n, r) => [CX + Math.cos(angle(n)) * r, CY + Math.sin(angle(n)) * r]

  const shown = hover ? cells[hover] : null

  return (
    <div className="glass p-6">
      <h3 className="font-display font-bold text-[15px] text-dream-ink">一年裡的邦邦</h3>
      <p className="mt-1 text-[13px] text-dream-sub">
        {events.length} 筆全部疊在同一年上。有活動的只有 {activeDays} 天，
        最密的是 <strong className="text-dream-ink">{peakMonth} 月</strong>（{totals[peakMonth]} 場）。
      </p>

      <div className="mt-4 flex flex-col lg:flex-row items-center gap-6">
        <svg viewBox="0 0 320 320" className="w-full max-w-[300px] shrink-0" role="img"
          aria-label={`一年 366 天的活動分布，最密集的是 ${peakMonth} 月`}>
          {/* 月份的分隔線與底環 */}
          <circle cx={CX} cy={CY} r={R0} fill="none" stroke="currentColor"
            className="text-dream-line dark:text-white/10" strokeWidth="1" />
          {MONTH_START.slice(1).map((n, i) => {
            const [x1, y1] = point(n, R0 - 4)
            const [x2, y2] = point(n, R_MAX + 6)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor"
              className="text-dream-line dark:text-white/10" strokeWidth="0.75" />
          })}

          {/* 每一天一根刺 */}
          {cells.map((list, n) => {
            if (!n || !list.length) return null
            const len = R0 + ((R_MAX - R0) * list.length) / peak
            const [x1, y1] = point(n, R0)
            const [x2, y2] = point(n, len)
            const m = primaryMeta(list[0])
            const on = hover === n
            return (
              <line key={n} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={m.color} strokeWidth={on ? 4 : 2.4} strokeLinecap="round"
                opacity={hover && !on ? 0.25 : 0.9}
                onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)}
                className="cursor-pointer transition-opacity" />
            )
          })}

          {/* 月份標籤 */}
          {MONTH_START.slice(1).map((n, i) => {
            const mid = n + 14
            const [x, y] = point(mid, R_MAX + 20)
            const hot = i + 1 === peakMonth
            return (
              <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                className={hot ? 'fill-bloom-violet font-bold' : 'fill-current text-dream-faint'}
                style={{ fontSize: 11 }}>
                {i + 1}
              </text>
            )
          })}

          {/* 圓心：滑到哪天就顯示哪天 */}
          <text x={CX} y={CY - 6} textAnchor="middle" className="fill-current text-dream-ink"
            style={{ fontSize: 15, fontWeight: 700 }}>
            {hover ? labelOfDay(hover) : `${activeDays} 天`}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" className="fill-current text-dream-faint"
            style={{ fontSize: 11 }}>
            {hover ? `${shown.length} 場` : '有活動'}
          </text>
        </svg>

        {/* 滑到的那天有哪些場次。沒滑的時候列最密的那個月，畫面才不會空著 */}
        <div className="min-w-0 flex-1 w-full">
          <div className="text-[11px] font-bold text-dream-faint mb-2">
            {hover ? labelOfDay(hover) : `${peakMonth} 月的場次`}
          </div>
          <ul className="space-y-1.5">
            {(shown && shown.length
              ? shown
              : events.filter(e => new Date(String(e.startDate) + 'T00:00:00').getMonth() + 1 === peakMonth)
            ).slice(0, 8).map(e => (
              <li key={e.id}>
                <button onClick={() => onSelect(e.id)}
                  className="w-full text-left flex items-center gap-2 text-[13px] text-dream-sub hover:text-dream-ink py-0.5">
                  <span className="font-round font-bold shrink-0 tabular-nums"
                    style={{ color: primaryMeta(e).color }}>{e.year}</span>
                  <span className="truncate">{e.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
