import { useMemo } from 'react'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { eventStatus, daysUntil, weekday, todayStr } from '../utils/datetime.js'
import { formatMonthDay } from '../utils/share.js'
import Icon from './Icon.jsx'

export default function Upcoming({ events, onSelect }) {
  const today = todayStr()
  // 第一場已在 Hero 的票根卡當主角，這裡接著往下排，不重複
  const list = useMemo(() => {
    return events
      .filter(e => { const s = eventStatus(e, today); return s === 'upcoming' || s === 'ongoing' })
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
      .slice(1, 5)
  }, [events, today])

  if (!list.length) return null

  return (
    <div className="mt-14 sm:mt-20">
      <div className="mb-5">
        <div className="eyebrow"><Icon n="clock" className="text-[10px]" /> Up Next</div>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-dream-ink mt-1.5">接下來還有</h2>
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
                <span className="rounded-full bg-bloom-indigo text-white px-2 py-0.5 text-[11px] font-bold">
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
