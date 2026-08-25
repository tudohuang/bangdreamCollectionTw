import { formatMonthDay } from '../utils/share.js'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { yearGaps } from '../utils/insights.js'
import { isUrgent, URGENT_LABEL } from '../utils/urgency.js'
import Icon from './Icon.jsx'

// 路線圖式時間軸：年份是站牌，場次是樂團色的停靠點。
// 中間完全沒有場次的年份不跳過，改用一段虛線標示。
export default function Timeline({ events, onSelect, allEvents }) {
  // 依年份分段
  const byYear = new Map()
  for (const e of events) {
    if (!byYear.has(e.year)) byYear.set(e.year, [])
    byYear.get(e.year).push(e)
  }
  const years = [...byYear.entries()].sort((a, b) => a[0] - b[0])

  // 空白年份要看「全站」才算數，不然一篩選就會冒出假的空隙
  const gaps = yearGaps(allEvents?.length ? allEvents : events)
  const gapBefore = new Map(gaps.map(g => [g.before, g]))

  return (
    <div className="relative pl-1">
      {/* 幹線 */}
      <div aria-hidden className="absolute left-[25px] top-3 bottom-3 w-[3px] rounded-full opacity-80"
        style={{ background: 'linear-gradient(180deg, #ec4899, #a855f7 55%, #22d3ee)' }} />

      <div className="space-y-8">
        {years.map(([year, arr], yi) => (
          <div key={year}>
            {/* 前一個站牌與這個站牌之間，整段是空的 */}
            {gapBefore.get(year) && years[yi - 1]?.[0] === gapBefore.get(year).after && (
              <GapNote gap={gapBefore.get(year)} />
            )}
            {/* 年份站牌：捲動時貼在頂上，長清單裡永遠知道自己在哪一年 */}
            <div className="sticky top-[var(--wall-top)] z-20 relative flex items-center gap-3 mb-3 py-1.5
              bg-dream-bg/95 backdrop-blur-md">
              <span className="grid place-items-center w-[52px] h-9 rounded-full text-white font-display font-bold text-[15px] z-10 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                {year}
              </span>
              <span className="text-[13px] font-round font-semibold text-dream-sub">{arr.length} 場</span>
              <span className="block flex-1 h-px bg-dream-line" />
            </div>

            {/* 停靠點 */}
            <ul>
              {arr.map(e => {
                const meta = primaryMeta(e)
                const urgent = isUrgent(e)
                const sameDay = e.startDate === e.endDate
                const md = formatMonthDay(e.startDate)
                const day = e.startDate
                  ? (sameDay ? md : `${md}→${formatMonthDay(e.endDate)}`).replace(/\d{4}\./g, '')
                  : '未定'
                return (
                  <li key={e.id} className="relative">
                    <button
                      onClick={() => onSelect(e.id)}
                      className={`group w-full text-left flex items-center gap-3 rounded-xl py-2 pl-[20px] pr-3 hover:bg-white dark:hover:bg-white/[.06] transition-colors ${
                        urgent ? 'ring-1 ring-inset' : ''}`}
                      style={urgent
                        ? { background: 'rgba(var(--c-urgent),0.08)', '--tw-ring-color': 'rgba(var(--c-urgent),0.45)' }
                        : undefined}
                    >
                      {/* 停靠點圓點（壓在幹線上）；緊急場次改點紅燈 */}
                      <span aria-hidden
                        className="shrink-0 w-[13px] h-[13px] rounded-full ring-[3px] ring-dream-bg z-10 transition-transform group-hover:scale-125"
                        style={{ background: urgent ? 'rgb(var(--c-urgent))' : meta.color }} />
                      <span className="shrink-0 w-[76px] font-round font-bold text-[13px]" style={{ color: meta.color }}>
                        {day}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display font-semibold text-[15px] text-dream-ink line-clamp-1 group-hover:text-bloom-violet transition-colors">
                          {e.title}
                        </span>
                        <span className="flex items-center gap-1.5 text-[13px] text-dream-sub">
                          <Icon n={isPersonal(e) ? 'user' : meta.icon} className="text-[9px]" style={{ color: meta.color }} />
                          {isPersonal(e) ? '個人' : meta.name}
                          {e.venue && <span className="text-dream-faint truncate hidden sm:inline">· {e.venue}</span>}
                        </span>
                      </span>
                      {urgent && (
                        <span className="urgent-badge shrink-0">
                          <Icon n="triangle-exclamation" className="text-[9px]" /> {URGENT_LABEL}
                        </span>
                      )}
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

// 空白年份：幹線在這裡斷成虛線，旁邊一張紙寫下那幾年沒有發生的事
function GapNote({ gap }) {
  const label = gap.length === 1 ? `${gap.from}` : `${gap.from} – ${gap.to}`
  return (
    <div className="relative mb-8 pl-[52px] pr-1">
      {/* 蓋掉這一段的實線幹線，換成虛線 */}
      <span aria-hidden className="absolute left-[19px] -top-4 -bottom-4 w-4 bg-dream-bg" />
      <span aria-hidden className="absolute left-[25px] -top-4 -bottom-4 w-[3px] -translate-x-[1px]"
        style={{ backgroundImage: 'repeating-linear-gradient(180deg, rgb(var(--c-faint)) 0 5px, transparent 5px 12px)', opacity: 0.55 }} />

      <div className="rounded-2xl border border-dashed border-dream-line dark:border-white/15 px-5 py-4">
        <div className="font-display font-bold text-[17px] text-dream-faint tracking-wide">{label}</div>
        <p className="mt-1.5 font-hand text-[15px] leading-relaxed text-dream-sub">
          整整 {gap.length} 年，一場都沒有。<br className="sm:hidden" />
          {gap.before} 年才又有下一場。
        </p>
      </div>
    </div>
  )
}
