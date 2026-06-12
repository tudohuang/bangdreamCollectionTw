import { useMemo } from 'react'
import { primaryMeta, bandKey, BAND_META } from '../utils/bands.js'
import Icon from './Icon.jsx'

function groupByYear(events) {
  const map = new Map()
  for (const e of events) {
    if (!map.has(e.year)) map.set(e.year, [])
    map.get(e.year).push(e)
  }
  for (const [, arr] of map) arr.sort((a, b) => a.startDate.localeCompare(b.startDate))
  return [...map.entries()].sort((a, b) => a[0] - b[0])
}

function representative(arr) {
  const score = (e) =>
    (e.category === '本體' ? 8 : 0) +
    (e.isFullBand ? 4 : 0) +
    Math.min(e.attendanceCount || 0, 10) / 10
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, 3)
}

export default function YearChapterMap({ events, activeYear, onSelectYear }) {
  const years = useMemo(() => groupByYear(events), [events])
  const maxCount = useMemo(() => Math.max(...years.map(([, a]) => a.length)), [years])

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="eyebrow"><Icon n="star" className="text-[10px]" /> Chapters</div>
          <h2 className="section-h mt-2">沿著年份翻閱</h2>
        </div>
        <button
          className={`pill ${activeYear === 'all' ? 'pill-active' : ''}`}
          onClick={() => onSelectYear('all')}
        >
          全部年份
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
        {years.map(([year, arr], idx) => {
          const isActive = String(activeYear) === String(year)
          const reps = representative(arr)
          const density = Math.round((arr.length / maxCount) * 100)
          // 該年最常出現的樂團當主色
          const tally = {}
          for (const e of arr) for (const g of (e.relatedGroups || [])) tally[bandKey(g)] = (tally[bandKey(g)] || 0) + 1
          const topKey = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other'
          const meta = BAND_META[topKey]

          return (
            <button
              key={year}
              onClick={() => onSelectYear(year)}
              aria-pressed={isActive}
              className="event-card group p-6 text-left flex flex-col"
              style={{ '--band': meta.glow }}
            >
              {/* 年份大字 */}
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-round font-bold tracking-[0.2em] uppercase text-dream-faint">
                    Chapter {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="font-display font-extrabold text-[46px] leading-none mt-1" style={{ color: meta.color }}>
                    {year}
                  </div>
                </div>
                <span className="font-round font-bold text-[13px] text-dream-sub bg-white/60 rounded-full px-2.5 py-1">
                  {arr.length} 場
                </span>
              </div>

              {/* 樂團色票密度條 */}
              <div className="mt-5 flex items-end gap-[3px] h-8">
                {arr.slice(0, 26).map((e, i) => {
                  const m = primaryMeta(e)
                  return (
                    <span
                      key={i}
                      className="flex-1 rounded-full min-w-[3px]"
                      style={{
                        height: `${36 + Math.min(e.attendanceCount, 10) * 6.4}%`,
                        background: m.color,
                        opacity: e.category === '本體' ? 1 : 0.5,
                      }}
                    />
                  )
                })}
              </div>

              {/* 代表活動 */}
              <ul className="mt-5 space-y-2 text-[13px]">
                {reps.map(e => {
                  const m = primaryMeta(e)
                  return (
                    <li key={e.id} className="flex gap-2 items-start text-dream-sub">
                      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                      <span className="truncate">{e.title}</span>
                    </li>
                  )
                })}
              </ul>

              {/* 進度條 */}
              <div className="mt-5 flex items-center gap-2.5">
                <div className="flex-1 h-2 rounded-full bg-white/55 overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${density}%`, background: meta.color }} />
                </div>
                <span className="text-[11px] font-round font-bold text-dream-faint">{density}%</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
