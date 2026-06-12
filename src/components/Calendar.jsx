import { useMemo, useState } from 'react'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { parseDate, todayStr } from '../utils/datetime.js'
import Icon from './Icon.jsx'

const WD = ['日', '一', '二', '三', '四', '五', '六']

export default function Calendar({ events, onSelect }) {
  // 以「有活動的最近月份」為預設；否則本月
  const months = useMemo(() => {
    const set = new Set()
    for (const e of events) {
      const d = parseDate(e.startDate)
      if (d) set.add(`${d.getFullYear()}-${d.getMonth()}`)
    }
    return [...set].map(s => s.split('-').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  }, [events])

  const today = parseDate(todayStr())
  const defaultIdx = useMemo(() => {
    if (!months.length) return 0
    const cur = `${today.getFullYear()}-${today.getMonth()}`
    const i = months.findIndex(([y, m]) => `${y}-${m}` === cur)
    return i >= 0 ? i : 0
  }, [months]) // eslint-disable-line

  const [idx, setIdx] = useState(defaultIdx)
  const safeIdx = Math.min(Math.max(idx, 0), Math.max(months.length - 1, 0))
  const [year, month] = months[safeIdx] || [today.getFullYear(), today.getMonth()]

  const byDay = useMemo(() => {
    const map = {}
    for (const e of events) {
      const d = parseDate(e.startDate)
      if (d && d.getFullYear() === year && d.getMonth() === month) {
        (map[d.getDate()] ||= []).push(e)
      }
    }
    return map
  }, [events, year, month])

  const first = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  return (
    <div className="glass p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <button className="pill" disabled={safeIdx <= 0} onClick={() => setIdx(safeIdx - 1)} aria-label="上個月">
          <Icon n="chevron-left" />
        </button>
        <div className="font-display font-bold text-lg text-dream-ink">{year} 年 {month + 1} 月</div>
        <button className="pill" disabled={safeIdx >= months.length - 1} onClick={() => setIdx(safeIdx + 1)} aria-label="下個月">
          <Icon n="chevron-right" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-dream-faint mb-1">
        {WD.map(w => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />
          const list = byDay[d] || []
          const isToday = `${year}-${month}-${d}` === todayKey
          return (
            <div key={d} className={`min-h-[72px] rounded border p-1 text-left ${isToday ? 'border-bloom-indigo' : 'border-dream-line'} bg-white dark:bg-white/5`}>
              <div className={`text-[11px] mb-0.5 ${isToday ? 'font-bold text-bloom-indigo' : 'text-dream-faint'}`}>{d}</div>
              <div className="space-y-0.5">
                {list.slice(0, 3).map(e => {
                  const m = primaryMeta(e)
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelect(e.id)}
                      className="block w-full text-left truncate text-[11px] px-1 py-0.5 rounded text-white"
                      style={{ background: isPersonal(e) ? '#6366f1' : m.color }}
                      title={e.title}
                    >{e.title}</button>
                  )
                })}
                {list.length > 3 && <div className="text-[10px] text-dream-faint px-1">+{list.length - 3}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
