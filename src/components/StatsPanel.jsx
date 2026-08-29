import { useMemo, useState } from 'react'
import { countingSummary, COUNTING_NOTES } from '../utils/counting.js'
import { organizerList } from '../utils/organizers.js'
import { CAVEATS } from '../utils/conclusions.js'
import StatsInsights from './StatsInsights.jsx'
import YearRing from './YearRing.jsx'
import GapChart from './GapChart.jsx'
import CityBars from './CityBars.jsx'
import RelationBars from './RelationBars.jsx'
import ArchiveStats from './ArchiveStats.jsx'
import { bandKey, BAND_META } from '../utils/bands.js'
import { detectCity } from '../utils/derive.js'
import Icon from './Icon.jsx'

// 本體 / 個人 兩個系列的固定配色（站上既有的 violet / rose；
// 已用 dataviz 驗證器跑過淺色與深色兩種底色，六項檢查全數通過）
const SERIES = {
  core: { key: 'core', label: '本體', color: '#a855f7' },
  side: { key: 'side', label: '個人', color: '#ec4899' },
}

function computeStats(events) {
  const byYear = {}
  const byYearCore = {}
  const byYearSide = {}
  const byMonth = {}
  const byType = {}
  const byBand = {}
  const byPerson = {}
  const byCity = {}
  const byOrganizer = {}
  let core = 0, side = 0, fullBand = 0, attendance = 0
  for (const e of events) {
    if (e.year) {
      byYear[e.year] = (byYear[e.year] || 0) + 1
      if (e.category === '本體') byYearCore[e.year] = (byYearCore[e.year] || 0) + 1
      else byYearSide[e.year] = (byYearSide[e.year] || 0) + 1
    }
    if (e.month) byMonth[e.month] = (byMonth[e.month] || 0) + 1
    if (e.type) byType[e.type] = (byType[e.type] || 0) + 1
    for (const g of (e.relatedGroups || [])) {
      const k = bandKey(g)
      byBand[k] = (byBand[k] || 0) + 1
    }
    for (const p of (e.people || [])) byPerson[p] = (byPerson[p] || 0) + 1
    const city = detectCity(e)
    if (city) byCity[city] = (byCity[city] || 0) + 1
    if (e.organizer) byOrganizer[e.organizer] = (byOrganizer[e.organizer] || 0) + 1
    attendance += e.attendanceCount || 0
    if (e.category === '本體') core++
    else side++
    if (e.isFullBand) fullBand++
  }
  return {
    byYear, byYearCore, byYearSide, byMonth, byType, byBand, byPerson, byCity, byOrganizer,
    core, side, fullBand, attendance, total: events.length,
  }
}

function sortEntries(obj, limit) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit ?? 99)
}

export default function StatsPanel({ events, onSelect = () => {} }) {
  const s = useMemo(() => computeStats(events), [events])
  const count = useMemo(() => countingSummary(events), [events])
  const [hoverYear, setHoverYear] = useState(null)
  const [hoverMonth, setHoverMonth] = useState(null)

  // 年份軸要連續：中間沒有場次的年份也要留位置，跳過會讓趨勢失真
  const present = Object.keys(s.byYear).map(Number).sort((a, b) => a - b)
  const years = present.length
    ? Array.from({ length: present[present.length - 1] - present[0] + 1 }, (_, i) => present[0] + i)
    : []
  const maxYear = Math.max(1, ...Object.values(s.byYear))
  const emptyYears = years.filter(y => !s.byYear[y])
  const maxMonth = Math.max(1, ...Object.values(s.byMonth))
  const peakMonth = Object.entries(s.byMonth).sort((a, b) => b[1] - a[1])[0]
  const peakYear = years.find(y => s.byYear[y] === maxYear)
  const maxBand = Math.max(...Object.values(s.byBand))
  const topPeople = Object.entries(s.byPerson).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxPerson = topPeople.length ? topPeople[0][1] : 1
  const topCities = Object.entries(s.byCity).sort((a, b) => b[1] - a[1])
  const maxCity = topCities.length ? topCities[0][1] : 1
  const topOrganizers = useMemo(() => organizerList(events).slice(0, 10).map(o => [o.name, o.count]), [events])
  const maxOrganizer = topOrganizers.length ? topOrganizers[0][1] : 1

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="eyebrow"><Icon n="bolt" className="text-[10px]" /> Tour Data</div>
          <h2 className="section-h mt-2">應援數據</h2>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-2xl font-bold text-bloom-indigo leading-none">{s.total} 筆</div>
          <div className="text-[14px] text-dream-faint mt-1">
            {years[0]}–{years[years.length - 1]} · 累計 {s.attendance} 人次
          </div>
        </div>
      </div>

      <StatsInsights events={events} />

      <YearRing events={events} onSelect={onSelect} />

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <GapChart events={events} onSelect={onSelect} />
        <CityBars events={events} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <RelationBars events={events} />
      </div>

      {/* 票價與曲目：現在都是 0/59，所以整塊不出現。Sheet 一填就會長出來 */}
      <ArchiveStats events={events} onSelect={onSelect} />

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* 統計口徑：別人拿我們的數字去比對時，先講清楚一筆是什麼 */}
        <div className="glass p-7 lg:col-span-2">
          <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink mb-5">
            <Icon n="table" className="text-bloom-sky" /> 統計口徑
          </h3>

          <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden bg-dream-line dark:bg-white/10">
            <CountBox n={count.records} label="活動紀錄" />
            <CountBox n={count.activeDays} label="活動日" />
            <CountBox n={count.sessions} label="推估場次" />
          </div>

          {/* 定義與但書都收在這裡：要對數字的人點得到，其他人不用被小字淹沒 */}
          <details className="mt-4">
            <summary className="cursor-pointer text-[14px] text-dream-sub hover:text-dream-ink marker:text-dream-faint">
              這些數字怎麼算的
            </summary>
            <dl className="mt-3.5 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-[14px] leading-relaxed">
              {[...COUNTING_NOTES, ...CAVEATS].map(([term, note]) => (
                <div key={term}>
                  <dt className="font-semibold text-dream-ink">{term}</dt>
                  <dd className="text-dream-sub mt-0.5">{note}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>

        {/* 年份分布：本體 / 個人 堆疊，空白年份也留在軸上 */}
        <div className="glass p-7">
          <div className="flex items-start justify-between gap-4 mb-5">
            <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink">
              <Icon n="calendar" className="text-bloom-violet" /> 年份分布
            </h3>
            <Legend items={[SERIES.core, SERIES.side]} />
          </div>

          <ul className="space-y-3">
            {years.map(y => {
              const v = s.byYear[y] || 0
              const cv = s.byYearCore[y] || 0
              const sv = s.byYearSide[y] || 0
              const on = hoverYear === y
              return (
                <li key={y}
                  onMouseEnter={() => setHoverYear(y)} onMouseLeave={() => setHoverYear(null)}
                  className="relative grid grid-cols-[48px_1fr_30px] items-center gap-3">
                  <span className={`font-round font-bold text-[14px] ${v ? 'text-dream-sub' : 'text-dream-faint'}`}>{y}</span>
                  {v ? (
                    <span className="h-3 flex items-stretch gap-[2px]">
                      {cv > 0 && <span className="rounded-full" style={{ width: `${(cv / maxYear) * 100}%`, background: SERIES.core.color }} />}
                      {sv > 0 && <span className="rounded-full" style={{ width: `${(sv / maxYear) * 100}%`, background: SERIES.side.color }} />}
                    </span>
                  ) : (
                    <span className="h-3 flex items-center">
                      <span className="w-full border-t border-dashed border-dream-line dark:border-white/15" />
                    </span>
                  )}
                  <span className={`text-[14px] font-round font-bold text-right ${v ? 'text-dream-ink' : 'text-dream-faint'}`}>
                    {v || '—'}
                  </span>

                  {on && v > 0 && (
                    <span className="absolute right-12 -top-1 z-10 rounded-lg bg-dream-ink text-white text-[14px] px-2.5 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
                      本體 {cv} · 個人 {sv}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="mt-6 pt-4 border-t border-dream-line dark:border-white/10 text-[14px] text-dream-sub space-y-1">
            <div>最熱鬧的一年是 <span className="font-bold text-gradient">{peakYear}（{maxYear} 場）</span></div>
            {emptyYears.length > 0 && (
              <div className="text-dream-faint">
                {emptyYears.join('、')} 一場都沒有
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* 本體 / 個人 */}
          <div className="glass p-7">
            <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink mb-5">
              <Icon n="bullseye" className="text-bloom-rose" /> 本體 / 個人
            </h3>
            <div className="flex h-9 rounded-full overflow-hidden border border-white/60">
              <div className="flex items-center justify-center text-[14px] font-bold text-white"
                   style={{ width: `${(s.core / s.total) * 100}%`, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                {s.core > 0 && `本體 ${s.core}`}
              </div>
              <div className="flex items-center justify-center text-[14px] font-semibold text-dream-sub bg-white/60"
                   style={{ width: `${(s.side / s.total) * 100}%` }}>
                {s.side > 0 && `個人 ${s.side}`}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[14px] text-dream-sub">
              <span>本體 {(s.core / s.total * 100).toFixed(0)}% · 個人 {(s.side / s.total * 100).toFixed(0)}%</span>
              <span className="font-semibold">全團 {s.fullBand} 場</span>
            </div>
          </div>

          {/* 樂團出現排行 */}
          <div className="glass p-7">
            <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink mb-5">
              <Icon n="guitar" className="text-bloom-indigo" /> 樂團出現排行
            </h3>
            <ul className="space-y-2.5">
              {sortEntries(s.byBand, 8).map(([k, v]) => {
                const m = BAND_META[k]
                return (
                  <li key={k} className="grid grid-cols-[130px_1fr_28px] items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[14px] font-medium text-dream-ink truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
                      <span className="truncate">{m.name}</span>
                    </span>
                    <span className="h-2.5 rounded-full bg-white/55 overflow-hidden">
                      <span className="block h-full rounded-full" style={{ width: `${(v / maxBand) * 100}%`, background: m.color }} />
                    </span>
                    <span className="text-[14px] font-round font-bold text-dream-sub text-right">{v}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* 月份分布：一年裡哪幾個月最常來 */}
      <div className="glass p-7 mt-6">
        <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink mb-6">
          <Icon n="calendar-days" className="text-bloom-violet" /> 哪幾個月最常來
        </h3>
        <div className="flex items-end gap-1.5 sm:gap-2.5 h-40">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(mo => {
            const v = s.byMonth[mo] || 0
            const on = hoverMonth === mo
            return (
              <div key={mo} className="relative flex-1 h-full flex flex-col justify-end items-center gap-2"
                onMouseEnter={() => setHoverMonth(mo)} onMouseLeave={() => setHoverMonth(null)}>
                {on && v > 0 && (
                  <span className="absolute -top-1 z-10 rounded-lg bg-dream-ink text-white text-[14px] px-2.5 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
                    {mo} 月 · {v} 場
                  </span>
                )}
                <span className="w-full rounded-t-[4px] transition-opacity"
                  style={{
                    height: `${v ? Math.max(4, (v / maxMonth) * 100) : 2}%`,
                    background: v ? SERIES.core.color : 'rgb(var(--c-line))',
                    opacity: hoverMonth && !on ? 0.45 : 1,
                  }} />
                <span className="text-[14px] font-round font-bold text-dream-faint">{mo}</span>
              </div>
            )
          })}
        </div>
        {peakMonth && (
          <div className="mt-5 pt-4 border-t border-dream-line dark:border-white/10 text-[14px] text-dream-sub">
            最常來的是 <span className="font-bold text-gradient">{peakMonth[0]} 月（{peakMonth[1]} 場）</span>
          </div>
        )}
      </div>

      {/* 聲優出現排行 */}
      <div className="glass p-7 mt-6">
        <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink mb-5">
          <Icon n="microphone" className="text-bloom-rose" /> 看過最多次的聲優
        </h3>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
          {topPeople.map(([p, v], i) => (
            <div key={p} className="grid grid-cols-[20px_1fr_auto] items-center gap-3">
              <span className="font-round font-extrabold text-[14px] text-bloom-violet text-center">{i + 1}</span>
              <span className="h-7 rounded bg-dream-line/60 overflow-hidden relative flex items-center">
                <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${(v / maxPerson) * 100}%`, background: 'rgba(168,85,247,0.55)' }} />
                <span className="relative px-3 text-[14px] font-medium text-dream-ink truncate">{p}</span>
              </span>
              <span className="text-[14px] font-bold text-dream-sub">{v} 次</span>
            </div>
          ))}
        </div>
      </div>

      {topCities.length > 0 && (
        <div className="glass p-7 mt-6">
          <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink mb-5">
            <Icon n="location-dot" className="text-bloom-rose" /> 城市分布
          </h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {topCities.map(([city, v]) => (
              <div key={city} className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
                <span className="text-[14px] font-medium text-dream-ink">{city}</span>
                <span className="h-2.5 rounded bg-dream-line/60 overflow-hidden">
                  <span className="block h-full rounded" style={{ width: `${(v / maxCity) * 100}%`, background: 'linear-gradient(90deg, #ec4899, #8b5cf6)' }} />
                </span>
                <span className="text-[14px] font-bold text-dream-sub">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topOrganizers.length > 0 && (
        <div className="glass p-7 mt-6">
          <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink mb-5">
            <Icon n="user-group" className="text-bloom-indigo" /> 主辦單位排行
          </h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {topOrganizers.map(([org, v], i) => (
              <div key={org} className="grid grid-cols-[20px_1fr_auto] items-center gap-3">
                <span className="font-bold text-[14px] text-bloom-indigo text-center">{i + 1}</span>
                <a href={`#/org/${encodeURIComponent(org)}`}
                  className="h-7 rounded bg-dream-line/60 overflow-hidden relative flex items-center hover:brightness-95 transition-[filter]">
                  <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${(v / maxOrganizer) * 100}%`, background: 'rgba(139,92,246,0.5)' }} />
                  <span className="relative px-3 text-[14px] font-medium text-dream-ink truncate">{org}</span>
                </a>
                <span className="text-[14px] font-bold text-dream-sub">{v} 筆</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 兩個系列以上一定要有圖例，識別才不會只靠顏色
function CountBox({ n, label }) {
  return (
    <div className="bg-white px-4 py-5 text-center dark:bg-white/[.04]">
      <div className="font-display text-[28px] font-bold text-dream-ink leading-none tabular-nums">{n}</div>
      <div className="text-[14px] font-medium text-dream-sub mt-2">{label}</div>
    </div>
  )
}

function Legend({ items }) {
  return (
    <div className="flex items-center gap-3 shrink-0 pt-1">
      {items.map(it => (
        <span key={it.key} className="inline-flex items-center gap-1.5 text-[14px] text-dream-sub">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}
