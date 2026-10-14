import { primaryMeta, isPersonal } from '../utils/bands.js'
import { eventStatus, countdownLabel, weekday } from '../utils/datetime.js'
import { isUrgent, URGENT_LABEL } from '../utils/urgency.js'
import Cover from './Cover.jsx'

// 一列一場：封面縮圖 ｜ 名稱／日期・樂團・場館 ｜ 右邊一個重點（倒數、編號、或呼叫端給的字）。
// 「本月」的接下來與「資料庫」的列表共用，看熟一邊就會看另一邊。
//
// 縮圖是正方形，直式海報從上緣裁（臉和標題通常在上面），置中裁會切到身體。
// showYear：清單跨年又沒按年份分組時，跟今年不同年的才標年份
// fresh：最近才公布的，標題前面掛一個「新」
export default function AgendaRow({ event: e, onSelect, right, showYear = false, fresh = false, today }) {
  const m = primaryMeta(e)
  const status = eventStatus(e, today)
  const past = status === 'past'
  const urgent = isUrgent(e) && !past
  const [y, mo, d] = (e.startDate || '').split('-')
  const multi = e.endDate && e.endDate !== e.startDate
  const wd = weekday(e.startDate).replace('週', '')
  const countdown = countdownLabel(e, { today })
  const date = e.startDate
    ? `${showYear && y !== (today || '').slice(0, 4) ? `${y}.` : ''}${Number(mo)}.${Number(d)}${wd ? `（${wd}）` : ''}`
      + (multi ? ` – ${Number(e.endDate.slice(5, 7))}.${Number(e.endDate.slice(8, 10))}` : '')
    : '日期未定'

  return (
    <li>
      <button onClick={() => onSelect(e.id)}
        className="group w-full flex items-center gap-3.5 sm:gap-4 px-3 sm:px-4 py-3 text-left transition-colors hover:bg-dream-line/40 dark:hover:bg-white/[.04]">
        <span className={`relative shrink-0 w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 ${past ? 'opacity-70 saturate-[.6]' : ''}`}>
          <Cover event={e} size="sm" sizes="72px" className="absolute inset-0 w-full h-full [&_img]:object-top" />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: m.color }} />
        </span>

        <span className="min-w-0 flex-1">
          <span className={`block font-display font-semibold text-[16px] leading-snug line-clamp-2 group-hover:text-bloom-violet transition-colors ${
            past ? 'text-dream-sub' : 'text-dream-ink'}`}>
            {fresh && <span className="mr-1.5 inline-block align-[2px] rounded px-1.5 py-px text-[12px] font-bold leading-[18px] text-white bg-bloom-rose">新</span>}
            {e.title}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[14px] min-w-0">
            <span className={`shrink-0 font-semibold tabular-nums ${past ? 'text-dream-faint' : 'text-dream-ink'}`}>{date}</span>
            <span className="truncate text-dream-faint">
              <span style={{ color: m.color }}>· {isPersonal(e) ? `個人 · ${m.name}` : m.name}</span>
              {e.venue && ` · ${e.venue}`}
            </span>
          </span>
        </span>

        <span className="shrink-0 text-right text-[14px] tabular-nums">
          {right ?? (
            urgent ? <span className="font-bold text-[rgb(var(--c-urgent))]">{URGENT_LABEL}</span>
              : countdown ? <span className="font-semibold text-bloom-indigo">{countdown}</span>
              : <span className="text-dream-faint font-display">#{String(e.number ?? 0).padStart(3, '0')}</span>
          )}
        </span>
      </button>
    </li>
  )
}

// 一組列表的外框：白底、細邊、列與列之間一條線（iOS 設定頁那種分組列表）
export function AgendaList({ children, className = '' }) {
  return (
    <ul className={`rounded-2xl border border-dream-line bg-white divide-y divide-dream-line overflow-hidden
      dark:bg-white/[.03] dark:border-white/10 dark:divide-white/10 ${className}`}>
      {children}
    </ul>
  )
}
