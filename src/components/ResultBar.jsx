import { buildAppliedChips, removeChipPatch } from '../utils/filters.js'
import Icon from './Icon.jsx'

// 卡牆上方的結果摘要條：顯示剩幾筆與目前套用的條件。
// 沒有任何條件時不顯示。
export default function ResultBar({ filters, onChange, onReset, count, total, fuzzy }) {
  const chips = buildAppliedChips(filters)
  if (!chips.length) return null

  return (
    <div className="sticky top-[var(--sticky-top)] z-20 -mx-2 px-2 pb-3 pt-2 bg-dream-bg/95 backdrop-blur-md">
      <div className="glass !rounded-full px-3 py-2 flex items-center gap-2.5 overflow-hidden">
        <span className="shrink-0 text-[14px] text-dream-sub whitespace-nowrap" aria-live="polite">
          <span className="font-display font-bold text-[16px] text-bloom-indigo">{count}</span>
          <span className="text-dream-faint"> / {total}</span>
        </span>
        {/* 錯字容錯撈回來的結果一定要標出來，不然使用者會以為自己打對了 */}
        {fuzzy && (
          <span className="shrink-0 text-[14px] text-dream-faint whitespace-nowrap">
            找不到「{filters.search}」，這些是接近的
          </span>
        )}
        <span className="w-px h-4 bg-dream-line dark:bg-white/15 shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {chips.map(c => (
            <button key={c.key + c.val}
              onClick={() => onChange(removeChipPatch(filters, c))}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-bloom-indigo/10 text-bloom-indigo px-2.5 py-1 text-[14px] font-medium hover:bg-bloom-indigo/20 transition-colors">
              {c.label}<Icon n="xmark" className="text-[9px]" />
            </button>
          ))}
        </div>
        <button onClick={onReset}
          className="shrink-0 text-[14px] font-bold text-dream-faint hover:text-bloom-rose whitespace-nowrap">
          清除
        </button>
      </div>
    </div>
  )
}
