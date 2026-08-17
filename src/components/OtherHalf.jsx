import { useMemo } from 'react'
import { peopleFrequency, bandsWithoutCore } from '../utils/insights.js'
import { bandMeta } from '../utils/bands.js'
import Icon from './Icon.jsx'

// 排行榜只講來最多的那幾個。這一區講另一半：只來過一次的人、還沒正式來過的團。
export default function OtherHalf({ events }) {
  const once = useMemo(() => peopleFrequency(events).once, [events])
  const absent = useMemo(() => bandsWithoutCore(events), [events])
  if (!once.length && !absent.length) return null

  return (
    <div>
      <div className="eyebrow"><Icon n="layer-group" className="text-[10px]" /> The Other Half</div>
      <h2 className="section-h mt-2">另一面</h2>
      <p className="mt-2.5 text-[15px] text-dream-sub">排行榜只講來最多的那幾個。這裡是剩下的那一半。</p>

      <div className="mt-6 grid lg:grid-cols-2 gap-5">
        {once.length > 0 && (
          <div className="glass p-6 sm:p-7">
            <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink">
              <Icon n="microphone" className="text-bloom-rose" /> 只來過一次
              <span className="ml-auto font-round text-[15px] text-dream-faint">{once.length} 位</span>
            </h3>
            <p className="mt-1.5 font-hand text-[15px] text-dream-faint">來過台灣，然後就沒有然後了。</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {once.map(p => (
                <a key={p} href={`#/person/${encodeURIComponent(p)}`}
                  className="rounded-full border border-dream-line dark:border-white/10 bg-white/70 dark:bg-white/[.06] px-3 py-1 text-[13px] text-dream-ink hover:border-bloom-violet transition-colors">
                  {p}
                </a>
              ))}
            </div>
          </div>
        )}

        {absent.length > 0 && (
          <div className="glass p-6 sm:p-7">
            <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink">
              <Icon n="guitar" className="text-bloom-indigo" /> 還沒有官方場次
              <span className="ml-auto font-round text-[15px] text-dream-faint">{absent.length} 團</span>
            </h3>
            <p className="mt-1.5 font-hand text-[15px] text-dream-faint">只有聲優以個人身分來過，全團還沒。</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {absent.map(b => {
                const m = bandMeta(b)
                return (
                  <a key={b} href={`#/band/${encodeURIComponent(b)}`}
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium hover:opacity-80 transition-opacity"
                    style={{ background: `rgba(${m.glow},0.14)`, color: m.color, border: `1px solid rgba(${m.glow},0.3)` }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />{b}
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
