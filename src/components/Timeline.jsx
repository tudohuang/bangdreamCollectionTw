import { formatMonthDay } from '../utils/share.js'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import Icon from './Icon.jsx'

export default function Timeline({ events, onSelect }) {
  // 依年份分段
  const byYear = new Map()
  for (const e of events) {
    if (!byYear.has(e.year)) byYear.set(e.year, [])
    byYear.get(e.year).push(e)
  }
  const years = [...byYear.entries()].sort((a, b) => a[0] - b[0])

  return (
    <div className="relative">
      {/* 主時間線 */}
      <div className="absolute left-[18px] sm:left-[26px] top-2 bottom-2 w-[2px] bg-dream-line" />

      <div className="space-y-10">
        {years.map(([year, arr]) => (
          <div key={year}>
            {/* 年份節點 */}
            <div className="relative flex items-center gap-3 mb-4 pl-1">
              <span className="grid place-items-center w-9 h-9 sm:w-[52px] sm:h-[52px] rounded-full bg-bloom-indigo text-white font-display font-bold text-[13px] sm:text-[15px] ring-4 ring-white/70 z-10">
                {String(year).slice(2)}
              </span>
              <span className="font-display font-extrabold text-2xl text-dream-ink">{year}</span>
              <span className="text-[13px] font-round font-semibold text-dream-sub">{arr.length} 場</span>
            </div>

            {/* 該年活動 */}
            <ul className="space-y-3 pl-[44px] sm:pl-[64px]">
              {arr.map(e => {
                const meta = primaryMeta(e)
                const sameDay = e.startDate === e.endDate
                const md = formatMonthDay(e.startDate)
                const day = sameDay ? md : `${md}→${formatMonthDay(e.endDate)}`
                return (
                  <li key={e.id} className="relative">
                    {/* 節點圓點 */}
                    <span
                      className="absolute -left-[34px] sm:-left-[46px] top-4 w-3 h-3 rounded-full ring-4 ring-white/80 z-10"
                      style={{ background: meta.color }}
                    />
                    <button
                      onClick={() => onSelect(e.id)}
                      className="event-card group w-full text-left p-4 flex items-center gap-4"
                      style={{ '--band': meta.glow }}
                    >
                      <div className="shrink-0 text-center w-12">
                        <div className="font-round font-bold text-[13px]" style={{ color: meta.color }}>
                          {(day.match(/\d{2}\.\d{2}/) || [day])[0].replace('.', '/')}
                        </div>
                        <div className="text-[10px] text-dream-faint mt-0.5">#{String(e.number).padStart(3, '0')}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-bold text-[14.5px] text-dream-ink line-clamp-1">{e.title}</div>
                        <div className="flex items-center gap-2 mt-1 text-[12px] text-dream-sub">
                          <span className="inline-flex items-center gap-1" style={{ color: meta.color }}>
                            <Icon n={isPersonal(e) ? 'user' : meta.icon} className="text-[10px]" />
                            {isPersonal(e) ? '個人' : meta.name}
                          </span>
                          {e.type && <><span className="text-dream-line">·</span><span className="truncate">{e.type}</span></>}
                        </div>
                      </div>
                      {e.isFullBand && <span className="badge badge-full shrink-0 hidden sm:inline-flex"><Icon n="star" className="text-[9px]" /> 全團</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
