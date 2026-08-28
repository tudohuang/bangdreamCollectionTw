import { useMemo } from 'react'
import { gaps, currentGap } from '../utils/chronology.js'
import { primaryMeta } from '../utils/bands.js'
import Icon from './Icon.jsx'

// 空窗期。這一頁不是統計，是一句話：
// 2019-08-04 之後，台灣等了 1385 天才等到下一場。
//
// 那三年八個月不需要任何說明文字，把長度畫出來就夠了。
export default function GapChart({ events, onSelect, today = new Date() }) {
  const list = useMemo(() => gaps(events).slice(0, 6), [events])
  const now = useMemo(() => currentGap(events, today), [events, today])
  if (!list.length) return null

  const max = list[0].days
  const longest = list[0]
  const years = (longest.days / 365).toFixed(1)

  return (
    <div className="glass p-6">
      <h3 className="font-display font-bold text-[15px] text-dream-ink">最長的等待</h3>
      <p className="mt-1 text-[13px] text-dream-sub">
        兩場之間隔最久的一次是 <strong className="text-dream-ink tabular-nums">{longest.days} 天</strong>
        （約 {years} 年）—— {longest.prev.startDate} 到 {longest.next.startDate}。
      </p>

      <ul className="mt-4 space-y-3">
        {list.map(g => {
          const m = primaryMeta(g.next)
          return (
            <li key={g.prev.id + g.next.id}>
              <div className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="text-dream-faint tabular-nums truncate">
                  {g.prev.startDate} → {g.next.startDate}
                </span>
                <span className="font-round font-bold tabular-nums shrink-0" style={{ color: m.color }}>
                  {g.days} 天
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-dream-line dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${(g.days / max) * 100}%`, background: m.color, opacity: 0.75 }} />
              </div>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-dream-sub">
                <button onClick={() => onSelect(g.prev.id)} className="truncate hover:text-dream-ink">
                  {g.prev.title}
                </button>
                <Icon n="arrow-right" className="text-[8px] text-dream-faint shrink-0" />
                <button onClick={() => onSelect(g.next.id)} className="truncate hover:text-dream-ink">
                  {g.next.title}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {/* 現在進行中的空窗。排在最後，因為它每天都在變 */}
      {now && (
        <p className="mt-4 pt-4 border-t border-dream-line dark:border-white/10 text-[13px] text-dream-sub">
          距離上一場（{now.prev.startDate}）已經
          <strong className="text-dream-ink tabular-nums mx-1">{now.days}</strong>天。
        </p>
      )}
    </div>
  )
}
