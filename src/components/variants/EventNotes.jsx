import { useMemo } from 'react'
import { noteOf, setNote, hasNote, TICKET_STATES } from '../../utils/notes.js'
import { primaryMeta, isPersonal } from '../../utils/bands.js'
import { formatMonthDay } from '../../utils/share.js'
import Icon from '../Icon.jsx'

// 版本 B：參戰筆記
//
// 參照 Eventernote 的「ノート」。它把感想與物販備忘分開記，
// 因為那是兩種不同的東西 —— 一個是事後回想，一個是當天要用的。
//
// 為什麼這一版可能最有用：這站的心得欄至今 0 筆，不是因為懶，
// 是因為那個欄位要 300 字。「4/11：表演神，其他全爛」這種一行門檻低太多，
// 而且只有真的在現場的人寫得出來。

const ROWS = [
  ['line', '一句話', '4/11：表演神，其他全爛', 'note-sticky'],
  ['goods', '物販備忘', '亞克力吊飾抽到反田，缺志崎', 'tag'],
  ['seat', '座位', 'B7 排 12 號', 'location-dot'],
  ['with', '同行', '跟阿波、小林', 'user-group'],
]

export default function EventNotes({ events, notes, onChange, onSelect, mode = 'all' }) {
  const list = useMemo(() => {
    const sorted = [...events]
      .filter(e => e.startDate)
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
    return mode === 'noted' ? sorted.filter(e => hasNote(notes, e)) : sorted
  }, [events, notes, mode])

  const counted = events.filter(e => hasNote(notes, e)).length

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="text-[13px] text-dream-sub">
          已寫 <b className="text-dream-ink tabular-nums">{counted}</b> / {events.length} 場
        </p>
        <p className="text-[12px] text-dream-faint">只存在這台裝置</p>
      </div>

      <ul className="space-y-2.5">
        {list.slice(0, 40).map(e => (
          <NoteCard key={e.id} event={e} note={noteOf(notes, e)}
            onPatch={(patch) => onChange(setNote(notes, e, patch))}
            onSelect={onSelect} />
        ))}
      </ul>
    </div>
  )
}

function NoteCard({ event, note, onPatch, onSelect }) {
  const m = primaryMeta(event)
  const filled = Object.keys(note).filter(k => k !== 'ticket').length

  return (
    <li className="rounded-xl border border-dream-line dark:border-white/10 overflow-hidden">
      <div className="flex items-center gap-3 px-3.5 py-2.5"
        style={{ background: `rgba(${m.glow},0.07)` }}>
        <button onClick={() => onSelect(event.id)} className="min-w-0 flex-1 text-left">
          <span className="flex items-baseline gap-2">
            <span className="font-round font-bold text-[12px] tabular-nums" style={{ color: m.color }}>
              #{String(event.number).padStart(3, '0')}
            </span>
            <span className="text-[11.5px] text-dream-faint tabular-nums">
              {formatMonthDay(event.startDate)}
            </span>
          </span>
          <span className="block truncate text-[14px] font-semibold text-dream-ink mt-0.5">
            {event.title}
          </span>
        </button>
        {filled > 0 && (
          <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: m.color }}>{filled}</span>
        )}
      </div>

      <div className="px-3.5 py-3 space-y-2.5">
        {ROWS.map(([key, label, placeholder, icon]) => (
          <label key={key} className="flex items-start gap-2.5">
            <span className="shrink-0 grid place-items-center w-7 h-7 rounded-lg mt-0.5"
              style={{ background: `rgba(${m.glow},0.12)`, color: m.color }}>
              <Icon n={icon} className="text-[11px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-dream-faint mb-1">{label}</span>
              <input
                value={note[key] || ''}
                onChange={(ev) => onPatch({ [key]: ev.target.value })}
                placeholder={placeholder}
                className="w-full bg-transparent border-0 border-b border-dream-line focus:border-bloom-indigo outline-none text-[13.5px] text-dream-ink placeholder:text-dream-faint/60 pb-1 dark:border-white/10"
              />
            </span>
          </label>
        ))}

        {/* 票排了沒 —— Eventernote 有這個，因為「打算去」跟「票到手」差很多 */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {TICKET_STATES.map(([v, label]) => (
            <button key={v} onClick={() => onPatch({ ticket: v === 'none' ? '' : v })}
              className={`rounded-full px-2.5 py-1 text-[12px] transition-colors ${
                (note.ticket || 'none') === v
                  ? 'text-white'
                  : 'text-dream-sub border border-dream-line dark:border-white/15'}`}
              style={(note.ticket || 'none') === v ? { background: m.color } : undefined}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </li>
  )
}
