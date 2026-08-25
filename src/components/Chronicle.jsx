import { useMemo } from 'react'
import log from '../data/changelog.json'
import { chronicle, offsetLabel, beforeShowLabel } from '../utils/chronicle.js'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { formatMonthDay } from '../utils/share.js'
import { todayStr } from '../utils/datetime.js'
import Icon from './Icon.jsx'
import { Section } from './DetailParts.jsx'

// 詳情頁的史料層：這場的時間線、當時她們在別的地方在跑什麼、同時期台灣還發生了什麼。
// 每一區沒資料就整個不出現 —— 空的區塊比沒有還糟。

const dateShort = (d) => formatMonthDay(d).replace(/^(\d{4})\./, '$1.')

export default function Chronicle({ event, allEvents, pulse, color, glow, onNavigate }) {
  const today = todayStr()
  const data = useMemo(
    () => chronicle(event, { changelog: log, allEvents, pulse, today }),
    [event, allEvents, pulse, today])

  const { milestones, around, elsewhere } = data
  if (!milestones.length && !around.length && !elsewhere.length) return null

  return (
    <>
      {milestones.length > 0 && (
        <Section title="這場的時間線" color={color}>
          <ol className="relative pl-5">
            <span aria-hidden className="absolute left-[3px] top-2 bottom-2 w-px"
              style={{ background: `rgba(${glow},0.3)` }} />
            {milestones.map(m => (
              <li key={m.key} className="relative py-1.5">
                <span aria-hidden className="absolute -left-5 top-[11px] w-[7px] h-[7px] rounded-full"
                  style={{ background: m.key === 'show' ? color : `rgba(${glow},0.45)` }} />
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="font-round font-bold text-[13px] tabular-nums" style={{ color }}>
                    {dateShort(m.date)}
                  </span>
                  <span className="text-[14px] font-semibold text-dream-ink">{m.label}</span>
                  {m.offset !== 0 && m.offset !== null && (
                    <span className="text-[12.5px] text-dream-faint">{beforeShowLabel(m.offset)}</span>
                  )}
                </div>
                {m.note && <div className="text-[12.5px] text-dream-faint mt-0.5">{m.note}</div>}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {elsewhere.length > 0 && (
        <Section title="當時的其他行程" color={color}>
          <p className="text-[13px] text-dream-faint mb-3">
            這場前後一個月，出演者在台灣以外的場次。看得出這一站在整趟行程裡的位置。
          </p>
          <div className="space-y-3.5">
            {elsewhere.map(({ name, list }) => (
              <div key={name}>
                <a href={`#/person/${encodeURIComponent(name)}`}
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-dream-ink hover:text-bloom-indigo transition-colors">
                  <Icon n="microphone" className="text-[10px]" style={{ color }} /> {name}
                  <span className="font-normal text-dream-faint">{list.length} 場</span>
                </a>
                <ul className="mt-1.5 space-y-1">
                  {list.map(r => (
                    <li key={r.id} className="flex items-baseline gap-2.5 text-[13px]">
                      <span className="shrink-0 w-[62px] text-right text-dream-faint tabular-nums">
                        {offsetLabel(r.offset)}
                      </span>
                      <span className="min-w-0 flex-1 text-dream-sub">
                        {r.title || r.mainType || '行程'}
                        {r.place && <span className="text-dream-faint"> · {r.place}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {around.length > 0 && (
        <Section title="同時期的台灣" color={color}>
          <p className="text-[13px] text-dream-faint mb-3">
            這場前後 45 天內，台灣還有這些場。
          </p>
          <ul className="space-y-1">
            {around.map(({ event: e, offset }) => {
              const m = primaryMeta(e)
              return (
                <li key={e.id}>
                  <button onClick={() => onNavigate(e.id)}
                    className="group w-full flex items-baseline gap-2.5 py-1 text-left text-[13.5px]">
                    <span className="shrink-0 w-[62px] text-right font-medium tabular-nums"
                      style={{ color: offset === 0 ? color : undefined }}>
                      <span className={offset === 0 ? '' : 'text-dream-faint'}>{offsetLabel(offset)}</span>
                    </span>
                    <Icon n={isPersonal(e) ? 'user' : m.icon} className="shrink-0 text-[9px] translate-y-[-1px]"
                      style={{ color: m.color }} />
                    <span className="min-w-0 flex-1 truncate text-dream-sub group-hover:text-dream-ink transition-colors">
                      {e.title}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </>
  )
}
