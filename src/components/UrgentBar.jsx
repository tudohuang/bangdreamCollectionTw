import { formatMonthDay } from '../utils/share.js'
import { eventStatus, daysUntil, weekday } from '../utils/datetime.js'
import { URGENT_LABEL } from '../utils/urgency.js'
import Icon from './Icon.jsx'

// 全站緊急橫幅：Sheet 標「緊急性＝非常」且還沒結束的場次，黏在頁首下方，關不掉。
// 大爆炸情報就是要一進站就撞到臉上，所以它不是可以忽略的小徽章，而是一整條。
export default function UrgentBar({ events, onSelect }) {
  if (!events.length) return null
  const shown = events.slice(0, 3)
  const rest = events.length - shown.length

  return (
    <div className="urgent-bar relative z-10" role="alert" aria-label="緊急情報">
      <div className="max-w-6xl xl:max-w-[1400px] 2xl:max-w-[1560px] mx-auto px-4 sm:px-8 py-1.5 flex flex-col divide-y divide-white/20">
        {shown.map(e => <UrgentRow key={e.id} event={e} onSelect={onSelect} />)}
        {rest > 0 && (
          <a href="#/collection?urgent=yes"
            className="py-1.5 text-[12px] font-bold text-white/85 hover:text-white">
            還有 {rest} 場緊急情報 →
          </a>
        )}
      </div>
    </div>
  )
}

function UrgentRow({ event, onSelect }) {
  const status = eventStatus(event)
  const d = status === 'upcoming' ? daysUntil(event.startDate) : null
  const when = event.startDate
    ? `${event.year}.${formatMonthDay(event.startDate).replace(/^\d{4}\./, '')}${weekday(event.startDate) ? `（${weekday(event.startDate).replace('週', '')}）` : ''}`
    : '日期未定'
  const countdown =
    status === 'ongoing' ? '進行中'
      : d === 0 ? '就是今天'
      : d > 0 ? `還有 ${d} 天`
      : ''

  return (
    <button
      onClick={() => onSelect(event.id)}
      className="group w-full py-1.5 flex items-center gap-2.5 text-left text-white"
    >
      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold tracking-wide">
        <Icon n="triangle-exclamation" className="text-[10px]" />
        {URGENT_LABEL}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold group-hover:underline underline-offset-2">
        {event.title || '未命名活動'}
      </span>
      <span className="shrink-0 hidden sm:inline text-[12px] text-white/85">{when}</span>
      {countdown && (
        <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-rose-700">
          {countdown}
        </span>
      )}
      <Icon n="chevron-right" className="shrink-0 text-[11px] text-white/80" />
    </button>
  )
}
