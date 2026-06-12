import { useMemo } from 'react'
import { bandKey } from '../utils/bands.js'

function computeStats(events) {
  const years = events.map(e => e.year)
  const yearCount = events.reduce((acc, e) => ((acc[e.year] = (acc[e.year] || 0) + 1), acc), {})
  const busiestYear = Object.entries(yearCount).sort((a, b) => b[1] - a[1])[0]
  const bands = new Set(events.flatMap(e => e.relatedGroups.map(bandKey)))
  return {
    total: events.length,
    yearRange: `${Math.min(...years)}–${Math.max(...years)}`,
    busiestYear: busiestYear ? `${busiestYear[0]}` : '—',
    busiestCount: busiestYear ? busiestYear[1] : 0,
    bandCount: bands.size,
  }
}

const Stat = ({ value, label, sub }) => (
  <div className="flex-1 min-w-[88px] text-center px-3 py-3.5">
    <div className="font-display text-2xl font-bold text-dream-ink leading-none">{value}</div>
    <div className="mt-1.5 text-[12px] text-dream-sub">{label}</div>
    {sub && <div className="text-[11px] text-dream-faint mt-0.5">{sub}</div>}
  </div>
)

export default function Hero({ events }) {
  const stats = useMemo(() => computeStats(events), [events])

  return (
    <section className="relative">
      <div className="max-w-3xl">
        <div className="text-[12px] text-dream-faint">2018 — 2026 · Taiwan Collection</div>

        <h1 className="mt-2 font-display font-bold leading-tight text-[clamp(30px,6vw,48px)]">
          <span className="text-dream-ink">邦邦來台</span>
          <span className="text-bloom-indigo">圖鑑</span>
        </h1>

        <p className="mt-4 max-w-xl text-[15px] leading-8 text-dream-sub">
          一份收集 BanG Dream! 聲優、樂團與活動在台灣的紀錄。
          從見面會、LIVE、快閃店到上映會，逐場整理收錄。
        </p>
      </div>

      {/* 統計條 */}
      <div className="mt-8 max-w-2xl glass px-2 sm:px-4 py-1 flex items-stretch divide-x divide-dream-line">
        <Stat value={stats.total} label="收錄場次" sub="entries" />
        <Stat value={stats.bandCount} label="登場樂團" sub="bands" />
        <Stat value={stats.busiestYear} label="最熱年份" sub={`${stats.busiestCount} 場`} />
        <Stat value={stats.yearRange} label="跨越年份" sub="span" />
      </div>
    </section>
  )
}
