import { useMemo } from 'react'
import { noteOf, setNote, TICKET_STATES } from '../../utils/notes.js'
import { primaryMeta, isPersonal } from '../../utils/bands.js'
import { formatMonthDay } from '../../utils/share.js'
import { todayStr, daysUntil } from '../../utils/datetime.js'
import { downloadIcs } from '../../utils/ics.js'
import Icon from '../Icon.jsx'

// 版本 C：活動整理
//
// 前兩版都在整理「已經發生的事」。這一版整理「還沒發生的事」——
// 哪幾場要去、票排了沒、什麼時候開賣、要準備什麼。
//
// 參照 Eventernote 的兩個功能：「後で確認できるチケット手配状況」
// 與一鍵加行事曆。這站已經有 ICS 匯出，缺的是把它跟「我要去哪幾場」接起來。
//
// 排序刻意不用日期而是「急迫度」：開賣日到了的排最前面，
// 因為那是唯一有時效、錯過就沒了的事。

const urgencyOf = (event, note, today) => {
  const days = daysUntil(event.startDate)
  const ticket = note.ticket || 'none'
  // 開賣日已到但票還沒到手 —— 最急
  if (event.ticketDate && event.ticketDate <= today && ticket !== 'ticketed' && ticket !== 'done') return 0
  if (ticket === 'planned') return 1
  if (ticket === 'ticketed') return 2
  return 3 + (days ?? 999) / 1000
}

export default function PrepBoard({ events, notes, onChange, onSelect }) {
  const today = todayStr()

  const upcoming = useMemo(() => {
    return events
      .filter(e => e.startDate && (e.endDate || e.startDate) >= today)
      .map(e => ({ event: e, note: noteOf(notes, e) }))
      .sort((a, b) => urgencyOf(a.event, a.note, today) - urgencyOf(b.event, b.note, today))
  }, [events, notes, today])

  const going = upcoming.filter(x => ['planned', 'ticketed'].includes(x.note.ticket))
  const needTicket = upcoming.filter(x =>
    x.event.ticketDate && x.event.ticketDate <= today &&
    !['ticketed', 'done'].includes(x.note.ticket))

  if (!upcoming.length) {
    return <p className="text-[14px] text-dream-faint py-10 text-center">目前沒有還沒發生的場次。</p>
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden bg-dream-line dark:bg-white/10 mb-5">
        {[['即將登場', upcoming.length], ['我要去', going.length], ['該搶票了', needTicket.length]].map(([label, n], i) => (
          <div key={label} className="bg-white px-3 py-3 text-center dark:bg-white/[.04]">
            <div className={`font-display font-bold text-[22px] leading-none tabular-nums ${
              i === 2 && n > 0 ? 'text-bloom-rose' : 'text-dream-ink'}`}>{n}</div>
            <div className="text-[11.5px] text-dream-faint mt-1.5">{label}</div>
          </div>
        ))}
      </div>

      {going.length > 0 && (
        <button onClick={() => downloadIcs(going.map(x => x.event), 'bangdream-going.ics')}
          className="btn-ghost w-full mb-4 !h-11">
          <Icon n="calendar" className="text-[12px]" /> 把這 {going.length} 場加進行事曆
        </button>
      )}

      <ul className="space-y-2">
        {upcoming.map(({ event, note }) => {
          const m = primaryMeta(event)
          const days = daysUntil(event.startDate)
          const ticket = note.ticket || 'none'
          const onSale = event.ticketDate && event.ticketDate <= today
          const alert = onSale && !['ticketed', 'done'].includes(ticket)

          return (
            <li key={event.id}
              className={`rounded-xl border px-3.5 py-3 ${
                alert ? 'border-bloom-rose/50 bg-bloom-rose/[.05]' : 'border-dream-line dark:border-white/10'}`}>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-12 text-center">
                  <span className="block font-display font-extrabold text-[19px] leading-none tabular-nums"
                    style={{ color: m.color }}>{days != null && days >= 0 ? days : '—'}</span>
                  <span className="block text-[10.5px] text-dream-faint mt-1">天後</span>
                </span>

                <button onClick={() => onSelect(event.id)} className="min-w-0 flex-1 text-left">
                  <span className="block text-[14px] font-semibold text-dream-ink line-clamp-2">
                    {event.title}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-dream-faint mt-1">
                    <span className="tabular-nums">{formatMonthDay(event.startDate)}</span>
                    {event.venue && <span className="truncate">· {event.venue}</span>}
                    <span>· {isPersonal(event) ? '個人' : m.name}</span>
                  </span>
                  {event.ticketDate && (
                    <span className={`inline-flex items-center gap-1 mt-1.5 text-[12px] font-medium ${
                      alert ? 'text-bloom-rose' : 'text-dream-sub'}`}>
                      <Icon n="clock" className="text-[9px]" />
                      {onSale ? '已開賣' : `${formatMonthDay(event.ticketDate)} 開賣`}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2.5 pl-[60px]">
                {TICKET_STATES.map(([v, label]) => (
                  <button key={v}
                    onClick={() => onChange(setNote(notes, event, { ticket: v === 'none' ? '' : v }))}
                    className={`rounded-full px-2.5 py-1 text-[12px] transition-colors ${
                      ticket === v ? 'text-white' : 'text-dream-sub border border-dream-line dark:border-white/15'}`}
                    style={ticket === v ? { background: m.color } : undefined}>
                    {label}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
