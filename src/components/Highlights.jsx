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
    // 首頁的節奏：Hero 重、月曆中、那年今天窄，這裡放一段滿版的照片牆當高潮，
    // 四段才不會像四張一樣大的投影片。
    <div className="relative mt-14 sm:mt-24 py-12 sm:py-16">
      <div aria-hidden
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen -z-10 border-y border-dream-line/70 dark:border-white/10"
        style={{ background: 'linear-gradient(180deg, rgba(168,85,247,0.07), rgba(236,72,153,0.05))' }} />
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow"><Icon n="images" className="text-[10px]" /> Photos</div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-dream-ink mt-1.5">最近的現場</h2>
          <svg aria-hidden className="mt-1 text-bloom-violet/50" width="128" height="8" viewBox="0 0 128 8" fill="none">
            <path d="M2 5C18 2.5 32 6.5 50 4.5S84 2.5 104 5s18-1.5 22-.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <a href="#/collection?photos=yes&order=date-desc"
          className="text-[13px] font-semibold text-bloom-indigo hover:underline shrink-0">
          看全部 <Icon n="arrow-right" className="text-[10px]" />
        </a>
      </div>
      {/* 拍立得牆：每張歪一點點，像手貼上去的 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
        {picks.map((e, i) => {
          const m = primaryMeta(e)
          const cover = coverOf(e)
          const tilt = ['-rotate-1', 'rotate-[0.8deg]', 'rotate-0', 'rotate-1', '-rotate-[0.6deg]', 'rotate-[1.2deg]'][i % 6]
          return (
            <button key={e.id} onClick={() => onSelect(e.id)}
              className={`group relative block w-full text-left bg-white dark:bg-white/[.07] p-2 pb-2.5 rounded-lg border border-dream-line dark:border-white/10 shadow-[0_10px_28px_-16px_rgba(120,80,160,0.4)] ${tilt} hover:rotate-0 hover:-translate-y-1 transition-transform duration-300`}
              aria-label={e.title}>
              <span aria-hidden
                className="absolute -top-2 left-1/2 -translate-x-1/2 rotate-[-3deg] w-14 h-4 bg-white/55 border border-black/[.05] shadow-sm z-20" />
              <div className="relative w-full aspect-[3/2] overflow-hidden rounded-md">
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
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
