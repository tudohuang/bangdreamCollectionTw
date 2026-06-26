import { useMemo } from 'react'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { coverOf } from '../utils/media.js'
import { todayStr, weekday } from '../utils/datetime.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'

// 「那年今天」：歷年同月同日的場次，每天自動變，給人每天回來看一眼的理由
export default function OnThisDay({ events, onSelect }) {
  const today = todayStr()
  const thisYear = Number(today.slice(0, 4))
  const mmdd = today.slice(5)

  const matches = useMemo(() => events
    .filter(e => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.startDate || '')
      return m && `${m[2]}-${m[3]}` === mmdd && Number(m[1]) < thisYear
    })
    .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')),
    [events, mmdd, thisYear])

  if (!matches.length) return null
  const e = matches[0]
  const yearsAgo = thisYear - e.year
  const m = primaryMeta(e)
  const cover = coverOf(e)
  const personal = isPersonal(e)

  return (
    <div className="mt-10 sm:mt-14">
      <div className="flex items-center gap-2 mb-4">
        <Icon n="clock" className="text-bloom-rose" />
        <h2 className="font-display font-bold text-lg text-dream-ink">那年今天</h2>
        <span className="text-[12px] text-dream-faint">{Number(mmdd.slice(0, 2))} 月 {Number(mmdd.slice(3))} 日</span>
      </div>

      <button onClick={() => onSelect(e.id)}
        className="event-card group w-full text-left flex items-stretch gap-0 overflow-hidden"
        style={{ '--band': m.glow }}>
        {cover && (
          <div className="hidden sm:block w-40 shrink-0 overflow-hidden relative">
            <Img src={cover} className="w-full h-full object-cover group-hover:scale-105 motion-reduce:transform-none" />
            <span className="absolute inset-y-0 right-0 w-1" style={{ background: m.color }} />
          </div>
        )}
        <div className="flex-1 min-w-0 p-5 flex flex-col justify-center">
          <div className="font-display font-extrabold text-dream-ink leading-none"
            style={{ fontSize: 'clamp(20px,3.4vw,28px)' }}>
            <span style={{ color: m.color }}>{yearsAgo}</span> 年前的今天
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[12px]" style={{ color: m.color }}>
            <Icon n={personal ? 'user' : m.icon} className="text-[10px]" />
            {personal ? '個人來台' : m.name}
            <span className="text-dream-faint">· {e.year}.{mmdd.replace('-', '.')}（{weekday(e.startDate).replace('週', '')}）</span>
          </div>
          <div className="mt-1.5 font-display font-bold text-[16px] text-dream-ink line-clamp-2 group-hover:text-bloom-indigo transition-colors">
            {e.title}
          </div>
          {matches.length > 1 && (
            <div className="mt-2 text-[12px] text-dream-faint">這天另外還有 {matches.length - 1} 場，點開回味 →</div>
          )}
        </div>
      </button>
    </div>
  )
}
