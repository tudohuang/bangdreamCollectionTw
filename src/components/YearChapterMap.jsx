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
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, 2)
}

// 設歌單版型：一年一列，巨型年份 + 密度譜 + 代表場次
export default function YearChapterMap({ events, activeYear, onSelectYear }) {
  const years = useMemo(() => groupByYear(events), [events])

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="eyebrow"><Icon n="bars-staggered" className="text-[10px]" /> Setlist</div>
          <h2 className="section-h mt-2">一年一章，逐年翻閱</h2>
          <p className="mt-2 text-[13px] text-dream-sub">點任何一年，圖鑑牆就只留下那一年的場次。</p>
        </div>
        <button
          className={`pill shrink-0 ${activeYear === 'all' ? 'pill-active' : ''}`}
          onClick={() => onSelectYear('all')}
        >
          全部年份
        </button>
      </div>

      <div className="space-y-3">
        {years.map(([year, arr], idx) => {
          const isActive = String(activeYear) === String(year)
          const reps = representative(arr)
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
              className="event-card group w-full p-5 sm:p-6 text-left flex items-center gap-5 sm:gap-8"
              style={{ '--band': meta.glow }}
            >
              {/* 巨型年份 */}
              <div className="shrink-0 w-[104px] sm:w-[150px]">
                <div className="text-[10px] font-round font-bold tracking-[0.28em] uppercase text-dream-faint">
                  Chapter {String(idx + 1).padStart(2, '0')}
                </div>
                <div
                  className={`font-display font-extrabold leading-none mt-1 text-[38px] sm:text-[54px] transition-colors group-hover:text-[rgb(var(--band))] ${isActive ? 'text-[rgb(var(--band))]' : 'text-dream-ink'}`}>
                  {year}
                </div>
              </div>

              {/* 密度譜 + 代表場次 */}
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-end gap-[3px] h-9">
                  {arr.slice(0, 40).map((e, i) => {
                    const m = primaryMeta(e)
                    return (
                      <span
                        key={i}
                        className="flex-1 rounded-full max-w-[10px]"
                        style={{
                          height: `${36 + Math.min(e.attendanceCount, 10) * 6.4}%`,
                          background: m.color,
                          opacity: e.category === '本體' ? 1 : 0.45,
                        }}
                      />
                    )
                  })}
                </div>
                <div className="mt-2.5 text-[13px] text-dream-sub truncate">
                  {reps.map(e => e.title).join('　·　')}
                </div>
              </div>

              {/* 場次數 + 前往 */}
              <div className="shrink-0 flex items-center gap-3 sm:gap-5">
                <div className="text-right">
                  <div className="font-display font-extrabold text-xl sm:text-2xl leading-none" style={{ color: meta.color }}>
                    {arr.length}
                  </div>
                  <div className="text-[11px] text-dream-faint mt-1">場</div>
                </div>
                <Icon n="chevron-right" className="text-dream-faint group-hover:translate-x-0.5 transition-transform" style={{ color: isActive ? meta.color : undefined }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
