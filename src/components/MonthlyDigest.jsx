import { useMemo, useState } from 'react'
import { primaryMeta } from '../utils/bands.js'
import { todayStr } from '../utils/datetime.js'
import { isUrgent } from '../utils/urgency.js'
import Icon from './Icon.jsx'
import YearGlance from './YearGlance.jsx'

// 月曆總覽。
// 桌機：12 張月卡並排，一次看完整年的細節。
// 手機：改用 4×3 的年度總覽（YearGlance），點月份才展開 ——
//       同一份資料，兩種版面，不是把桌機的縮窄。
export default function MonthlyDigest({ events, onSelect }) {
  const years = useMemo(
    () => [...new Set(events.map(e => e.year).filter(Boolean))].sort((a, b) => a - b),
    [events])
  const thisYear = Number(todayStr().slice(0, 4))
  const [picked, setPicked] = useState(null)
  const [openMonth, setOpenMonth] = useState(null)
  if (!years.length) return null

  const year = picked ?? (years.includes(thisYear) ? thisYear : years[years.length - 1])
  const yi = years.indexOf(year)
  const thisMonth = Number(todayStr().slice(5, 7))

  const byMonth = new Map()
  for (const e of events) {
    if (e.year !== year || !e.month) continue
    if (!byMonth.has(e.month)) byMonth.set(e.month, [])
    byMonth.get(e.month).push(e)
  }
  for (const list of byMonth.values())
    list.sort((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999'))

  return (
    <div className="mt-14 sm:mt-20 scroll-mt-20" id="monthly">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow"><Icon n="calendar" className="text-[10px]" /> Monthly View</div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-dream-ink mt-1.5">
            {year} 來台月曆
          </h2>
          <svg aria-hidden className="mt-1 text-bloom-rose/60" width="148" height="8" viewBox="0 0 148 8" fill="none">
            <path d="M2 5.5C20 2 35 7 55 4.5S95 2.5 118 5s22-1.5 28-.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex items-center gap-1 text-[14px]">
          <button
            onClick={() => { setPicked(years[yi - 1]); setOpenMonth(null) }}
            disabled={yi === 0}
            aria-label="上一年"
            className="icon-btn disabled:opacity-30 disabled:pointer-events-none"
          ><Icon n="chevron-left" /></button>
          <span className="font-round font-bold text-dream-ink w-12 text-center">{year}</span>
          <button
            onClick={() => { setPicked(years[yi + 1]); setOpenMonth(null) }}
            disabled={yi === years.length - 1}
            aria-label="下一年"
            className="icon-btn disabled:opacity-30 disabled:pointer-events-none"
          ><Icon n="chevron-right" /></button>
        </div>
      </div>

      <YearGlance
        year={year} byMonth={byMonth} thisYear={thisYear} thisMonth={thisMonth}
        openMonth={openMonth} onOpenMonth={setOpenMonth} onSelect={onSelect}
      />

      {/* 桌機：12 格總覽。空的月份縮成一條細的 —— 版面該讓給真的有活動的月份 */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:auto-rows-min sm:items-start">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const list = byMonth.get(m) || []
          const isNow = year === thisYear && m === thisMonth
          if (!list.length) {
            return (
              <div key={m}
                className={`rounded-xl border border-dashed px-3 py-2 flex items-baseline gap-2 opacity-60 ${
                  isNow ? 'border-bloom-indigo/50' : 'border-dream-line/80 dark:border-white/10'}`}>
                <span className={`font-display font-bold text-[14px] ${isNow ? 'text-bloom-indigo' : 'text-dream-faint'}`}>
                  {m} 月
                </span>
                <span className="font-hand text-[14px] text-dream-faint">
                  {['靜悄悄', '存錢月', '休息中'][m % 3]}
                </span>
              </div>
            )
          }
          return (
            <div
              key={m}
              className={`rounded-2xl border p-3.5 flex flex-col gap-2 transition-colors ${
                isNow
                  ? 'border-bloom-indigo/50 bg-bloom-indigo/[.05] dark:bg-bloom-indigo/10'
                  : 'border-dream-line/80 bg-white/55 dark:bg-white/[.04] dark:border-white/10'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className={`font-display font-bold text-[16px] ${isNow ? 'text-bloom-indigo' : 'text-dream-ink'}`}>
                  {m} 月
                </span>
                {isNow && <span className="text-[14px] font-bold text-bloom-indigo">本月</span>}
              </div>
              {(
                <ul className="flex flex-col gap-1.5">
                  {list.map(e => {
                    const meta = primaryMeta(e)
                    const day = e.startDate ? Number(e.startDate.slice(8, 10)) : null
                    const names = (e.people || []).join('、')
                    const urgent = isUrgent(e)
                    return (
                      <li key={e.id}>
                        <button
                          onClick={() => onSelect(e.id)}
                          className="group w-full text-left text-[14px] leading-snug flex gap-1.5"
                          title={e.title}
                        >
                          <span
                            className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: urgent ? 'rgb(var(--c-urgent))' : meta.color }}
                          />
                          <span className="min-w-0">
                            {urgent && (
                              <Icon n="triangle-exclamation" className="text-[9px] mr-1"
                                style={{ color: 'rgb(var(--c-urgent))' }} />
                            )}
                            <span className="font-round font-bold" style={{ color: urgent ? 'rgb(var(--c-urgent))' : meta.color }}>
                              {day ? `${day}日` : '未定'}
                            </span>{' '}
                            <span className="text-dream-ink group-hover:text-bloom-indigo transition-colors">
                              {names || e.title}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
