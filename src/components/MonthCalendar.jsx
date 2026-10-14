import { primaryMeta } from '../utils/bands.js'
import { monthGrid } from '../utils/parsePulse.js'
import Cover from './Cover.jsx'

// 本月頁的月曆：封面月曆。
// 有活動的那天整格鋪封面，日期壓在上面（名稱太擠，滑過看提示）；
// 沒活動的日子是淡淡的小方塊。跨日場次的後面幾天鋪樂團色淡底＋一條色線，看得出是連著的。
// 同一天兩場以上：鋪第一場的封面，角上標 +N。
const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export default function MonthCalendar({ ym, events, today, onSelect, className = '' }) {
  const weeks = monthGrid(ym)
  const on = (day) => events.filter(e => e.startDate <= day && (e.endDate || e.startDate) >= day)

  return (
    <div className={`rounded-3xl border border-dream-line bg-white p-2.5 sm:p-4 dark:bg-white/[.03] dark:border-white/10 ${className}`}>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-1.5">
        {WEEK.map((w, i) => (
          <div key={w} className={`py-1 text-center text-[14px] font-semibold ${i === 0 || i === 6 ? 'text-bloom-rose' : 'text-dream-faint'}`}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weeks.flat().map((day, i) => {
          if (!day) return <div key={i} />
          const list = on(day)
          const starts = list.filter(e => e.startDate === day)
          const spans = list.filter(e => e.startDate !== day)
          const lead = starts[0] || spans[0]
          return (
            <DayTile key={day} day={day} today={today} lead={lead} starts={starts} spans={spans}
              total={list.length} weekend={i % 7 === 0 || i % 7 === 6} onSelect={onSelect} />
          )
        })}
      </div>
    </div>
  )
}

function DayTile({ day, today, lead, starts, spans, total, weekend, onSelect }) {
  const n = Number(day.slice(8))
  const isToday = day === today
  const past = day < today
  const ring = isToday ? 'ring-2 ring-bloom-indigo ring-offset-2 ring-offset-white dark:ring-offset-[#0b0a24]' : ''
  const base = 'relative block w-full aspect-square sm:aspect-[5/4] rounded-xl sm:rounded-2xl overflow-hidden text-left'

  // 沒有活動
  if (!lead) {
    return (
      <div className={`${base} bg-dream-line/40 dark:bg-white/[.04] ${ring}`}>
        <span className={`absolute left-1.5 top-1 sm:left-2.5 sm:top-2 text-[14px] font-semibold tabular-nums ${
          isToday ? 'text-bloom-indigo' : past ? 'text-dream-faint/70' : weekend ? 'text-bloom-rose/80' : 'text-dream-sub'}`}>{n}</span>
      </div>
    )
  }

  const m = primaryMeta(lead)

  // 跨日場次的延續日：樂團色淡底，不再重複放封面
  if (!starts.length) {
    return (
      <button onClick={() => onSelect(lead.id)} title={lead.title}
        className={`${base} transition-transform hover:-translate-y-0.5 ${ring} ${past ? 'opacity-60' : ''}`}
        style={{ background: `rgba(${m.glow},0.16)` }}>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1" style={{ background: m.color }} />
        <span className="absolute left-1.5 top-1 sm:left-2.5 sm:top-2 text-[14px] font-semibold tabular-nums text-dream-ink">{n}</span>
      </button>
    )
  }

  // 開始日：整格封面
  return (
    <button onClick={() => onSelect(lead.id)} title={[...starts, ...spans].map(e => e.title).join('\n')}
      className={`${base} group shadow-sm transition-transform hover:-translate-y-0.5 ${ring}`}>
      <Cover event={lead} size="sm" sizes="(max-width: 639px) 14vw, 120px"
        className={`absolute inset-0 w-full h-full [&_img]:object-top transition-transform duration-300 group-hover:scale-105 ${past ? 'saturate-[.5] opacity-80' : ''}`} />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1" style={{ background: m.color }} />
      <span className="absolute left-1.5 top-1 sm:left-2.5 sm:top-2 text-[14px] sm:text-[18px] font-display font-bold tabular-nums text-white drop-shadow">{n}</span>
      {total > 1 && (
        <span className="absolute right-1 top-1 sm:right-2 sm:top-2 rounded-full bg-white/90 px-1.5 text-[12px] font-bold leading-5 text-dream-ink">+{total - 1}</span>
      )}
    </button>
  )
}
