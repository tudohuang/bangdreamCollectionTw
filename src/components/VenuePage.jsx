import { useMemo } from 'react'
import { findVenue, venueIndex } from '../utils/venues.js'
import { bandMeta, rootGroup } from '../utils/bands.js'
import { countingSummary } from '../utils/counting.js'
import Icon from './Icon.jsx'
import EventRow from './EventRow.jsx'

// 場館頁。地點欄是全站唯一 100% 有填的欄位，卻一直沒有地方點得進去 ——
// 「台北世貿一館辦過 9 場」這件事以前只能靠自己數。
export default function VenuePage({ value, events, onSelect, onClose }) {
  const v = useMemo(() => findVenue(events, value), [events, value])
  const others = useMemo(
    () => venueIndex(events).filter(x => x.key !== v?.key && x.events.length > 1).slice(0, 8),
    [events, v])

  if (!v) {
    return (
      <section className="glass px-6 py-20 text-center">
        <div className="font-display font-bold text-xl text-dream-ink">找不到這個場館</div>
        <p className="mt-2 text-[13.5px] text-dream-sub">可能是名字改過，或這個場館還沒有收錄的場次。</p>
        <button onClick={onClose} className="btn-primary mt-6">回上一頁</button>
      </section>
    )
  }

  const list = v.events
  const first = list[0], last = list[list.length - 1]
  const sum = countingSummary(list)

  // 這個場館上過的團，依場次數排
  const bands = [...list.reduce((m, e) => {
    for (const g of e.relatedGroups || []) {
      const k = rootGroup(g)
      m.set(k, (m.get(k) || 0) + 1)
    }
    return m
  }, new Map())].sort((a, b) => b[1] - a[1])

  // 同一個場館出現過的其他寫法。資料有兩種寫法時講清楚，不要偷偷合併。
  const aliases = [...v.names].filter(n => n !== v.name)

  const stats = [
    ['場次', sum.records],
    ['活動日', sum.activeDays],
    ['第一次', first.year],
    ['最近', last.year],
  ]

  return (
    <section>
      <button onClick={onClose}
        className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-dream-sub hover:text-dream-ink transition-colors">
        <Icon n="chevron-left" className="text-[11px]" /> 回上一頁
      </button>

      <div className="mt-4">
        <div className="eyebrow"><Icon n="location-dot" className="text-[10px]" /> Venue</div>
        <h2 className="section-h mt-1.5">{v.name}</h2>
        <p className="mt-2 text-[13.5px] text-dream-sub">
          {v.city && <span className="mr-1.5">{v.city}</span>}
          {first.year === last.year ? `${first.year} 年` : `${first.year}–${last.year}`}
          ，收錄 {list.length} 筆。
        </p>
        {aliases.length > 0 && (
          <p className="mt-1.5 text-[12px] text-dream-faint">
            資料裡也寫作：{aliases.join('、')}
          </p>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-4 gap-px rounded-xl overflow-hidden bg-dream-line dark:bg-white/10">
        {stats.map(([k, val]) => (
          <div key={k} className="bg-white px-3 py-3.5 text-center dark:bg-white/[.04]">
            <dd className="font-display font-bold text-[20px] text-dream-ink tabular-nums leading-none">{val}</dd>
            <dt className="text-[11px] text-dream-faint mt-1.5">{k}</dt>
          </div>
        ))}
      </dl>

      {bands.length > 0 && (
        <div className="mt-5 glass p-6">
          <h3 className="font-display font-bold text-[15px] text-dream-ink mb-3.5">在這裡演出過的</h3>
          <div className="flex flex-wrap gap-2">
            {bands.map(([g, n]) => {
              const m = bandMeta(g)
              return (
                <a key={g} href={`#/band/${encodeURIComponent(g)}`} className="pill"
                  style={{ color: m.color }}>
                  <Icon n={m.icon} className="text-[9px] mr-1" />{g}
                  <span className="text-dream-faint ml-1">×{n}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-9">
        <h2 className="section-h mb-5">在這裡的 <span className="text-dream-faint text-lg font-bold">{list.length}</span></h2>
        <ul className="space-y-2.5">
          {list.slice().reverse().map(e => (
            <li key={e.id}><EventRow event={e} onSelect={onSelect} /></li>
          ))}
        </ul>
      </div>

      {others.length > 0 && (
        <div className="mt-9">
          <h3 className="font-display font-bold text-[15px] text-dream-ink mb-3">其他常用的場館</h3>
          <div className="flex flex-wrap gap-2">
            {others.map(o => (
              <a key={o.key} href={`#/venue/${encodeURIComponent(o.key)}`} className="pill">
                {o.name} <span className="text-dream-faint">×{o.events.length}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
