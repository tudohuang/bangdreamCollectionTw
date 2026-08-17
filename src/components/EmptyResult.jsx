import { primaryMeta, isPersonal } from '../utils/bands.js'
import { coverOf } from '../utils/media.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'

// 篩不到東西不該是死路：清掉條件之外，順手推最靠近今天的幾場，讓人有地方可以去。
export default function EmptyResult({ onReset, suggestions = [], onSelect }) {
  return (
    <div className="glass px-6 py-14 sm:py-16 text-center">
      <div className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-bloom-indigo/10 text-bloom-indigo text-2xl">
        <Icon n="magnifying-glass" />
      </div>
      <div className="font-display font-bold text-xl text-dream-ink">沒有符合的條目</div>
      <div className="text-[13px] text-dream-sub mt-2">換個關鍵字，或放寬一點篩選條件試試</div>
      {onReset && (
        <button onClick={onReset} className="btn-primary mt-6">
          <Icon n="arrow-rotate-left" className="text-[12px]" /> 清除全部篩選
        </button>
      )}

      {suggestions.length > 0 && onSelect && (
        <div className="mt-10 pt-8 border-t border-dashed border-dream-line dark:border-white/10 text-left">
          <div className="eyebrow justify-center flex mb-4">最靠近今天的幾場</div>
          <ul className="grid sm:grid-cols-3 gap-3">
            {suggestions.map(e => {
              const m = primaryMeta(e)
              const cover = coverOf(e)
              return (
                <li key={e.id}>
                  <button onClick={() => onSelect(e.id)}
                    className="w-full text-left rounded-xl border border-dream-line dark:border-white/10 overflow-hidden hover:border-bloom-violet transition-colors group">
                    <span className="relative block w-full aspect-[3/2] bg-dream-line/40 overflow-hidden">
                      {cover
                        ? <Img src={cover} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 motion-reduce:transform-none" />
                        : <span aria-hidden className="absolute inset-0 grid place-items-center text-[20px]"
                            style={{ background: `rgba(${m.glow},0.14)`, color: m.color }}>
                            <Icon n={isPersonal(e) ? 'user' : m.icon} />
                          </span>}
                    </span>
                    <span className="block px-3 py-2.5">
                      <span className="block text-[11px] font-round font-bold" style={{ color: m.color }}>
                        {e.startDate ? e.startDate.replace(/-/g, '.') : '日期未定'}
                      </span>
                      <span className="block text-[13px] text-dream-ink line-clamp-2 leading-snug mt-0.5">{e.title}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
