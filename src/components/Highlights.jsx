import { useMemo } from 'react'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { eventStatus, todayStr } from '../utils/datetime.js'
import { coverOf } from '../utils/media.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'

// 精選回憶：靜態九宮格（取代自動滾動跑馬燈）——最近九場有封面的已結束場次。
// 看得清、點得準，點開即詳情。
export default function Highlights({ events, onSelect }) {
  const picks = useMemo(() => {
    const today = todayStr()
    return events
      .filter(e => eventStatus(e, today) === 'past' && coverOf(e))
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
      .slice(0, 9)
  }, [events])

  if (picks.length < 3) return null

  return (
    <div className="mt-14 sm:mt-20">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow"><Icon n="images" className="text-[10px]" /> Memories</div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-dream-ink mt-1.5">精選回憶</h2>
        </div>
        <a href="#/collection?photos=yes&order=date-desc"
          className="text-[13px] font-semibold text-bloom-indigo hover:underline shrink-0">
          全部回憶 <Icon n="arrow-right" className="text-[10px]" />
        </a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {picks.map(e => {
          const m = primaryMeta(e)
          const cover = coverOf(e)
          return (
            <button key={e.id} onClick={() => onSelect(e.id)}
              className="group relative block w-full aspect-[3/2] overflow-hidden rounded-xl border border-dream-line text-left dark:border-white/10"
              aria-label={e.title}>
              <Img src={cover}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transform-none" />
              <span className="absolute inset-x-0 bottom-0 h-1 z-10" style={{ background: m.color }} />
              <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/70 via-black/10 to-transparent">
                <div className="text-[11px] font-round font-bold text-white/80 flex items-center gap-1.5">
                  <Icon n={isPersonal(e) ? 'user' : m.icon} className="text-[9px]" />
                  {e.year}
                </div>
                <div className="text-[13px] font-bold text-white line-clamp-2 leading-snug">{e.title}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
