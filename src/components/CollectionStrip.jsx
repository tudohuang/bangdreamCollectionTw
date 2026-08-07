import { primaryMeta } from '../utils/bands.js'

// 收藏軌：全站每一場排成一條地層，符合條件的亮起來、其他淡掉。
// 詳情浮層用它標「這一場」，個人／樂團頁用它標「這個人的所有場次」。
export default function CollectionStrip({ chrono, isOn, onNavigate, tall = 40, short = 16 }) {
  const marks = chrono
    .map((e, i) => ({ year: e.year, i }))
    .filter((m, i, arr) => i === 0 || arr[i - 1].year !== m.year)

  // 年份標籤太擠就跳過，寧可少標也不要疊字
  const labelled = []
  let lastAt = -Infinity
  for (const m of marks) {
    const at = m.i / chrono.length
    if (at - lastAt < 0.055) continue
    lastAt = at
    labelled.push(m)
  }

  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height: tall }}>
        {chrono.map(e => {
          const m = primaryMeta(e)
          const on = isOn(e)
          return (
            <button key={e.id} disabled={!onNavigate}
              onClick={() => onNavigate?.(e.id)}
              title={`#${String(e.number ?? 0).padStart(3, '0')} ${e.title || ''}`}
              aria-label={`跳到 ${e.title || '這場'}`}
              className={`flex-1 min-w-[2px] rounded-[2px] transition-all duration-150 ${onNavigate ? 'hover:opacity-80' : ''}`}
              style={{
                height: on ? tall : short,
                background: on ? m.color : `rgba(${m.glow},0.28)`,
                boxShadow: on ? `0 0 10px -2px rgba(${m.glow},0.75)` : 'none',
              }} />
          )
        })}
      </div>
      <div className="relative h-4 mt-1.5 border-t border-dashed border-dream-line dark:border-white/10">
        {labelled.map(m => (
          <span key={m.year} className="absolute top-0 flex flex-col items-start"
            style={{ left: `${(m.i / chrono.length) * 100}%` }}>
            <span aria-hidden className="w-px h-1.5 bg-dream-line dark:bg-white/15" />
            <span className="text-[9.5px] font-round font-bold text-dream-faint -ml-1 mt-0.5">{m.year}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
