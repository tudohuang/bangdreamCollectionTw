import { useMemo } from 'react'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { eventStatus, daysUntil, weekday, todayStr } from '../utils/datetime.js'
import { formatMonthDay } from '../utils/share.js'
import Icon from './Icon.jsx'

export default function Upcoming({ events, onSelect }) {
  const today = todayStr()
  const list = useMemo(() => {
    return events
      .filter(e => { const s = eventStatus(e, today); return s === 'upcoming' || s === 'ongoing' })
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
      .slice(0, 4)
  }, [events, today])

  if (!list.length) return null

  return (
    <div className="mt-10 sm:mt-14">
      <div className="flex items-center gap-2 mb-4">
        <Icon n="clock" className="text-bloom-indigo" />
        <h2 className="font-display font-bold text-lg text-dream-ink">即將到來</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {list.map(e => {
          const m = primaryMeta(e)
          const d = daysUntil(e.startDate, today)
          const md = formatMonthDay(e.startDate)
          return (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              className="event-card p-4 text-left flex flex-col gap-1.5"
              style={{ '--band': m.glow }}
            >
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-round font-bold" style={{ color: m.color }}>
                  {e.year}.{md.replace(/^\d{4}\./, '')}（{weekday(e.startDate).replace('週', '')}）
                </span>
                <span className="rounded bg-bloom-indigo text-white px-1.5 py-0.5 text-[11px] font-bold">
                  {d === 0 ? '今天' : d > 0 ? `${d} 天後` : '進行中'}
                </span>
              </div>
              <div className="font-display font-bold text-[14px] text-dream-ink line-clamp-2">{e.title}</div>
              <div className="text-[12px] text-dream-sub flex items-center gap-1.5">
                <Icon n={isPersonal(e) ? 'user' : m.icon} className="text-[10px]" style={{ color: m.color }} />
                {isPersonal(e) ? '個人' : m.name}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
