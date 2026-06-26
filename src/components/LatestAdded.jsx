import { useMemo } from 'react'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { coverOf } from '../utils/media.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'

// 「最新收錄」：用編號由大到小當「最近補進圖鑑」的訊號（lastUpdated 全部一樣，不可靠）
export default function LatestAdded({ events, onSelect }) {
  const list = useMemo(
    () => [...events].sort((a, b) => (b.number || 0) - (a.number || 0)).slice(0, 8),
    [events])
  if (list.length < 4) return null

  return (
    <div className="mt-10 sm:mt-14">
      <div className="flex items-center gap-2 mb-4">
        <Icon n="star" className="text-bloom-indigo" />
        <h2 className="font-display font-bold text-lg text-dream-ink">最新收錄</h2>
        <span className="text-[12px] text-dream-faint">編號越大＝越晚收進圖鑑</span>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
        {list.map(e => {
          const m = primaryMeta(e)
          const cover = coverOf(e)
          return (
            <button key={e.id} onClick={() => onSelect(e.id)}
              className="event-card group shrink-0 w-[180px] text-left flex flex-col snap-start overflow-hidden"
              style={{ '--band': m.glow }}>
              <div className="h-24 w-full overflow-hidden relative" style={{ background: cover ? undefined : `rgba(${m.glow},0.12)` }}>
                {cover
                  ? <Img src={cover} className="w-full h-full object-cover group-hover:scale-105 motion-reduce:transform-none" />
                  : <span className="grid place-items-center w-full h-full text-2xl" style={{ color: m.color }}>
                      <Icon n={isPersonal(e) ? 'user' : m.icon} />
                    </span>}
                <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: m.color }} />
              </div>
              <div className="p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-round font-bold" style={{ color: m.color }}>
                    #{String(e.number ?? 0).padStart(3, '0')}
                  </span>
                  <span className="text-dream-faint">{e.year}</span>
                </div>
                <div className="font-display font-bold text-[13px] text-dream-ink line-clamp-2 leading-snug">{e.title}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
