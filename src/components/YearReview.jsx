import { useMemo, useState } from 'react'
import { yearSummary, availableYears } from '../utils/review.js'
import { downloadWrapped } from '../utils/wrappedImage.js'
import Icon from './Icon.jsx'

export default function YearReview({ events }) {
  const years = useMemo(() => availableYears(events), [events])
  const [year, setYear] = useState(null)
  const active = year ?? years[0]
  const s = useMemo(() => (active ? yearSummary(events, active) : null), [events, active])
  if (!s || !s.total) return null
  const accent = s.topBands[0]?.color || '#4f46e5'

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="eyebrow"><Icon n="star" className="text-[10px]" /> Wrapped</div>
          <h2 className="section-h mt-2">年度回顧</h2>
        </div>
        <button onClick={() => downloadWrapped(events, active)}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[14px] font-bold text-white bg-bloom-indigo hover:bg-bloom-violet transition-colors shrink-0">
          <Icon n="star" /> 存成回顧卡
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {years.map(y => (
          <button key={y} className={`pill ${String(active) === String(y) ? 'pill-active' : ''}`}
            onClick={() => setYear(y)}>{y}</button>
        ))}
      </div>

      <div className="glass overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: accent }} />
        <div className="p-6 sm:p-8">
          <div className="flex items-baseline gap-3">
            <span className="font-display font-extrabold leading-none" style={{ fontSize: 'clamp(48px,9vw,80px)', color: accent }}>{s.year}</span>
            <span className="text-dream-sub text-[15px]">台邦在台灣 · 這年收錄 <span className="font-bold text-dream-ink">{s.total}</span> 場</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-7 mt-7">
            {s.topBands.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-dream-faint mb-3">最常出沒的樂團</div>
                <ul className="space-y-2.5">
                  {s.topBands.map((b, i) => (
                    <li key={b.name} className="grid grid-cols-[20px_1fr_auto] items-center gap-2.5">
                      <span className="font-round font-extrabold text-[13px] text-center" style={{ color: b.color }}>{i + 1}</span>
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.color }} />
                        <span className="text-[14px] font-medium text-dream-ink truncate">{b.name}</span>
                      </span>
                      <span className="text-[13px] font-bold text-dream-sub">{b.n} 場</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.topPeople.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-dream-faint mb-3">看最多次的聲優</div>
                <ul className="space-y-2.5">
                  {s.topPeople.map((p, i) => (
                    <li key={p.name} className="grid grid-cols-[20px_1fr_auto] items-center gap-2.5">
                      <span className="font-round font-extrabold text-[13px] text-center text-bloom-violet">{i + 1}</span>
                      <a href={`#/person/${encodeURIComponent(p.name)}`} className="text-[14px] font-medium text-dream-ink truncate hover:text-bloom-indigo hover:underline">{p.name}</a>
                      <span className="text-[13px] font-bold text-dream-sub">{p.n} 次</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-7 pt-5 border-t border-dream-line flex flex-wrap gap-2">
            {[
              s.topCity && `主場 ${s.topCity}`,
              s.cityCount > 0 && `${s.cityCount} 個城市`,
              s.fullBand > 0 && `全團 ${s.fullBand} 場`,
              s.attendance > 0 && `累計 ${s.attendance} 人次`,
              s.busiestMonth && `${s.busiestMonth.month} 月最熱（${s.busiestMonth.n} 場）`,
            ].filter(Boolean).map(t => (
              <span key={t} className="inline-flex items-center rounded-full px-3 py-1 text-[12.5px] font-medium"
                style={{ background: `${accent}1a`, color: accent }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
