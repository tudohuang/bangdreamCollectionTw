import { lazy, Suspense } from 'react'
import EventCard from './EventCard.jsx'
import Timeline from './Timeline.jsx'
import EventTable from './EventTable.jsx'
import Icon from './Icon.jsx'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { coverOf } from '../utils/media.js'
import Img from './Img.jsx'

const Calendar = lazy(() => import('./Calendar.jsx'))

function groupByYear(events) {
  const map = new Map()
  for (const e of events) {
    if (!map.has(e.year)) map.set(e.year, [])
    map.get(e.year).push(e)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0])
}

export default function EventWall({ events, view, attended, onToggleAttended, onSelect }) {
  if (events.length === 0) {
    return (
      <div className="glass px-6 py-24 text-center">
        <div className="text-bloom-indigo text-4xl mb-4"><Icon n="magnifying-glass" /></div>
        <div className="font-display font-bold text-xl text-dream-ink">沒有符合的條目</div>
        <div className="text-[14px] text-dream-sub mt-3">試試清除部分篩選</div>
      </div>
    )
  }

  if (view === 'timeline') return <Timeline events={events} onSelect={onSelect} />
  if (view === 'table') return <EventTable events={events} onSelect={onSelect} />
  if (view === 'gallery') return <Gallery events={events} onSelect={onSelect} />
  if (view === 'calendar') {
    return <Suspense fallback={<div className="glass p-10 text-center text-dream-sub">載入月曆…</div>}>
      <Calendar events={events} onSelect={onSelect} />
    </Suspense>
  }

  if (view === 'year') {
    const years = groupByYear(events)
    return (
      <div className="space-y-12">
        {years.map(([year, arr]) => (
          <div key={year}>
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex items-center rounded-md px-3 py-1 font-display font-bold text-lg text-white bg-bloom-indigo">{year}</span>
              <span className="text-[13px] font-semibold text-dream-sub">{arr.length} 場</span>
              <span className="block flex-1 h-px bg-dream-line" />
            </div>
            <Grid events={arr} attended={attended} onToggleAttended={onToggleAttended} onSelect={onSelect} />
          </div>
        ))}
      </div>
    )
  }

  return <Grid events={events} attended={attended} onToggleAttended={onToggleAttended} onSelect={onSelect} />
}

// 照片回憶牆：統一直幅卡牆（封面為主，沒封面的用樂團色塊＋圖示）。
// 固定 3:4 版位＝載入時不位移（無 CLS），並能顯示骨架/載入失敗兜底。
function Gallery({ events, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {events.map(e => {
        const m = primaryMeta(e)
        const cover = coverOf(e)
        return (
          <button key={e.id} onClick={() => onSelect(e.id)}
            className="group relative block w-full aspect-[3/4] overflow-hidden rounded-md border border-dream-line text-left"
            style={{ '--band': m.glow }}>
            {cover ? (
              <Img src={cover}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transform-none" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-2xl"
                style={{ background: `rgba(${m.glow},0.12)`, color: m.color }}>
                <Icon n={isPersonal(e) ? 'user' : m.icon} />
              </div>
            )}
            <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: m.color }} />
            <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-[11px] font-round font-bold text-white/80">#{String(e.number ?? 0).padStart(3, '0')} · {e.year}</div>
              <div className="text-[13px] font-bold text-white line-clamp-2 leading-snug">{e.title}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function Grid({ events, attended, onToggleAttended, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
      {events.map(e => (
        <EventCard key={e.id} event={e}
          attended={attended?.has(e.id)}
          onToggleAttended={onToggleAttended}
          onClick={() => onSelect(e.id)} />
      ))}
    </div>
  )
}
