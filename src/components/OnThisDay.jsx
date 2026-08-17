import { useMemo } from 'react'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { coverOf } from '../utils/media.js'
import { todayStr, weekday } from '../utils/datetime.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'

// 兩個月日相差幾天（跨年頭年尾也算得對）
function mmddDistance(a, b) {
  const toDay = (mmdd) => {
    const [m, d] = mmdd.split('-').map(Number)
    return Date.UTC(2001, m - 1, d) / 86400000
  }
  const diff = Math.abs(toDay(a) - toDay(b))
  return Math.min(diff, 365 - diff)
}

// 「那年今天」：歷年同一天的場次。剛好今天沒有的話就往前後找幾天，
// 不然一年 365 天裡有 300 天這一區都是空的，等於沒做。
export default function OnThisDay({ events, onSelect }) {
  const today = todayStr()
  const thisYear = Number(today.slice(0, 4))
  const mmdd = today.slice(5)

  const { list, exact } = useMemo(() => {
    const past = events.filter(e =>
      /^\d{4}-\d{2}-\d{2}$/.test(e.startDate || '') && e.year < thisYear)
    const same = past
      .filter(e => e.startDate.slice(5) === mmdd)
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
    if (same.length) return { list: same, exact: true }

    const near = past
      .map(e => ({ e, d: mmddDistance(e.startDate.slice(5), mmdd) }))
      .filter(o => o.d <= 12)
      .sort((a, b) => a.d - b.d || b.e.startDate.localeCompare(a.e.startDate))
      .slice(0, 4)
      .map(o => o.e)
    return { list: near, exact: false }
  }, [events, mmdd, thisYear])

  if (!list.length) return null

  const e = list[0]
  const yearsAgo = thisYear - e.year
  const m = primaryMeta(e)
  const cover = coverOf(e)
  const personal = isPersonal(e)
  const rest = list.slice(1)

  return (
    // 收窄成一欄：夾在滿版月曆與滿版照片牆之間的一段安靜插曲
    <div className="mt-14 sm:mt-20 max-w-3xl">
      <div className="mb-5">
        <div className="eyebrow"><Icon n="heart" className="text-[10px]" /> Rewind</div>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-dream-ink mt-1.5">
          {exact ? '那年今天' : '那年的這幾天'}
          <span className="ml-2 text-[13px] font-normal text-dream-faint">
            {Number(mmdd.slice(0, 2))} 月 {Number(mmdd.slice(3))} 日
            {!exact && ' 前後'}
          </span>
        </h2>
      </div>

      <button onClick={() => onSelect(e.id)}
        className="event-card group w-full text-left flex items-stretch gap-0 overflow-hidden"
        style={{ '--band': m.glow }}>
        {cover && (
          <div className="hidden sm:block w-40 shrink-0 overflow-hidden relative">
            <Img src={cover} className="w-full h-full object-cover group-hover:scale-105 motion-reduce:transform-none" />
            <span className="absolute inset-y-0 right-0 w-1" style={{ background: m.color }} />
          </div>
        )}
        <div className="flex-1 min-w-0 p-5 flex flex-col justify-center">
          <div className="font-display font-extrabold text-dream-ink leading-none"
            style={{ fontSize: 'clamp(20px,3.4vw,28px)' }}>
            <span style={{ color: m.color }}>{yearsAgo}</span> 年前的{exact ? '今天' : '這個時候'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[13px]" style={{ color: m.color }}>
            <Icon n={personal ? 'user' : m.icon} className="text-[10px]" />
            {personal ? '個人來台' : m.name}
            <span className="text-dream-faint">
              · {e.startDate.replace(/-/g, '.')}（{weekday(e.startDate).replace('週', '')}）
            </span>
          </div>
          <div className="mt-1.5 font-display font-bold text-[16px] text-dream-ink line-clamp-2 group-hover:text-bloom-indigo transition-colors">
            {e.title}
          </div>
        </div>
      </button>

      {rest.length > 0 && (
        <ul className="mt-3 grid sm:grid-cols-2 gap-2">
          {rest.map(o => {
            const om = primaryMeta(o)
            return (
              <li key={o.id}>
                <button onClick={() => onSelect(o.id)}
                  className="w-full text-left flex items-center gap-2.5 rounded-xl border border-dream-line dark:border-white/10 px-3.5 py-2.5 hover:border-bloom-violet transition-colors">
                  <span className="shrink-0 font-round font-bold text-[13px]" style={{ color: om.color }}>
                    {o.startDate.replace(/-/g, '.')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-dream-sub">{o.title}</span>
                  <span className="shrink-0 text-[11px] text-dream-faint">{thisYear - o.year} 年前</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
