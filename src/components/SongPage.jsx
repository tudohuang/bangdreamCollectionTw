import { useMemo } from 'react'
import { songProfile, songIndex } from '../utils/songs.js'
import { primaryMeta, bandMeta, rootGroup } from '../utils/bands.js'
import Icon from './Icon.jsx'
import EventRow from './EventRow.jsx'

// 一首歌在台灣的履歷。
//
// 這是這個站唯一別的地方查不到的東西：Setlist.fm 沒有台灣的邦邦場次，
// 官方也不會整理「這首在台灣唱過幾次」。所以這一頁的存在理由很清楚 ——
// 它回答一個只有這裡答得出來的問題。
export default function SongPage({ value, events, onSelect, onClose }) {
  const s = useMemo(() => songProfile(events, value), [events, value])
  const others = useMemo(
    () => songIndex(events).filter(x => x.key !== s?.key && x.count > 1).slice(0, 10),
    [events, s])

  if (!s) {
    return (
      <section className="glass px-6 py-20 text-center">
        <div className="font-display font-bold text-xl text-dream-ink">找不到這首歌</div>
        <p className="mt-2 text-[14px] text-dream-sub">
          可能是還沒有人補這場的曲目，或歌名寫法不一樣。
        </p>
        <button onClick={onClose} className="btn-primary mt-6">回上一頁</button>
      </section>
    )
  }

  const years = [...new Set(s.events.map(e => e.year).filter(Boolean))].sort()
  const bands = [...new Set(s.events.flatMap(e => (e.relatedGroups || []).map(rootGroup)))]
  const m = primaryMeta(s.first)

  const stats = [
    ['唱過', `${s.count} 場`],
    ['第一次', s.first.year ?? '—'],
    ['開場', s.openers > 0 ? `${s.openers} 次` : '—'],
    ['安可', s.encores > 0 ? `${s.encores} 次` : '—'],
  ]

  return (
    <section>
      <button onClick={onClose}
        className="hidden sm:inline-flex items-center gap-1.5 text-[14px] text-dream-sub hover:text-dream-ink transition-colors">
        <Icon n="chevron-left" className="text-[11px]" /> 回上一頁
      </button>

      <div className="mt-4">
        <div className="eyebrow"><Icon n="music" className="text-[10px]" /> Song</div>
        <h2 className="section-h mt-1.5" style={{ color: m.color }}>{s.title}</h2>
        <p className="mt-2 text-[14px] text-dream-sub">
          在台灣唱過 {s.count} 場
          {years.length > 1 && `，橫跨 ${years[0]}–${years[years.length - 1]}`}。
        </p>
        {s.aliases.length > 0 && (
          <p className="mt-1.5 text-[14px] text-dream-faint">
            資料裡也寫作：{s.aliases.join('、')}
          </p>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-4 gap-px rounded-xl overflow-hidden bg-dream-line dark:bg-white/10">
        {stats.map(([k, v]) => (
          <div key={k} className="bg-white px-3 py-3.5 text-center dark:bg-white/[.04]">
            <dd className="font-display font-bold text-[20px] text-dream-ink tabular-nums leading-none">{v}</dd>
            <dt className="text-[14px] text-dream-faint mt-1.5">{k}</dt>
          </div>
        ))}
      </dl>

      {/* 哪幾團唱過這首。雙團場標了團的話這裡才分得出來 —— 
          「春日影 MyGO 唱過 3 次、Ave Mujica 唱過 1 次」是別的地方沒有的。 */}
      {s.bandList.length > 1 && (
        <div className="mt-5 glass p-5">
          <div className="text-[14px] font-bold text-dream-faint mb-2">誰唱的</div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {s.bandList.map(([g, n]) => {
              const bm = bandMeta(g)
              return (
                <a key={g} href={`#/band/${encodeURIComponent(g)}`}
                  className="inline-flex items-baseline gap-1.5 text-[15px] font-medium hover:opacity-75"
                  style={{ color: bm.color }}>
                  <Icon n={bm.icon} className="text-[10px]" />{g}
                  <span className="text-dream-faint text-[14px] tabular-nums">{n} 次</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {bands.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {bands.map(g => {
            const bm = bandMeta(g)
            return (
              <a key={g} href={`#/band/${encodeURIComponent(g)}`}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium hover:opacity-75 transition-opacity"
                style={{ color: bm.color }}>
                <Icon n={bm.icon} className="text-[10px]" />{g}
              </a>
            )
          })}
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-display font-bold text-[16px] text-dream-ink mb-4">唱過的場次</h3>
        <ul className="space-y-2.5">
          {s.events.slice().reverse().map((e, i) => (
            <li key={e.id}>
              <EventRow event={e} onSelect={onSelect}
                right={<span className="font-round font-bold text-[14px] tabular-nums text-dream-faint">
                  第 {s.count - i} 次
                </span>} />
            </li>
          ))}
        </ul>
      </div>

      {s.people.length > 0 && (
        <div className="mt-8 glass p-6">
          <h3 className="font-display font-bold text-[16px] text-dream-ink mb-3">唱過這首的人</h3>
          <div className="flex flex-wrap gap-2">
            {s.people.map(([name, n]) => (
              <a key={name} href={`#/person/${encodeURIComponent(name)}`} className="pill">
                {name}{n > 1 && <span className="text-dream-faint ml-1">×{n}</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-8">
          <h3 className="font-display font-bold text-[16px] text-dream-ink mb-3">唱過不只一次的其他歌</h3>
          <div className="flex flex-wrap gap-2">
            {others.map(o => (
              <a key={o.key} href={`#/song/${encodeURIComponent(o.key)}`} className="pill">
                {o.title} <span className="text-dream-faint">×{o.count}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
