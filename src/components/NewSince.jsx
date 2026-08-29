import { useEffect, useState } from 'react'
import { newSinceLastVisit, markSeenUpTo } from '../utils/lastSeen.js'
import { primaryMeta } from '../utils/bands.js'
import Icon from './Icon.jsx'

// 「你上次來之後新增了 N 場」。
//
// 站上所有的「4 天前公布」都是相對於現在，對回訪的人來說答錯了問題 ——
// 他要問的是「我上次來之後有什麼新的」。這一塊是全站唯一針對「這個人」
// 講話的地方。
//
// 第一次來的人不會看到（沒有基準，59 場全是新的，講了是廢話）。
// 只在瀏覽器裡比對，不上傳任何東西。
export default function NewSince({ events, onSelect }) {
  const [list, setList] = useState([])

  useEffect(() => {
    // 先算再標記，順序反了就永遠是 0
    setList(newSinceLastVisit(events))
    markSeenUpTo(events)
  }, [events])

  if (!list.length) return null

  return (
    <section className="mt-6 rounded-2xl border border-bloom-indigo/30 bg-bloom-indigo/[.06] px-5 py-4 dark:bg-bloom-indigo/10">
      <h2 className="flex items-center gap-2 font-display font-bold text-[16px] text-dream-ink">
        <Icon n="bolt" className="text-bloom-indigo text-[12px]" />
        你上次來之後，新增了 {list.length} 場
      </h2>
      <ul className="mt-2.5 space-y-1">
        {list.slice(0, 5).map(e => (
          <li key={e.id}>
            <button onClick={() => onSelect(e.id)}
              className="w-full text-left flex items-baseline gap-2.5 py-0.5 text-[14px] text-dream-sub hover:text-dream-ink transition-colors">
              <span className="shrink-0 font-round font-bold tabular-nums"
                style={{ color: primaryMeta(e).color }}>
                #{String(e.number).padStart(3, '0')}
              </span>
              <span className="min-w-0 truncate">{e.title}</span>
              <span className="shrink-0 ml-auto text-dream-faint tabular-nums">
                {e.startDate ? e.startDate.slice(0, 7).replace('-', '.') : '未定'}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {list.length > 5 && (
        <p className="mt-1.5 text-[14px] text-dream-faint">…還有 {list.length - 5} 場</p>
      )}
    </section>
  )
}
