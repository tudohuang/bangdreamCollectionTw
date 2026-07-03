import { useEffect, useMemo, useRef, useState } from 'react'
import { bandKey, primaryMeta, isPersonal } from '../utils/bands.js'
import { coverOf } from '../utils/media.js'
import { eventStatus, daysUntil, weekday, todayStr } from '../utils/datetime.js'
import { formatMonthDay } from '../utils/share.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'
import Marquee from './Marquee.jsx'

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

// 票根式倒數卡：左邊撕票區倒數，右邊場次資訊
function TicketCountdown({ events, onSelect }) {
  const hl = useMemo(() => pickHighlight(events), [events])
  if (!hl) return null
  const { event: e, upcoming } = hl
  const m = primaryMeta(e)
  const d = daysUntil(e.startDate)
  const status = eventStatus(e)
  const big = upcoming
    ? (status === 'ongoing' ? 'ON AIR' : d === 0 ? 'TODAY' : `${d}`)
    : 'REPLAY'
  const unit = upcoming && status !== 'ongoing' && d > 0 ? '天後開演' : ''

  return (
    <button onClick={() => onSelect?.(e.id)}
      className="event-card group w-full text-left flex items-stretch"
      style={{ '--band': m.glow }}>
      {/* 撕票區 */}
      <div className="relative shrink-0 w-32 sm:w-40 grid place-items-center px-3 py-6 border-r border-dashed border-dream-line dark:border-white/20">
        <span aria-hidden className="absolute -right-2 -top-2.5 w-4 h-4 rounded-full bg-dream-bg border border-dream-line dark:border-white/15" />
        <span aria-hidden className="absolute -right-2 -bottom-2.5 w-4 h-4 rounded-full bg-dream-bg border border-dream-line dark:border-white/15" />
        <div className="text-center">
          <div className="text-[10px] font-bold tracking-[0.25em]" style={{ color: m.color }}>
            {upcoming ? 'UP NEXT' : 'LAST SHOW'}
          </div>
          <div className="font-display font-extrabold leading-none mt-1.5 text-dream-ink"
            style={{ fontSize: unit ? 'clamp(34px,4.5vw,46px)' : 'clamp(19px,2.4vw,26px)' }}>
            {big}
          </div>
          {unit && <div className="text-[12px] font-bold text-dream-sub mt-1">{unit}</div>}
        </div>
      </div>
      {/* 場次資訊 */}
      <div className="min-w-0 flex-1 p-4 sm:p-5 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[12px] mb-1" style={{ color: m.color }}>
            <Icon n={isPersonal(e) ? 'user' : m.icon} className="text-[10px]" />
            {isPersonal(e) ? '個人來台' : m.name}
          </div>
          <div className="font-display font-bold text-[15px] sm:text-[16px] text-dream-ink line-clamp-2 group-hover:text-bloom-violet transition-colors">
            {e.title}
          </div>
          <div className="text-[12px] text-dream-sub mt-1.5 flex items-center gap-1.5 flex-wrap">
            <Icon n="calendar" className="text-bloom-violet text-[10px]" />
            {e.year}.{formatMonthDay(e.startDate).replace(/^\d{4}\./, '')}
            {weekday(e.startDate) && `（${weekday(e.startDate).replace('週', '')}）`}
            {e.venue && <span className="text-dream-faint truncate">· {e.venue}</span>}
          </div>
        </div>
        <Icon n="chevron-right" className="shrink-0 text-dream-faint group-hover:text-bloom-violet transition-colors" />
      </div>
    </button>
  )
}

const StatTile = ({ value, label, sub, href }) => (
  <a href={href} className="glass p-4 sm:p-5 transition-colors hover:border-bloom-violet/60">
    <div className="font-display text-[24px] sm:text-[28px] font-extrabold text-dream-ink leading-none">{value}</div>
    <div className="mt-2 text-[12.5px] text-dream-sub">{label}</div>
    <div className="mt-0.5 text-[10px] font-bold tracking-[0.18em] uppercase text-dream-faint">{sub}</div>
  </a>
)

// 全幅封面膠卷：裝飾用（點擊入口在圖鑑牆），hover 暫停慢速滑過
function CoverFilm({ events }) {
  const items = useMemo(() =>
    events
      .map(e => ({ e, cover: coverOf(e) }))
      .filter(x => x.cover)
      .sort((a, b) => (b.e.startDate || '').localeCompare(a.e.startDate || '')),
    [events])
  if (items.length < 6) return null

  return (
    <div aria-hidden className="relative left-1/2 -translate-x-1/2 w-screen mt-12 sm:mt-16 select-none">
      <Marquee duration={80}>
        {items.map(({ e, cover }) => {
          const m = primaryMeta(e)
          return (
            <div key={e.id} title={e.title}
              className="relative mx-1.5 w-40 sm:w-52 aspect-[3/2] overflow-hidden rounded-lg border border-dream-line dark:border-white/10 shrink-0">
              <Img src={cover} className="w-full h-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: m.color }} />
            </div>
          )
        })}
      </Marquee>
    </div>
  )
}

export default function Hero({ events, onSelect }) {
  const stats = useMemo(() => computeStats(events), [events])
  const total = useCountUp(stats.total)
  const bandCount = useCountUp(stats.bandCount)

  return (
    <section className="relative">
      {/* 舞台光：紫聚光 + 粉側光 + 青冷光 */}
      <div aria-hidden className="pointer-events-none absolute -z-10 -top-28 -right-20 w-[480px] h-[480px] rounded-full blur-3xl opacity-50 dark:opacity-90"
        style={{ background: 'radial-gradient(circle at 30% 30%, rgba(168,85,247,0.35), rgba(139,92,246,0.16) 45%, transparent 70%)' }} />
      <div aria-hidden className="pointer-events-none absolute -z-10 top-6 -left-28 w-[380px] h-[380px] rounded-full blur-3xl opacity-45 dark:opacity-75"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.28), transparent 70%)' }} />
      <div aria-hidden className="pointer-events-none absolute -z-10 top-48 left-1/3 w-[300px] h-[300px] rounded-full blur-3xl opacity-30 dark:opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.22), transparent 70%)' }} />
      {/* 閃爍星點（僅深色） */}
      <div aria-hidden className="pointer-events-none absolute -z-10 inset-0 hidden dark:block">
        {[[8, 12, 0], [22, 4, 1.2], [58, 8, 0.6], [86, 18, 1.8], [70, 40, 0.3], [40, 30, 2.4]].map(([l, t, d], i) => (
          <span key={i}
            className="absolute w-1 h-1 rounded-full bg-white animate-twinkle"
            style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${d}s`, boxShadow: '0 0 6px 1px rgba(240,171,252,0.8)' }} />
        ))}
      </div>
      {/* 海報水印描邊大字 */}
      <div aria-hidden
        className="pointer-events-none select-none absolute -z-10 right-0 -top-2 hidden lg:block font-display font-extrabold leading-none text-outline text-[120px] xl:text-[150px] tracking-tight">
        LIVE!
      </div>

      {/* 海報大字區 */}
      <div className="pt-2 sm:pt-6">
        <div className="eyebrow">
          <span className="w-1.5 h-1.5 rounded-full bg-bloom-rose animate-twinkle" />
          Taiwan BanG Dream! Event Collection · 2018—2026
        </div>
        <h1 className="mt-3 font-display font-extrabold leading-[1.05] text-[clamp(40px,8vw,76px)]">
          <span className="text-dream-ink">邦邦來台</span>
          <span className="text-gradient glow-text">圖鑑</span>
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-8 text-dream-sub">
          從 2018 年的第一場見面會，到下一次安可——
          BanG Dream! 聲優與樂團在台灣的每一場足跡，都收進這本由粉絲共同整理的圖鑑。
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a href="#wall" className="btn-primary">
            翻閱圖鑑 <Icon n="arrow-right" className="text-[12px]" />
          </a>
          <a href="#chapters" className="btn-ghost">依年份瀏覽</a>
        </div>
      </div>

      {/* Bento 儀表板：票根倒數 + 數據磚 */}
      <div className="mt-10 sm:mt-12 grid lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7 flex">
          <TicketCountdown events={events} onSelect={onSelect} />
        </div>
        <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4">
          <StatTile value={total} label="收錄場次" sub="entries" href="#wall" />
          <StatTile value={bandCount} label="登場樂團" sub="bands" href="#stats" />
          <StatTile value={stats.busiestYear} label={`最熱年份 · ${stats.busiestCount} 場`} sub="peak year" href={`#/year/${stats.busiestYear}`} />
          <StatTile value={stats.yearRange} label="跨越年份" sub="span" href="#chapters" />
        </div>
      </div>

      {/* 全幅封面膠卷 */}
      <CoverFilm events={events} />
    </section>
  )
}
