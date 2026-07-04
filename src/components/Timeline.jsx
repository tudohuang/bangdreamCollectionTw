import { formatMonthDay } from '../utils/share.js'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import Icon from './Icon.jsx'

// 路線圖式時間軸：一條粉→紫漸層幹線，年份是「車站」，場次是樂團色的停靠點。
export default function Timeline({ events, onSelect }) {
  // 依年份分段
  const byYear = new Map()
  for (const e of events) {
    if (!byYear.has(e.year)) byYear.set(e.year, [])
    byYear.get(e.year).push(e)
  }
  const years = [...byYear.entries()].sort((a, b) => a[0] - b[0])

  return (
    <div className="relative pl-1">
      {/* 幹線 */}
      <div aria-hidden className="absolute left-[25px] top-3 bottom-3 w-[3px] rounded-full opacity-80"
        style={{ background: 'linear-gradient(180deg, #ec4899, #a855f7 55%, #22d3ee)' }} />

      <div className="space-y-8">
        {years.map(([year, arr]) => (
          <div key={year}>
            {/* 年份站牌 */}
            <div className="relative flex items-center gap-3 mb-3">
              <span className="grid place-items-center w-[52px] h-9 rounded-full text-white font-display font-bold text-[14px] z-10 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                {year}
              </span>
              <span className="text-[12px] font-round font-semibold text-dream-sub">{arr.length} 場</span>
              <span className="block flex-1 h-px bg-dream-line" />
            </div>

            {/* 停靠點 */}
            <ul>
              {arr.map(e => {
                const meta = primaryMeta(e)
                const sameDay = e.startDate === e.endDate
                const md = formatMonthDay(e.startDate)
                const day = e.startDate
                  ? (sameDay ? md : `${md}→${formatMonthDay(e.endDate)}`).replace(/\d{4}\./g, '')
                  : '未定'
                return (
                  <li key={e.id} className="relative">
                    <button
                      onClick={() => onSelect(e.id)}
                      className="group w-full text-left flex items-center gap-3 rounded-xl py-2 pl-[20px] pr-3 hover:bg-white dark:hover:bg-white/[.06] transition-colors"
                    >
                      {/* 停靠點圓點（壓在幹線上） */}
                      <span aria-hidden
                        className="shrink-0 w-[13px] h-[13px] rounded-full ring-[3px] ring-dream-bg z-10 transition-transform group-hover:scale-125"
                        style={{ background: meta.color }} />
                      <span className="shrink-0 w-[76px] font-round font-bold text-[12px]" style={{ color: meta.color }}>
                        {day}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display font-semibold text-[14px] text-dream-ink line-clamp-1 group-hover:text-bloom-violet transition-colors">
                          {e.title}
                        </span>
                        <span className="flex items-center gap-1.5 text-[12px] text-dream-sub">
                          <Icon n={isPersonal(e) ? 'user' : meta.icon} className="text-[9px]" style={{ color: meta.color }} />
                          {isPersonal(e) ? '個人' : meta.name}
                          {e.venue && <span className="text-dream-faint truncate hidden sm:inline">· {e.venue}</span>}
                        </span>
                      </span>
                      {e.isFullBand && <span className="badge badge-full shrink-0 hidden sm:inline-flex"><Icon n="star" className="text-[9px]" /> 全團</span>}
                      <span className="shrink-0 font-round font-bold text-[11px] text-dream-faint">
                        #{String(e.number).padStart(3, '0')}
                      </span>
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
