import { useMemo, useState } from 'react'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { relationOf } from '../utils/relation.js'
import { countingSummary } from '../utils/counting.js'
import Icon from './Icon.jsx'

// 一整年攤成十二個月。
//
// 月曆看得到「哪一天」，年份長條圖看得到「哪一年」，中間那層一直缺：
// 哪幾個月是空的、哪個月突然塞爆。這頁就是補那層。

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function yearData(events, year) {
  const mine = events.filter(e => e.year === year && e.startDate)
  const byMonth = MONTHS.map(m => ({
    month: m,
    list: mine
      .filter(e => Number(e.startDate.slice(5, 7)) === m)
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
  }))
  const peak = Math.max(1, ...byMonth.map(b => b.list.length))
  return { mine, byMonth, peak }
}

// 一句話定位這一年在整段歷史裡的角色
function verdict(count, average, gapsBefore) {
  if (!count) return { text: '整年掛零', tone: 'zero' }
  if (count >= average * 2) return { text: '爆發年', tone: 'peak' }
  if (gapsBefore) return { text: '重新點火', tone: 'restart' }
  if (count <= average / 2) return { text: '低點', tone: 'low' }
  return { text: '穩定', tone: 'flat' }
}

const TONE = {
  peak: 'text-bloom-rose',
  restart: 'text-bloom-indigo',
  zero: 'text-dream-faint',
  low: 'text-dream-sub',
  flat: 'text-dream-sub',
}

export default function YearTimeline({ events, onSelect }) {
  const years = useMemo(() => {
    const present = [...new Set(events.map(e => e.year).filter(Boolean))].sort((a, b) => a - b)
    if (!present.length) return []
    const out = []
    for (let y = present[0]; y <= present[present.length - 1]; y++) out.push(y)
    return out
  }, [events])

  const [year, setYear] = useState(() => {
    const now = new Date().getFullYear()
    return years.includes(now) ? now : years[years.length - 1]
  })

  const counts = useMemo(
    () => Object.fromEntries(years.map(y => [y, events.filter(e => e.year === y).length])),
    [years, events])

  const { mine, byMonth, peak } = useMemo(() => yearData(events, year), [events, year])
  const average = years.length ? events.filter(e => e.year).length / years.length : 0
  const gapsBefore = counts[year - 1] === 0
  const v = verdict(mine.length, average, gapsBefore)
  const count = countingSummary(mine)

  if (!years.length) return null

  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <div className="eyebrow"><Icon n="bars-staggered" className="text-[10px]" /> Year Timeline</div>
          <h2 className="section-h mt-2">年度時間軸</h2>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-display text-2xl font-bold leading-none ${TONE[v.tone]}`}>{v.text}</div>
          <div className="text-[14px] text-dream-faint mt-1">
            {mine.length} 筆 · {count.sessions} 場 · {count.activeDays} 天
          </div>
        </div>
      </div>

      {/* 年份切換：空白年份也要留著，斷層本身就是資訊 */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {years.map(y => {
          const n = counts[y] || 0
          const on = y === year
          return (
            <button key={y} onClick={() => setYear(y)}
              className={`rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors ${
                on ? 'bg-bloom-indigo text-white shadow-sm'
                  : n ? 'text-dream-sub hover:text-dream-ink hover:bg-dream-line/60 dark:hover:bg-white/10'
                      : 'text-dream-faint/70 line-through decoration-dream-line'}`}>
              {y}<span className={`ml-1.5 text-[14px] ${on ? 'text-white/70' : 'text-dream-faint'}`}>{n}</span>
            </button>
          )
        })}
      </div>

      <div className="glass p-5 sm:p-7">
        {mine.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-dream-faint">
            {year} 年一場都沒有。這個空白是真的。
          </p>
        ) : (
          <ol className="space-y-1">
            {byMonth.map(({ month, list }) => (
              <li key={month} className="grid grid-cols-[38px_minmax(0,1fr)] gap-3 items-start py-1.5">
                <span className={`pt-1 text-right font-round font-bold text-[14px] tabular-nums ${
                  list.length ? 'text-dream-ink' : 'text-dream-faint/50'}`}>
                  {month}月
                </span>

                {list.length === 0 ? (
                  <span aria-hidden className="mt-2.5 h-px bg-dream-line dark:bg-white/10" />
                ) : (
                  <div>
                    {/* 強度條：這個月在這一年裡有多滿 */}
                    <span aria-hidden className="block h-1.5 rounded-full mb-1.5 bg-gradient-to-r from-bloom-sky to-bloom-rose"
                      style={{ width: `${(list.length / peak) * 100}%`, minWidth: 24 }} />
                    <div className="flex flex-wrap gap-1.5">
                      {list.map(e => {
                        const m = primaryMeta(e)
                        const tier = relationOf(e).tier
                        return (
                          <button key={e.id} onClick={() => onSelect(e.id)}
                            title={`${e.startDate}｜${e.title}`}
                            className="group inline-flex items-center gap-1.5 max-w-full rounded-full border px-2.5 py-[7px] sm:py-1 text-[14px] transition-colors hover:border-current"
                            style={{
                              borderColor: tier === 'official' ? m.color : `rgba(${m.glow},0.35)`,
                              background: tier === 'official' ? `rgba(${m.glow},0.12)` : 'transparent',
                              color: tier === 'weak' ? undefined : m.color,
                            }}>
                            <span className="shrink-0 text-[14px] text-dream-faint tabular-nums">
                              {e.startDate.slice(8, 10)}
                            </span>
                            <span className="truncate text-dream-ink">{e.title}</span>
                            {isPersonal(e) && <Icon n="user" className="shrink-0 text-[8.5px] text-dream-faint" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="mt-2.5 text-[14px] text-dream-faint">
        實心＝官方本體 · 外框＝聲優個人或其他企劃 · 條越長那個月越滿
      </p>
    </section>
  )
}
