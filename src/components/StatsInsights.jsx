import { useMemo } from 'react'
import { conclusions } from '../utils/conclusions.js'
import Icon from './Icon.jsx'

// 統計頁的開場：先講結論，圖表放後面。
// 一條一句話，不掛第二行說明 —— 七條各配一段灰字會讓整頁很吵，而那些字沒人會讀。
// 數字都是即時算的，資料變了結論就跟著變。
export default function StatsInsights({ events }) {
  const items = useMemo(() => conclusions(events), [events])
  if (!items.length) return null

  return (
    <ul className="glass mb-6 px-5 sm:px-7 py-2 grid sm:grid-cols-2 gap-x-10">
      {items.map(item => {
        const inner = (
          <>
            <span aria-hidden className="shrink-0 w-1.5 h-1.5 rounded-full bg-bloom-rose" />
            <span className="min-w-0 flex-1">{item.text}</span>
            {item.href && (
              <Icon n="chevron-right" className="shrink-0 text-[10px] text-dream-faint" />
            )}
          </>
        )
        return (
          <li key={item.key} className="border-b border-dream-line/70 last:border-0 sm:[&:nth-last-child(2)]:border-0 dark:border-white/10">
            {item.href ? (
              <a href={item.href}
                className="flex items-center gap-2.5 py-3 text-[14px] text-dream-ink hover:text-bloom-indigo transition-colors">
                {inner}
              </a>
            ) : (
              <div className="flex items-center gap-2.5 py-3 text-[14px] text-dream-ink">{inner}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
