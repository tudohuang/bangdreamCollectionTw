import EventCard from './EventCard.jsx'
import Timeline from './Timeline.jsx'
import EventTable from './EventTable.jsx'
import EmptyResult from './EmptyResult.jsx'
import Icon from './Icon.jsx'

export default function EventWall({ events, view, attended, onToggleAttended, onSelect, onReset, allEvents, milestones, groupByYear, suggestions }) {
  if (events.length === 0) {
    return <EmptyResult onReset={onReset} suggestions={suggestions} onSelect={onSelect} />
  }

  if (view === 'timeline') return <Timeline events={events} onSelect={onSelect} allEvents={allEvents} />
  if (view === 'table') return <EventTable events={events} onSelect={onSelect} />
  return (
    <Grid events={events} attended={attended} onToggleAttended={onToggleAttended}
      onSelect={onSelect} milestones={milestones} groupByYear={groupByYear} />
  )
}

// lg 開始左邊被側欄吃掉 254px，這裡就先維持兩欄，卡片才不會擠成郵票
const GRID = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-6'

function Grid({ events, attended, onToggleAttended, onSelect, milestones, groupByYear }) {
  const cards = (list) => list.map(e => (
    <EventCard key={e.id} event={e}
      attended={attended?.has(e.id)}
      onToggleAttended={onToggleAttended}
      milestone={milestones?.get(e.id)?.[0]}
      onClick={() => onSelect(e.id)} />
  ))

  // 依編號 / 人次排序時分年份沒有意義（年份會來回跳），那就維持一整片
  if (!groupByYear) return <div className={GRID}>{cards(events)}</div>

  // 依日期排序時切成年份段落：捲到哪一年，那一年的站牌就貼在頂上
  const groups = []
  for (const e of events) {
    const year = e.year || '未定'
    if (!groups.length || groups[groups.length - 1].year !== year) groups.push({ year, items: [] })
    groups[groups.length - 1].items.push(e)
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map(g => (
        <section key={`${g.year}-${g.items[0].id}`}>
          <div className="sticky top-[var(--wall-top)] z-[15] -mx-2 px-2 py-2 mb-3
            bg-dream-bg/95 backdrop-blur-md flex items-center gap-3">
            <span className="font-display font-extrabold text-[15px] text-dream-ink">{g.year}</span>
            <span className="text-[11px] font-round font-bold text-dream-faint">{g.items.length} 場</span>
            <span className="flex-1 h-px bg-dream-line dark:bg-white/10" />
          </div>
          <div className={GRID}>{cards(g.items)}</div>
        </section>
      ))}
    </div>
  )
}
