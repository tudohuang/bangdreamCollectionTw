import { useState } from 'react'
import { formatMonthDay } from '../utils/share.js'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { coverOf } from '../utils/media.js'
import { eventStatus, daysUntil, weekday } from '../utils/datetime.js'
import { detectCity } from '../utils/derive.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'

// 資訊分級：封面圖為主 → 標題 → 一行 meta（日期・場館）→ 一行歸屬。
// 其餘（類型、人物、人次、角色）全部留給詳情頁——卡片是用來「掃」的。
export default function EventCard({ event, attended, onToggleAttended, onClick }) {
  const [imgOk, setImgOk] = useState(true)
  const dex = `#${String(event.number ?? 0).padStart(3, '0')}`
  const sameDay = event.startDate === event.endDate
  const monthDay = formatMonthDay(event.startDate)
  const dayLabel = sameDay ? monthDay : `${monthDay} → ${formatMonthDay(event.endDate)}`
  const meta = primaryMeta(event)
  const personal = isPersonal(event)
  const cover = imgOk ? coverOf(event) : null
  const status = eventStatus(event)
  const dleft = status === 'upcoming' ? daysUntil(event.startDate) : null
  const wd = weekday(event.startDate)
  const city = detectCity(event)
  const place = event.venue || city

  return (
    <button
      onClick={onClick}
      className="event-card group flex flex-col text-left"
      style={{ '--band': meta.glow }}
      aria-label={`${dex} ${event.title}`}
    >
      {/* 封面（沒圖用樂團色舞台；固定 3:2 版位 → 無 CLS） */}
      <div className="relative w-full aspect-[3/2] overflow-hidden">
        {cover ? (
          <Img src={cover} onError={() => setImgOk(false)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transform-none" />
        ) : (
          <div aria-hidden className="absolute inset-0 grid place-items-center text-4xl"
            style={{ background: `linear-gradient(150deg, rgba(${meta.glow},0.2), rgba(${meta.glow},0.06))`, color: meta.color }}>
            <Icon n={personal ? 'user' : meta.icon} />
          </div>
        )}
        <span className="absolute inset-x-0 bottom-0 h-[3px] z-10" style={{ background: meta.color }} />
        {/* 左上：狀態；右上：打卡 */}
        {dleft != null && (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-bloom-indigo text-white px-2 py-0.5 text-[11px] font-bold shadow-sm">
            {dleft === 0 ? '今天' : `${dleft} 天後`}
          </span>
        )}
        <span
          role="button" tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onToggleAttended?.(event.id) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onToggleAttended?.(event.id) } }}
          aria-label={attended ? '取消已去過' : '標記我去過'}
          title={attended ? '已標記去過' : '標記我去過'}
          className={`absolute right-2.5 top-2.5 z-10 grid place-items-center w-7 h-7 rounded-full transition-colors ${
            attended
              ? 'bg-bloom-indigo text-white shadow-sm'
              : 'bg-black/25 text-white/85 backdrop-blur-sm hover:bg-bloom-indigo'}`}
        ><Icon n="circle-check" className="text-[11px]" /></span>
      </div>

      <div className="flex flex-col gap-1.5 p-4">
        <h3 className="font-display font-bold text-[15px] leading-snug text-dream-ink line-clamp-2 group-hover:text-bloom-violet transition-colors">
          {event.title || '未命名活動'}
        </h3>
        <div className="text-[12px] text-dream-sub flex items-center gap-1.5 min-w-0">
          {event.startDate ? (
            <span className="shrink-0 font-round font-semibold" style={{ color: meta.color }}>
              {event.year}.{dayLabel.replace(/^\d{4}\./, '')}{wd && `（${wd.replace('週', '')}）`}
            </span>
          ) : (
            <span className="shrink-0 text-dream-faint">日期未定</span>
          )}
          {place && <span className="truncate text-dream-faint">· {place}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 min-w-0" style={{ color: meta.color }}>
            <Icon n={personal ? 'user' : meta.icon} className="text-[10px] shrink-0" />
            <span className="truncate font-medium">{personal ? `個人 · ${meta.name}` : meta.name}</span>
          </span>
          <span className="font-round font-bold text-dream-faint shrink-0">{dex}</span>
        </div>
      </div>
    </button>
  )
}
