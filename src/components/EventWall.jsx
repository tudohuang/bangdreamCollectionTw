import { lazy, Suspense } from 'react'
import EventCard from './EventCard.jsx'
import Timeline from './Timeline.jsx'
import EventTable from './EventTable.jsx'
import Icon from './Icon.jsx'

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
