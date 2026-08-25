import { bandMeta } from '../utils/bands.js'
import { coverOf } from '../utils/media.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'

// EventDetail 用到的版面零件，抽出來讓主檔專心處理資料與互動。

// 照片出處：網址就做成可點的連結，回得去原始出處
export function PhotoCredit({ credit, color }) {
  return (
    <div className="mt-3 flex items-start gap-2 text-[13px] text-dream-faint">
      <Icon n="images" className="text-[10px] mt-1 shrink-0" style={{ color }} />
      <span className="min-w-0">
        <span className="font-semibold">{credit.label}：</span>
        {credit.isUrl
          ? <a href={credit.value} target="_blank" rel="noopener noreferrer"
              className="text-bloom-violet hover:underline break-all">{credit.value}</a>
          : <span className="break-words">{credit.value}</span>}
      </span>
    </div>
  )
}

// 撕票線兩端的打孔，一半被浮層邊界切掉
export function Punch({ className = '' }) {
  return (
    <span aria-hidden
      className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-dream-line dark:border-white/15 ${className}`}
      style={{ background: 'rgb(var(--c-bg))' }} />
  )
}

// 浮在頭圖上的控制鈕：半透明深底 + 毛玻璃，白圖示
export function OverBtn({ children, active, disabled, className = '', ...rest }) {
  return (
    <button disabled={disabled} {...rest}
      className={`grid place-items-center w-8 h-8 rounded-full backdrop-blur-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? 'bg-bloom-indigo text-white shadow-[0_0_12px_-2px_rgba(217,70,239,0.7)]' : 'bg-black/35 text-white hover:bg-black/55'} ${className}`}>
      {children}
    </button>
  )
}

// 存根的一列：左側樂團色圖示方塊 + 小標，下面放值
export function StubRow({ icon, label, color, glow, children }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="grid place-items-center w-8 h-8 shrink-0 rounded-lg text-[13px]"
        style={{ background: `rgba(${glow},0.16)`, color }}><Icon n={icon} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-dream-faint mb-1">{label}</div>
        <div className="text-[15px] text-dream-ink">{children}</div>
      </div>
    </div>
  )
}

// 脈絡卡裡的一個數字：大字、團色漸層墨水、底下一條細髮線
export function Stat({ value, label, meta }) {
  return (
    <div className="min-w-0">
      <div className="font-display font-extrabold text-[26px] sm:text-[29px] leading-none tracking-tight"
        style={{
          backgroundImage: `linear-gradient(135deg, ${meta.color} 15%, rgba(${meta.glow},0.55) 100%)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
        {value}
      </div>
      <div className="mt-2 pt-2 border-t text-[11px] leading-snug text-dream-sub"
        style={{ borderColor: `rgba(${meta.glow},0.28)` }}>{label}</div>
    </div>
  )
}

// 時間軸上的前一場 / 下一場
export function NeighborBtn({ side, item, color, onNavigate }) {
  if (!item) return <div />
  const next = side === 'next'
  return (
    <button onClick={() => onNavigate(item.id)}
      className={`min-w-0 rounded-xl border border-dream-line dark:border-white/10 px-3 py-2.5 hover:border-bloom-violet transition-colors ${next ? 'text-right' : 'text-left'}`}>
      <div className={`flex items-center gap-1.5 text-[11px] text-dream-faint mb-1 ${next ? 'justify-end' : ''}`}>
        {!next && <Icon n="chevron-left" className="text-[9px]" />}
        {next ? '下一場' : '前一場'}
        {next && <Icon n="chevron-right" className="text-[9px]" />}
      </div>
      <div className="truncate text-[13px] text-dream-ink">
        <span className="font-round font-bold mr-1.5" style={{ color }}>#{String(item.number ?? 0).padStart(3, '0')}</span>
        {item.title}
      </div>
    </button>
  )
}

// 相關場次的橫滑小卡（帶封面）
export function RelatedStrip({ items, color, onNavigate }) {
  return (
    <div className="-mx-1 px-1 flex gap-3 overflow-x-auto scrollbar-none snap-x">
      {items.map(o => {
        const m = bandMeta((o.relatedGroups || [])[0] || '')
        const c = coverOf(o)
        return (
          <button key={o.id} onClick={() => onNavigate(o.id)}
            className="snap-start shrink-0 w-[168px] text-left rounded-xl border border-dream-line dark:border-white/10 overflow-hidden hover:border-bloom-violet transition-colors group/rel">
            <span className="relative block w-full aspect-[3/2] overflow-hidden bg-dream-line/40">
              {c
                ? <Img src={c}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/rel:scale-105 motion-reduce:transform-none" />
                : <span aria-hidden className="absolute inset-0 grid place-items-center font-display font-extrabold text-[22px]"
                    style={{ background: `rgba(${m.glow},0.14)`, color: m.color }}>
                    #{String(o.number ?? 0).padStart(3, '0')}
                  </span>}
            </span>
            <span className="block px-2.5 py-2">
              <span className="block text-[11px] font-round font-bold" style={{ color }}>
                {o.startDate ? o.startDate.replace(/-/g, '.') : `${o.year || ''}`}
              </span>
              <span className="block text-[13px] text-dream-ink leading-snug line-clamp-2 mt-0.5">{o.title}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// 推薦清單（純文字版）：擺在「同一天還有 N 場」那種窄位置
export function RelatedList({ items, color, onNavigate }) {
  return (
    <ul className="space-y-1.5">
      {items.map(o => (
        <li key={o.id}>
          <button onClick={() => onNavigate(o.id)} className="w-full text-left flex items-center gap-2 text-[13px] text-dream-sub hover:text-dream-ink py-1">
            <span className="font-round font-bold shrink-0" style={{ color }}>#{String(o.number).padStart(3, '0')}</span>
            <span className="text-dream-faint shrink-0">{o.year}</span>
            <span className="truncate">{o.title}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function Section({ title, color, children }) {
  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 font-display font-bold text-[15px] text-dream-ink mb-2">
        <span className="w-1.5 h-4 rounded" style={{ background: color }} />{title}
      </h3>
      {children}
    </section>
  )
}
