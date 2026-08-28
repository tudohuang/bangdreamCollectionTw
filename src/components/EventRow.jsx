import { primaryMeta, isPersonal } from '../utils/bands.js'
import { formatMonthDay } from '../utils/share.js'
import Icon from './Icon.jsx'

// 一列活動。場館頁／初來台頁／空窗頁共用 —— 這三頁都是「一串活動」，
// 各自複製一份的話，改一次樣式要改三個地方。
export default function EventRow({ event: e, onSelect, right }) {
  const m = primaryMeta(e)
  return (
    <button onClick={() => onSelect(e.id)}
      className="event-card group w-full flex items-center gap-3 p-3.5 text-left"
      style={{ '--band': m.glow }}>
      <span className="shrink-0 w-16 text-center">
        <span className="block font-round font-bold text-[13px]" style={{ color: m.color }}>{e.year}</span>
        <span className="block text-[11px] text-dream-faint">
          {e.startDate ? formatMonthDay(e.startDate).replace(/^\d{4}\./, '') : '未定'}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-semibold text-[15px] text-dream-ink line-clamp-1 group-hover:text-bloom-violet transition-colors">
          {e.title}
        </span>
        <span className="flex items-center gap-1.5 text-[13px] text-dream-sub">
          <Icon n={isPersonal(e) ? 'user' : m.icon} className="text-[9px]" style={{ color: m.color }} />
          {isPersonal(e) ? '個人' : m.name}
          {e.venue && <span className="text-dream-faint truncate hidden sm:inline">· {e.venue}</span>}
        </span>
      </span>
      {right ? <span className="shrink-0 text-right">{right}</span>
             : <Icon n="chevron-right" className="shrink-0 text-dream-faint" />}
    </button>
  )
}
