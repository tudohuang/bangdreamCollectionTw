import { useMemo } from 'react'
import { bandKey, BAND_META } from '../utils/bands.js'
import { detectCity } from '../utils/derive.js'
import Icon from './Icon.jsx'

function computeStats(events) {
  const byYear = {}
  const byType = {}
  const byBand = {}
  const byPerson = {}
  const byCity = {}
  const byOrganizer = {}
  let core = 0, side = 0, fullBand = 0, attendance = 0
  for (const e of events) {
    if (e.year) byYear[e.year] = (byYear[e.year] || 0) + 1
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
  return { byYear, byType, byBand, byPerson, byCity, byOrganizer, core, side, fullBand, attendance, total: events.length }
}

function sortEntries(obj, limit) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit ?? 99)
}

export default function StatsPanel({ events }) {
  const s = useMemo(() => computeStats(events), [events])
  const years = Object.keys(s.byYear).map(Number).sort((a, b) => a - b)
  const maxYear = Math.max(...Object.values(s.byYear))
  const peakYear = years.find(y => s.byYear[y] === maxYear)
  const maxBand = Math.max(...Object.values(s.byBand))
  const topPeople = Object.entries(s.byPerson).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxPerson = topPeople.length ? topPeople[0][1] : 1
  const topCities = Object.entries(s.byCity).sort((a, b) => b[1] - a[1])
  const maxCity = topCities.length ? topCities[0][1] : 1
  const topOrganizers = Object.entries(s.byOrganizer).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const maxOrganizer = topOrganizers.length ? topOrganizers[0][1] : 1

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="eyebrow"><Icon n="star" className="text-[10px]" /> Progress</div>
          <h2 className="section-h mt-2">收藏統計</h2>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-2xl font-bold text-bloom-indigo leading-none">{s.total} 場</div>
          <div className="text-[11px] text-dream-faint mt-1">
            {years[0]}–{years[years.length - 1]} · 累計 {s.attendance} 人次
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 年份分布 */}
        <div className="glass p-7">
          <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink mb-6">
            <Icon n="calendar" className="text-bloom-violet" /> 年份分布
          </h3>
          <ul className="space-y-3">
            {years.map(y => {
              const v = s.byYear[y]
              const pct = (v / maxYear) * 100
              const isPeak = y === peakYear
              return (
                <li key={y} className="grid grid-cols-[48px_1fr_30px] items-center gap-3">
                  <span className="font-round font-bold text-[13px] text-dream-sub">{y}</span>
                  <span className="h-3 rounded-full bg-white/55 relative overflow-hidden">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: isPeak ? '#4f46e5' : '#c7d2fe',
                      }}
                    />
                  </span>
                  <span className="text-[13px] font-round font-bold text-dream-ink text-right">{v}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-6 pt-4 border-t border-white/60 text-[13px] text-dream-sub">
            最熱鬧的一年是 <span className="font-bold text-gradient">{peakYear}（{maxYear} 場）</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* 本體 / 個人 */}
          <div className="glass p-7">
            <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink mb-5">
              <Icon n="bullseye" className="text-bloom-rose" /> 本體 / 個人
            </h3>
            <div className="flex h-9 rounded-full overflow-hidden border border-white/60">
              <div className="flex items-center justify-center text-[12px] font-bold text-white"
                   style={{ width: `${(s.core / s.total) * 100}%`, background: '#4f46e5' }}>
                {s.core > 0 && `本體 ${s.core}`}
              </div>
              <div className="flex items-center justify-center text-[12px] font-semibold text-dream-sub bg-white/60"
                   style={{ width: `${(s.side / s.total) * 100}%` }}>
                {s.side > 0 && `個人 ${s.side}`}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[12.5px] text-dream-sub">
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
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-dream-ink truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
                      <span className="truncate">{m.name}</span>
                    </span>
                    <span className="h-2.5 rounded-full bg-white/55 overflow-hidden">
                      <span className="block h-full rounded-full" style={{ width: `${(v / maxBand) * 100}%`, background: m.color }} />
                    </span>
                    <span className="text-[13px] font-round font-bold text-dream-sub text-right">{v}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* 聲優出現排行 */}
      <div className="glass p-7 mt-6">
        <h3 className="flex items-center gap-2.5 font-display font-bold text-lg text-dream-ink mb-5">
          <Icon n="microphone" className="text-bloom-rose" /> 看過最多次的聲優
        </h3>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
          {topPeople.map(([p, v], i) => (
            <div key={p} className="grid grid-cols-[20px_1fr_auto] items-center gap-3">
              <span className="font-round font-extrabold text-[13px] text-bloom-violet text-center">{i + 1}</span>
              <span className="h-7 rounded bg-dream-line/60 overflow-hidden relative flex items-center">
                <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${(v / maxPerson) * 100}%`, background: '#818cf8' }} />
                <span className="relative px-3 text-[13px] font-medium text-dream-ink truncate">{p}</span>
              </span>
              <span className="text-[13px] font-bold text-dream-sub">{v} 次</span>
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
                <span className="text-[13px] font-medium text-dream-ink">{city}</span>
                <span className="h-2.5 rounded bg-dream-line/60 overflow-hidden">
                  <span className="block h-full rounded" style={{ width: `${(v / maxCity) * 100}%`, background: '#4f46e5' }} />
                </span>
                <span className="text-[13px] font-bold text-dream-sub">{v}</span>
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
                <span className="font-bold text-[13px] text-bloom-indigo text-center">{i + 1}</span>
                <span className="h-7 rounded bg-dream-line/60 overflow-hidden relative flex items-center">
                  <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${(v / maxOrganizer) * 100}%`, background: '#4f46e5' }} />
                  <span className="relative px-3 text-[13px] font-medium text-dream-ink truncate">{org}</span>
                </span>
                <span className="text-[13px] font-bold text-dream-sub">{v} 場</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
