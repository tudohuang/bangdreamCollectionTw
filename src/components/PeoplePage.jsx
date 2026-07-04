import { useMemo, useState } from 'react'
import { bandMeta, rootGroup } from '../utils/bands.js'
import { buildRoster } from '../utils/derive.js'
import Icon from './Icon.jsx'

// 聲優目錄：資料的主角是「人」。每張卡＝來台次數 + 所屬樂團/角色，點入個人圖鑑頁。
export default function PeoplePage({ events }) {
  const [q, setQ] = useState('')
  const roster = useMemo(() => buildRoster(events), [events])

  const people = useMemo(() => {
    const map = new Map()
    for (const e of events) {
      for (const p of (e.people || [])) {
        if (!map.has(p)) map.set(p, { name: p, count: 0, first: '', last: '', bands: new Set() })
        const r = map.get(p)
        r.count++
        const d = e.startDate || ''
        if (d) {
          if (!r.first || d < r.first) r.first = d
          if (!r.last || d > r.last) r.last = d
        }
        for (const g of (e.relatedGroups || [])) r.bands.add(rootGroup(g))
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [events])

  const shown = useMemo(() => {
    const nq = q.trim().toLowerCase()
    if (!nq) return people
    return people.filter(p =>
      p.name.toLowerCase().includes(nq) ||
      [...p.bands].some(b => b.toLowerCase().includes(nq)) ||
      (roster[p.name]?.char || '').toLowerCase().includes(nq))
  }, [people, q, roster])

  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="eyebrow"><Icon n="microphone" className="text-[10px]" /> Voice Actors</div>
          <h2 className="section-h mt-1.5">聲優目錄</h2>
          <p className="mt-2 text-[13px] text-dream-sub">誰來過、來了幾次，一目瞭然；點進去看完整場次。</p>
        </div>
        <div className="relative w-full sm:w-64">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dream-faint"><Icon n="magnifying-glass" /></span>
          <input type="search" className="dream-input !pl-10" placeholder="搜聲優 / 樂團 / 角色…"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {shown.map(p => {
          const info = roster[p.name]
          const mainBand = info?.band || [...p.bands][0] || ''
          const m = bandMeta(mainBand)
          return (
            <a key={p.name} href={`#/person/${encodeURIComponent(p.name)}`}
              className="event-card group p-4 flex flex-col gap-3"
              style={{ '--band': m.glow }}>
              <div className="flex items-center justify-between">
                <span className="grid place-items-center w-11 h-11 rounded-full text-white font-display font-bold text-[17px] shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${m.color}, rgba(${m.glow},0.7))` }}>
                  {p.name.slice(0, 1)}
                </span>
                <span className="text-right">
                  <span className="block font-display font-extrabold text-[22px] leading-none" style={{ color: m.color }}>{p.count}</span>
                  <span className="block text-[10px] font-bold tracking-[0.15em] uppercase text-dream-faint mt-0.5">visits</span>
                </span>
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-[15px] text-dream-ink truncate group-hover:text-bloom-violet transition-colors">
                  {p.name}
                </div>
                <div className="text-[12px] text-dream-sub truncate mt-0.5">
                  {mainBand && <span style={{ color: m.color }}>{mainBand}</span>}
                  {info?.char && <span className="text-dream-faint">／{info.char}</span>}
                </div>
              </div>
              <div className="mt-auto pt-2.5 border-t border-dream-line text-[11px] text-dream-faint flex items-center justify-between">
                <span>{p.first ? `${p.first.slice(0, 4)} 初登場` : '—'}</span>
                <Icon n="chevron-right" className="text-[10px] group-hover:text-bloom-violet transition-colors" />
              </div>
            </a>
          )
        })}
      </div>
      {shown.length === 0 && (
        <div className="glass px-6 py-16 text-center text-dream-sub text-[14px]">找不到「{q}」</div>
      )}
    </section>
  )
}
