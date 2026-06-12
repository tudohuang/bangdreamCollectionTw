import { useState } from 'react'
import { formatMonthDay } from '../utils/share.js'
import { primaryMeta, bandMeta, parseGroup, isPersonal } from '../utils/bands.js'
import { coverOf } from '../utils/media.js'
import { eventStatus, daysUntil, weekday } from '../utils/datetime.js'
import { detectCity } from '../utils/derive.js'
import Icon from './Icon.jsx'

export default function EventCard({ event, attended, onToggleAttended, onClick }) {
  const [imgOk, setImgOk] = useState(true)
  const dex = `#${String(event.number ?? 0).padStart(3, '0')}`
  const groups = event.relatedGroups || []
  const people = event.people || []
  const sameDay = event.startDate === event.endDate
  const monthDay = formatMonthDay(event.startDate)
  const dayLabel = sameDay ? monthDay : `${monthDay} → ${formatMonthDay(event.endDate)}`
  const meta = primaryMeta(event)
  const personal = isPersonal(event)
  const cover = imgOk ? coverOf(event) : null
  const roles = groups.flatMap(g => parseGroup(g).parts)
  const status = eventStatus(event)
  const dleft = status === 'upcoming' ? daysUntil(event.startDate) : null
  const wd = weekday(event.startDate)
  const city = detectCity(event)

  return (
    <button
      onClick={onClick}
      className="event-card group p-5 pt-6 flex flex-col gap-3.5"
      style={{ '--band': meta.glow }}
      aria-label={`${dex} ${event.title}`}
    >
      {cover && (
        <div className="-mx-5 -mt-6 mb-1 overflow-hidden" style={{ borderBottom: `2px solid ${meta.color}` }}>
          <img src={cover} alt="" loading="lazy" onError={() => setImgOk(false)}
               className="w-full h-36 object-cover" />
        </div>
      )}

      <div className="relative flex items-center justify-between gap-2">
        {personal ? (
          <span className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-bold max-w-full"
            style={{ background: `rgba(${meta.glow},0.14)`, color: meta.color, border: `1px solid rgba(${meta.glow},0.3)` }}>
            <Icon n="user" className="text-[10px]" /><span className="truncate">個人來台</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded pl-1 pr-3 py-1 text-[12.5px] font-bold text-white max-w-full"
            style={{ background: meta.color }}>
            <span className="grid place-items-center w-5 h-5 rounded bg-white/25 text-[11px]"><Icon n={meta.icon} /></span>
            <span className="truncate">{meta.name}</span>
          </span>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            role="button" tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onToggleAttended?.(event.id) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onToggleAttended?.(event.id) } }}
            aria-label={attended ? '取消已去過' : '標記我去過'}
            title={attended ? '已標記去過' : '標記我去過'}
            className={`grid place-items-center w-6 h-6 rounded ${attended ? 'bg-bloom-indigo text-white' : 'border border-dream-line text-dream-faint hover:text-dream-ink'}`}
          ><Icon n="circle-check" className="text-[11px]" /></span>
          <span className="font-round font-bold text-[14px]" style={{ color: meta.color }}>{dex}</span>
        </div>
      </div>

      <h3 className="font-display font-bold text-[16px] leading-relaxed text-dream-ink line-clamp-3">
        {event.title || '未命名活動'}
      </h3>

      <div className="flex items-center gap-2 flex-wrap text-[12.5px] text-dream-sub">
        {event.startDate && (
          <span className="inline-flex items-center gap-1.5">
            <Icon n="calendar" className="text-bloom-indigo" />
            {event.year}.{dayLabel.replace(/^\d{4}\./, '')}{wd && `（${wd.replace('週', '')}）`}
          </span>
        )}
        {dleft != null && (
          <span className="rounded bg-bloom-indigo text-white px-1.5 py-0.5 text-[11px] font-bold">
            {dleft === 0 ? '今天' : `${dleft} 天後`}
          </span>
        )}
        {status === 'past' && <span className="text-[11px] text-dream-faint">已結束</span>}
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[12px] text-dream-sub">
        {event.type && <span className="truncate max-w-[180px]">{event.type}</span>}
        {city && <span className="inline-flex items-center gap-1"><Icon n="location-dot" className="text-bloom-rose text-[10px]" />{city}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {personal ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[12px] font-medium"
              style={{ background: `rgba(${meta.glow},0.12)`, color: meta.color }}>
              <Icon n={meta.icon} className="text-[10px]" />{meta.name}
            </span>
            {roles.slice(0, 1).map(r => <span key={r} className="badge badge-side">飾 {r}</span>)}
          </>
        ) : (
          <>
            <span className="badge badge-core">本體</span>
            {event.isFullBand && <span className="badge badge-full"><Icon n="star" className="text-[9px]" /> 全團</span>}
            {groups.slice(1, 3).map(g => {
              const m = bandMeta(g)
              return <span key={g} className="badge badge-side" style={{ color: m.color }}>{m.name}</span>
            })}
          </>
        )}
      </div>

      <div className="mt-auto pt-3.5 border-t border-dream-line flex items-center justify-between gap-2.5">
        <div className="text-[12.5px] text-dream-sub truncate flex items-center gap-1.5">
          {people.length ? (
            <>
              <Icon n="microphone" className="text-bloom-rose shrink-0" />
              <span className="truncate text-dream-ink">
                {people.slice(0, 3).join('、')}{people.length > 3 ? ` +${people.length - 3}` : ''}
              </span>
            </>
          ) : <span className="text-dream-faint">尚無聲優資料</span>}
        </div>
        {event.attendanceCount > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded text-[12px] font-bold text-white" style={{ background: meta.color }}>
            <Icon n="user" className="text-[10px]" />{event.attendanceCount}
          </span>
        )}
      </div>
    </button>
  )
}
