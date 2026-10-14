import { useMemo, useState } from 'react'
import { primaryMeta } from '../utils/bands.js'
import { coverRatio, hasLocalCover } from '../utils/cover.js'
import { coverOf } from '../utils/media.js'
import Cover from './Cover.jsx'

// 回顧牆：已經結束的場次，用封面排成瀑布流，最新的在最上面。
// 照片照原本比例排，不裁切 —— 回顧要看的就是那張海報本身。
// 先放一批，「再看更多」一路往回翻到第一場。
const PAGE = 12

export default function MemoryWall({ events, today, onSelect }) {
  const [shown, setShown] = useState(PAGE)
  const past = useMemo(() => events
    .filter(e => e.startDate && (e.endDate || e.startDate) < today && (hasLocalCover(e) || coverOf(e)))
    .sort((a, b) => b.startDate.localeCompare(a.startDate)), [events, today])
  if (!past.length) return null
  const list = past.slice(0, shown)
  const firstYear = past[past.length - 1].startDate.slice(0, 4)

  return (
    <section className="mb-10">
      <div className="flex items-end justify-between gap-4 mb-3 px-1">
        <h2 className="font-display font-bold text-[18px] text-dream-ink">回顧牆</h2>
        <span className="text-[14px] text-dream-faint tabular-nums">{past.length} 場 · {firstYear} 至今</span>
      </div>

      <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4">
        {list.map((e, i) => <Tile key={e.id} event={e} onSelect={onSelect} priority={i < 4} />)}
      </div>

      {shown < past.length && (
        <button onClick={() => setShown(n => n + PAGE * 2)}
          className="mt-2 w-full h-12 rounded-2xl border border-dream-line bg-white text-[16px] font-semibold text-dream-ink hover:border-bloom-indigo/50 transition-colors dark:bg-white/[.03] dark:border-white/10">
          再看更多 <span className="text-dream-faint font-normal tabular-nums">· 還有 {past.length - shown} 場</span>
        </button>
      )}
    </section>
  )
}

function Tile({ event: e, onSelect, priority }) {
  const m = primaryMeta(e)
  // 先用原始比例把位置留出來，圖載進來時版面不會跳；太長太扁的收斂一下
  const ratio = Math.min(1.35, Math.max(0.6, coverRatio(e) || 1))
  return (
    <button onClick={() => onSelect(e.id)}
      className="group relative block w-full mb-3 sm:mb-4 break-inside-avoid rounded-2xl overflow-hidden text-left shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <span className="relative block" style={{ aspectRatio: String(ratio) }}>
        <Cover event={e} size="sm" priority={priority}
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 240px"
          className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-[1.04]" />
      </span>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1" style={{ background: m.color }} />
      <span className="absolute inset-x-0 bottom-0 p-3 text-white">
        <span className="block text-[14px] font-semibold text-white/80 tabular-nums">{e.startDate.replaceAll('-', '.')}</span>
        <span className="mt-0.5 block font-display font-semibold text-[14px] sm:text-[16px] leading-snug line-clamp-2">{e.title}</span>
      </span>
    </button>
  )
}
