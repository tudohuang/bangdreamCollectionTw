import { useMemo } from 'react'
import { findSeries, seriesIndex } from '../utils/series.js'
import { bandMeta, rootGroup } from '../utils/bands.js'
import Icon from './Icon.jsx'
import EventRow from './EventRow.jsx'

// 系列頁：同一個活動辦過的每一次，照時間排。
//
// 這一頁回答的是「Bushiroad EXPO 每年都帶誰來」——
// 那件事在 59 筆的清單裡看不出來，因為六次分散在四個年份。
export default function SeriesPage({ value, events, onSelect, onClose }) {
  const s = useMemo(() => findSeries(events, value), [events, value])
  const others = useMemo(
    () => seriesIndex(events).filter(x => x.key !== s?.key).slice(0, 6),
    [events, s])

  if (!s) {
    return (
      <section className="glass px-6 py-20 text-center">
        <div className="font-display font-bold text-xl text-dream-ink">找不到這個系列</div>
        <button onClick={onClose} className="btn-primary mt-6">回上一頁</button>
      </section>
    )
  }

  const list = s.events
  const years = [...new Set(list.map(e => e.year).filter(Boolean))].sort()
  // 每一次都帶了誰 —— 這是系列頁真正的內容
  const people = [...list.reduce((m, e) => {
    for (const p of e.people || []) m.set(p, (m.get(p) || 0) + 1)
    return m
  }, new Map())].sort((a, b) => b[1] - a[1])
  const bands = [...new Set(list.flatMap(e => (e.relatedGroups || []).map(rootGroup)))]

  return (
    <section>
      <button onClick={onClose}
        className="hidden sm:inline-flex items-center gap-1.5 text-[14px] text-dream-sub hover:text-dream-ink transition-colors">
        <Icon n="chevron-left" className="text-[11px]" /> 回上一頁
      </button>

      <div className="mt-4">
        <div className="eyebrow"><Icon n="layer-group" className="text-[10px]" /> Series</div>
        <h2 className="section-h mt-1.5">{s.name}</h2>
        <p className="mt-2 text-[14px] text-dream-sub">{s.lead}</p>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-px rounded-xl overflow-hidden bg-dream-line dark:bg-white/10">
        {[['辦過', `${list.length} 次`], ['橫跨', years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0] ?? '—')], ['出演過', `${people.length} 人`]].map(([k, v]) => (
          <div key={k} className="bg-white px-3 py-3.5 text-center dark:bg-white/[.04]">
            <dd className="font-display font-bold text-[20px] text-dream-ink tabular-nums leading-none">{v}</dd>
            <dt className="text-[14px] text-dream-faint mt-1.5">{k}</dt>
          </div>
        ))}
      </dl>

      {bands.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {bands.map(g => {
            const m = bandMeta(g)
            return (
              <a key={g} href={`#/band/${encodeURIComponent(g)}`}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium hover:opacity-75 transition-opacity"
                style={{ color: m.color }}>
                <Icon n={m.icon} className="text-[10px]" />{g}
              </a>
            )
          })}
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-display font-bold text-[16px] text-dream-ink mb-4">每一次</h3>
        <ul className="space-y-2.5">
          {list.map((e, i) => (
            <li key={e.id}>
              <EventRow event={e} onSelect={onSelect}
                right={<span className="font-round font-bold text-[14px] tabular-nums text-dream-faint">第 {i + 1} 次</span>} />
            </li>
          ))}
        </ul>
      </div>

      {people.length > 0 && (
        <div className="mt-8 glass p-6">
          <h3 className="font-display font-bold text-[16px] text-dream-ink mb-3">來過的人</h3>
          <div className="flex flex-wrap gap-2">
            {people.map(([name, n]) => (
              <a key={name} href={`#/person/${encodeURIComponent(name)}`} className="pill">
                {name}{n > 1 && <span className="text-dream-faint ml-1">×{n}</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-8">
          <h3 className="font-display font-bold text-[16px] text-dream-ink mb-3">其他系列</h3>
          <div className="flex flex-wrap gap-2">
            {others.map(o => (
              <a key={o.key} href={`#/series/${encodeURIComponent(o.key)}`} className="pill">
                {o.name} <span className="text-dream-faint">×{o.events.length}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
