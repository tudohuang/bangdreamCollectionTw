import { useEffect, useMemo, useRef, useState } from 'react'
import { bandKey, primaryMeta, isPersonal } from '../utils/bands.js'
import { coverOf } from '../utils/media.js'
import { eventStatus, daysUntil, weekday, todayStr } from '../utils/datetime.js'
import { formatMonthDay } from '../utils/share.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'

function computeStats(events) {
  const years = events.map(e => e.year).filter(Boolean)
  const yearCount = events.reduce((acc, e) => ((acc[e.year] = (acc[e.year] || 0) + 1), acc), {})
  const busiestYear = Object.entries(yearCount).sort((a, b) => b[1] - a[1])[0]
  const bands = new Set(events.flatMap(e => e.relatedGroups.map(bandKey)))
  return {
    total: events.length,
    yearRange: years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—',
    busiestYear: busiestYear ? `${busiestYear[0]}` : '—',
    busiestCount: busiestYear ? busiestYear[1] : 0,
    bandCount: bands.size,
  }
}

// 數字進場時從上一個值滑到新值（events 由內建換成 Sheet 時也會平滑遞增）
function useCountUp(target) {
  const isNum = typeof target === 'number' && isFinite(target)
  const [val, setVal] = useState(isNum ? 0 : target)
  const fromRef = useRef(0)
  useEffect(() => {
    if (!isNum) { setVal(target); return }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setVal(target); fromRef.current = target; return }
    const from = fromRef.current, dur = 900, t0 = performance.now()
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(from + (target - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, isNum])
  return val
}

const Stat = ({ value, label, sub, href }) => (
  <a href={href}
     className="flex-1 min-w-[80px] text-center px-3 py-3.5 rounded-md transition-colors hover:bg-bloom-indigo/5">
    <div className="font-display text-2xl font-bold text-dream-ink leading-none">{value}</div>
    <div className="mt-1.5 text-[12px] text-dream-sub">{label}</div>
    {sub && <div className="text-[11px] text-dream-faint mt-0.5">{sub}</div>}
  </a>
)

// 下一場（沒有未來場次就退回最近一場）
function pickHighlight(events) {
  const today = todayStr()
  const future = events
    .filter(e => { const s = eventStatus(e, today); return s === 'upcoming' || s === 'ongoing' })
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
  if (future.length) return { event: future[0], upcoming: true }
  const past = events
    .filter(e => eventStatus(e, today) === 'past')
    .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
  return past.length ? { event: past[0], upcoming: false } : null
}

function Countdown({ events, onSelect }) {
  const hl = useMemo(() => pickHighlight(events), [events])
  if (!hl) return null
  const { event: e, upcoming } = hl
  const m = primaryMeta(e)
  const d = daysUntil(e.startDate)
  const status = eventStatus(e)
  const big = upcoming
    ? (status === 'ongoing' ? '進行中' : d === 0 ? '就是今天' : `${d}`)
    : '最近'
  const bigUnit = upcoming && status !== 'ongoing' && d > 0 ? '天後' : ''

  return (
    <button onClick={() => onSelect?.(e.id)}
      className="event-card group mt-7 w-full text-left p-4 sm:p-5 flex items-center gap-4 sm:gap-5"
      style={{ '--band': m.glow }}>
      <div className="shrink-0 text-center px-2 sm:px-3 border-r border-dream-line pr-4 sm:pr-5">
        <div className="text-[11px] font-bold tracking-wide" style={{ color: m.color }}>
          {upcoming ? '下一場' : '最近一場'}
        </div>
        <div className="font-display font-extrabold leading-none mt-1 text-dream-ink"
          style={{ fontSize: bigUnit ? 'clamp(28px,5vw,40px)' : 'clamp(18px,3.4vw,24px)' }}>
          {big}<span className="text-[14px] font-bold text-dream-sub ml-1">{bigUnit}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[12px] mb-1" style={{ color: m.color }}>
          <Icon n={isPersonal(e) ? 'user' : m.icon} className="text-[10px]" />
          {isPersonal(e) ? '個人來台' : m.name}
        </div>
        <div className="font-display font-bold text-[15px] text-dream-ink line-clamp-2 group-hover:text-bloom-indigo transition-colors">
          {e.title}
        </div>
        <div className="text-[12px] text-dream-sub mt-1 flex items-center gap-1.5">
          <Icon n="calendar" className="text-bloom-indigo text-[10px]" />
          {e.year}.{formatMonthDay(e.startDate).replace(/^\d{4}\./, '')}
          {weekday(e.startDate) && `（${weekday(e.startDate).replace('週', '')}）`}
          {e.venue && <span className="text-dream-faint truncate">· {e.venue}</span>}
        </div>
      </div>
      <Icon n="chevron-right" className="shrink-0 text-dream-faint group-hover:text-bloom-indigo transition-colors" />
    </button>
  )
}

// 右側封面馬賽克：拿有封面的活動拼一面小牆
function CoverMosaic({ events, onSelect }) {
  const items = useMemo(() => {
    return events
      .map(e => ({ e, cover: coverOf(e) }))
      .filter(x => x.cover)
      .sort((a, b) => (b.e.startDate || '').localeCompare(a.e.startDate || ''))
      .slice(0, 9)
  }, [events])
  if (items.length < 3) return null

  return (
    <div className="hidden lg:grid grid-cols-3 gap-2 w-[320px] shrink-0">
      {items.map(({ e, cover }, i) => {
        const m = primaryMeta(e)
        return (
          <button key={e.id} onClick={() => onSelect?.(e.id)}
            className="relative aspect-square overflow-hidden rounded-md border border-dream-line group animate-pop"
            style={{ animationDelay: `${i * 45}ms` }}
            aria-label={e.title}>
            <Img src={cover} className="w-full h-full object-cover group-hover:scale-110 motion-reduce:transform-none" />
            <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: m.color }} />
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
          </button>
        )
      })}
    </div>
  )
}

export default function Hero({ events, onSelect }) {
  const stats = useMemo(() => computeStats(events), [events])
  const total = useCountUp(stats.total)
  const bandCount = useCountUp(stats.bandCount)

  return (
    <section className="relative">
      {/* 柔和氛圍光暈：淺色淡淡的、深色更明顯，讓 Hero 不會死板 */}
      <div aria-hidden className="pointer-events-none absolute -z-10 -top-24 -right-16 w-[420px] h-[420px] rounded-full blur-3xl opacity-50 dark:opacity-70"
        style={{ background: 'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.30), rgba(165,180,252,0.18) 45%, transparent 70%)' }} />
      <div aria-hidden className="pointer-events-none absolute -z-10 top-10 -left-24 w-[320px] h-[320px] rounded-full blur-3xl opacity-40 dark:opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(255,92,138,0.20), transparent 70%)' }} />

      <div className="flex items-start gap-10">
        <div className="flex-1 min-w-0">
          <div className="max-w-2xl">
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

          <Countdown events={events} onSelect={onSelect} />

          {/* 統計條（可點跳到對應區塊） */}
          <div className="mt-7 max-w-2xl glass px-2 sm:px-4 py-1 grid grid-cols-2 sm:flex sm:items-stretch sm:divide-x sm:divide-dream-line">
            <Stat value={total} label="收錄場次" sub="entries" href="#wall" />
            <Stat value={bandCount} label="登場樂團" sub="bands" href="#stats" />
            <Stat value={stats.busiestYear} label="最熱年份" sub={`${stats.busiestCount} 場`} href={`#/year/${stats.busiestYear}`} />
            <Stat value={stats.yearRange} label="跨越年份" sub="span" href="#chapters" />
          </div>
        </div>

        <CoverMosaic events={events} onSelect={onSelect} />
      </div>
    </section>
  )
}
