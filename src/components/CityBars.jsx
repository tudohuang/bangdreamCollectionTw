import { useMemo } from 'react'
import { cityBreakdown, venueIndex } from '../utils/venues.js'

// 城市分布。以前這一格是空的，因為 Sheet 的「城市」欄沒有人填 ——
// 但地點欄是滿的，城市推得出來。
//
// 結論其實只有一句：台灣的邦邦幾乎全部發生在台北。
// 這個數字不好看，但它是真的，而且是這站最該講出來的事實之一。
export default function CityBars({ events }) {
  const rows = useMemo(() => cityBreakdown(events), [events])
  const venues = useMemo(() => venueIndex(events), [events])
  if (!rows.length) return null

  const max = rows[0].count
  const total = rows.reduce((n, r) => n + r.count, 0)
  const taipei = rows.find(r => r.city === '台北')?.count || 0

  return (
    <div className="glass p-6">
      <h3 className="font-display font-bold text-[16px] text-dream-ink">都辦在哪裡</h3>
      <p className="mt-1 text-[14px] text-dream-sub">
        {Math.round((taipei / total) * 100)}% 在台北。
        {rows.length > 2 && `其餘散在 ${rows.filter(r => r.city !== '台北' && r.city !== '未標記').map(r => r.city).join('、')}。`}
      </p>

      <div className="mt-4 space-y-2">
        {rows.map(r => (
          <div key={r.city} className="flex items-center gap-3 text-[14px]">
            <span className="w-12 shrink-0 text-dream-faint">{r.city}</span>
            <span className="flex-1 h-2.5 rounded-full bg-dream-line dark:bg-white/10 overflow-hidden">
              <span className="block h-full rounded-full bg-gradient-to-r from-bloom-rose to-bloom-violet"
                style={{ width: `${(r.count / max) * 100}%`, opacity: r.city === '未標記' ? 0.3 : 1 }} />
            </span>
            <span className="w-6 text-right font-round font-bold text-dream-sub tabular-nums">{r.count}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-dream-line dark:border-white/10">
        <div className="text-[14px] font-bold text-dream-faint mb-2">最常用的場館</div>
        <div className="flex flex-wrap gap-2">
          {venues.slice(0, 6).map(v => (
            <a key={v.key} href={`#/venue/${encodeURIComponent(v.name)}`} className="pill">
              {v.name} <span className="text-dream-faint">×{v.events.length}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
