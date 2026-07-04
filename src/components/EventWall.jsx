import EventCard from './EventCard.jsx'
import Timeline from './Timeline.jsx'
import EventTable from './EventTable.jsx'
import Icon from './Icon.jsx'

export default function EventWall({ events, view, attended, onToggleAttended, onSelect, onReset }) {
  if (events.length === 0) {
    return (
      <div className="glass px-6 py-24 text-center">
        <div className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-bloom-indigo/10 text-bloom-indigo text-2xl">
          <Icon n="magnifying-glass" />
        </div>
        <div className="font-display font-bold text-xl text-dream-ink">沒有符合的條目</div>
        <div className="text-[14px] text-dream-sub mt-2">換個關鍵字，或放寬一點篩選條件試試</div>
        {onReset && (
          <button onClick={onReset} className="btn-primary mt-6">
            <Icon n="arrow-rotate-left" className="text-[12px]" /> 清除全部篩選
          </button>
        )}
      </div>
    )
  }

  if (view === 'timeline') return <Timeline events={events} onSelect={onSelect} />
  if (view === 'table') return <EventTable events={events} onSelect={onSelect} />
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
