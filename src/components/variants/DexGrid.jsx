import { useMemo } from 'react'
import { dexProgress, slotStatus } from '../../utils/notes.js'
import { primaryMeta } from '../../utils/bands.js'
import Icon from '../Icon.jsx'

// 版本 A：圖鑑完成度
//
// 參照 Discogs 的 Collection —— 但它給的是「你有幾張」，
// 這裡多一層「哪些格子還缺東西」，因為這站的目的是把史料補齊，
// 不只是記錄自己去過幾場。
//
// 59 格排成網格，一格一場。格子的狀態一眼看得出來：
//   實心＝去過　外框＝沒去過　左上角點＝有筆記　右下角缺角＝沒有封面
// 上面四條進度條分別是四種「完整度」，點條可以只看還缺那一項的。

const LEGEND = [
  ['went', '我去過', 'circle-check'],
  ['noted', '有筆記', 'note-sticky'],
  ['covered', '有封面', 'images'],
  ['impressed', '有心得', 'heart'],
]

export default function DexGrid({ events, attended, notes, filter, onFilter, onSelect }) {
  const p = useMemo(() => dexProgress(events, { attended, notes }), [events, attended, notes])

  const shown = useMemo(() => {
    if (!filter) return events
    return events.filter(e => {
      const s = slotStatus(e, { attended: attended?.has(e.id), notes })
      if (filter === 'went') return !s.attended
      if (filter === 'noted') return !s.hasNote
      if (filter === 'covered') return !s.hasCover
      if (filter === 'impressed') return !s.hasImpression
      return true
    })
  }, [events, attended, notes, filter])

  return (
    <div>
      {/* 四條完成度。點下去只看「還缺這一項」的格子 —— 圖鑑就是拿來補的 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {LEGEND.map(([key, label, icon]) => {
          const on = filter === key
          const pct = p[`${key}Pct`]
          const n = p[key]
          return (
            <button key={key} onClick={() => onFilter(on ? null : key)}
              aria-pressed={on}
              className={`text-left rounded-xl px-3.5 py-3 border transition-colors ${
                on ? 'border-bloom-indigo bg-bloom-indigo/[.07]' : 'border-dream-line hover:border-bloom-sky dark:border-white/10'}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-dream-sub">
                  <Icon n={icon} className="text-[10px]" />{label}
                </span>
                <span className="font-display font-bold text-[15px] text-dream-ink tabular-nums">{pct}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-dream-line dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-bloom-sky to-bloom-indigo"
                  style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1.5 text-[11px] text-dream-faint tabular-nums">
                {n} / {p.total}{on && ' · 只看還缺的'}
              </div>
            </button>
          )
        })}
      </div>

      {filter && (
        <p className="mb-3 text-[13px] text-dream-sub">
          還缺「{LEGEND.find(l => l[0] === filter)[1]}」的有 <b className="text-dream-ink">{shown.length}</b> 格
          <button onClick={() => onFilter(null)} className="ml-2 text-[12px] text-bloom-indigo">顯示全部</button>
        </p>
      )}

      {/* 圖鑑格。編號是主角 —— 這是圖鑑不是清單 */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5">
        {shown.map(e => {
          const s = slotStatus(e, { attended: attended?.has(e.id), notes })
          const m = primaryMeta(e)
          return (
            <button key={e.id} onClick={() => onSelect(e.id)}
              title={`#${String(e.number).padStart(3, '0')} ${e.title}`}
              aria-label={`${e.title}${s.attended ? '，我去過' : ''}`}
              className="relative aspect-square rounded-lg grid place-items-center transition-transform hover:scale-105"
              style={{
                background: s.attended ? `rgba(${m.glow},0.9)` : `rgba(${m.glow},0.10)`,
                boxShadow: s.attended ? 'none' : `inset 0 0 0 1px rgba(${m.glow},0.35)`,
              }}>
              <span className={`font-round font-bold text-[13px] tabular-nums ${s.attended ? 'text-white' : ''}`}
                style={{ color: s.attended ? undefined : m.color }}>
                {String(e.number).padStart(3, '0')}
              </span>
              {s.hasNote && (
                <span aria-hidden className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full"
                  style={{ background: s.attended ? 'rgba(255,255,255,0.9)' : m.color }} />
              )}
              {!s.hasCover && (
                <span aria-hidden
                  className="absolute bottom-0 right-0 w-0 h-0 border-l-[10px] border-l-transparent border-b-[10px]"
                  style={{ borderBottomColor: 'rgb(var(--c-bg))' }} />
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-[12px] text-dream-faint">
        實心＝我去過 · 左上點＝有筆記 · 右下缺角＝還沒有封面
      </p>
    </div>
  )
}
