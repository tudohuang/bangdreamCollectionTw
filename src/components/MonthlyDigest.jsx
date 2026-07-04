import { useMemo, useState } from 'react'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { todayStr } from '../utils/datetime.js'
import Icon from './Icon.jsx'

// 月曆總覽：一年 12 格，每格列出當月來台的活動（日期＋出演者）。
// 靈感來自情報帳的「月份列表制」——資訊量最低、一眼看完今年誰來。
export default function MonthlyDigest({ events, onSelect }) {
  const years = useMemo(
    () => [...new Set(events.map(e => e.year).filter(Boolean))].sort((a, b) => a - b),
    [events])
  const thisYear = Number(todayStr().slice(0, 4))
  const [picked, setPicked] = useState(null)
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
        </div>
        <div className="flex items-center gap-1 text-[13px]">
          <button
            onClick={() => setPicked(years[yi - 1])}
            disabled={yi === 0}
            aria-label="上一年"
            className="icon-btn disabled:opacity-30 disabled:pointer-events-none"
          ><Icon n="chevron-left" /></button>
          <span className="font-round font-bold text-dream-ink w-12 text-center">{year}</span>
          <button
            onClick={() => setPicked(years[yi + 1])}
            disabled={yi === years.length - 1}
            aria-label="下一年"
            className="icon-btn disabled:opacity-30 disabled:pointer-events-none"
          ><Icon n="chevron-right" /></button>
        </div>
      </div>

      {/* 手機：橫滑逐月；平板以上：12 格總覽 */}
      <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3 -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const list = byMonth.get(m) || []
          const isNow = year === thisYear && m === thisMonth
          return (
            <div
              key={m}
              className={`snap-start shrink-0 w-[230px] sm:w-auto sm:shrink rounded-2xl border p-3.5 flex flex-col gap-2 min-h-[92px] transition-colors ${
                isNow
                  ? 'border-bloom-indigo/50 bg-bloom-indigo/[.05] dark:bg-bloom-indigo/10'
                  : 'border-dream-line/80 bg-white/55 dark:bg-white/[.04] dark:border-white/10'
              } ${list.length ? '' : 'opacity-55'}`}
            >
              <div className="flex items-baseline justify-between">
                <span className={`font-display font-bold text-[15px] ${isNow ? 'text-bloom-indigo' : 'text-dream-ink'}`}>
                  {m} 月
                </span>
                {isNow && <span className="text-[10px] font-bold text-bloom-indigo">本月</span>}
              </div>
              {list.length ? (
                <ul className="flex flex-col gap-1.5">
                  {list.map(e => {
                    const meta = primaryMeta(e)
                    const day = e.startDate ? Number(e.startDate.slice(8, 10)) : null
                    const names = (e.people || []).join('、')
                    return (
                      <li key={e.id}>
                        <button
                          onClick={() => onSelect(e.id)}
                          className="group w-full text-left text-[12px] leading-snug flex gap-1.5"
                          title={e.title}
                        >
                          <span
                            className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: meta.color }}
                          />
                          <span className="min-w-0">
                            <span className="font-round font-bold" style={{ color: meta.color }}>
                              {day ? `${day}日` : '未定'}
                            </span>{' '}
                            <span className="text-dream-ink group-hover:text-bloom-indigo transition-colors">
                              {names || e.title}
                            </span>
                            {isPersonal(e) && <span className="text-dream-faint">（個人）</span>}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="text-[12px] text-dream-faint">—</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
