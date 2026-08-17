import { useMemo } from 'react'
import { bandKey, primaryMeta, isPersonal } from '../utils/bands.js'
import { eventStatus, daysUntil, weekday, todayStr } from '../utils/datetime.js'
import { formatMonthDay } from '../utils/share.js'
import { isUrgent, urgentEvents, URGENT_LABEL } from '../utils/urgency.js'
import { OWNER_NOTE } from '../config.js'
import Icon from './Icon.jsx'

// 站長便利貼：手寫紙條＋一截膠帶，歪一點才像人貼的
function StickyNote({ text }) {
  if (!text) return null
  return (
    <div className="relative -rotate-2 self-center shrink-0 max-w-[240px]">
      <span aria-hidden
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 rotate-3 w-16 h-4 bg-white/60 border border-black/[.06] shadow-sm" />
      <div className="bg-[#fff8c4] dark:bg-[#4a4420] px-4 py-3 shadow-[0_6px_16px_-6px_rgba(120,80,20,0.35)] rounded-[3px]">
        <p className="font-hand text-[15px] leading-6 text-[#5b4a12] dark:text-[#f0e6b0]">{text}</p>
      </div>
    </div>
  )
}

// 資訊優先的 Hero：一行標題 + 票根倒數 + 數據磚。
// 3 秒內回答「下一場是誰、幾天後」；裝飾降到最低。

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

// 下一場（沒有未來場次就退回最近一場）；有緊急情報時，票根直接讓給它
function pickHighlight(events) {
  const today = todayStr()
  const urgent = urgentEvents(events, today)
  if (urgent.length) return { event: urgent[0], upcoming: true }
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
  const urgent = isUrgent(e)
  const accent = urgent ? 'rgb(var(--c-urgent))' : m.color
  const d = daysUntil(e.startDate)
  const status = eventStatus(e)
  // 倒數的講法跟卡片／詳情共用一套（countdownLabel），這裡只是把數字放大成票面
  const big = upcoming
    ? (status === 'ongoing' ? '進行中' : status === 'unknown' ? '日期未定' : d === 0 ? '今天' : `${d}`)
    : 'REPLAY'
  const unit = upcoming && status !== 'ongoing' && d > 0 ? '天後開演' : ''

  return (
    <button onClick={() => onSelect?.(e.id)}
      className={`event-card group w-full text-left flex items-stretch ${urgent ? 'urgent-card' : ''}`}
      style={{ '--band': m.glow }}>
      {/* 撕票區 */}
      <div className="relative shrink-0 w-32 sm:w-40 grid place-items-center px-3 py-6 border-r border-dashed border-dream-line dark:border-white/20">
        <span aria-hidden className="absolute -right-2 -top-2.5 w-4 h-4 rounded-full bg-dream-bg border border-dream-line dark:border-white/15" />
        <span aria-hidden className="absolute -right-2 -bottom-2.5 w-4 h-4 rounded-full bg-dream-bg border border-dream-line dark:border-white/15" />
        <div className="text-center">
          <div className="text-[11px] font-bold tracking-[0.25em]" style={{ color: accent }}>
            {urgent ? 'URGENT' : upcoming ? 'UP NEXT' : 'LAST SHOW'}
          </div>
          <div className="font-display font-extrabold leading-none mt-1.5 text-dream-ink"
            style={{ fontSize: unit ? 'clamp(34px,4.5vw,46px)' : 'clamp(19px,2.4vw,26px)' }}>
            {big}
          </div>
          {unit && <div className="text-[13px] font-bold text-dream-sub mt-1">{unit}</div>}
        </div>
      </div>
      {/* 場次資訊 */}
      <div className="min-w-0 flex-1 p-4 sm:p-5 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13px] mb-1 flex-wrap" style={{ color: m.color }}>
            {urgent && (
              <span className="urgent-badge">
                <Icon n="triangle-exclamation" className="text-[9px]" /> {URGENT_LABEL}
              </span>
            )}
            <Icon n={isPersonal(e) ? 'user' : m.icon} className="text-[10px]" />
            {isPersonal(e) ? '個人來台' : m.name}
          </div>
          <div className="font-display font-bold text-[15px] sm:text-[16px] text-dream-ink line-clamp-2 group-hover:text-bloom-violet transition-colors">
            {e.title}
          </div>
          <div className="text-[13px] text-dream-sub mt-1.5 flex items-center gap-1.5 flex-wrap">
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

const StatTile = ({ value, label, sub, href, onClick }) => (
  <a href={href} onClick={onClick} className="glass p-4 sm:p-5 transition-colors hover:border-bloom-violet/60">
    <div className="font-display text-[24px] sm:text-[28px] font-extrabold text-dream-ink leading-none">{value}</div>
    <div className="mt-2 text-[13px] text-dream-sub">{label}</div>
    <div className="mt-0.5 text-[11px] font-bold tracking-[0.18em] uppercase text-dream-faint">{sub}</div>
  </a>
)

export default function Hero({ events, onSelect, onYearJump }) {
  const stats = useMemo(() => computeStats(events), [events])

  return (
    <section className="relative">
      <div className="pt-1 sm:pt-3">
        <div className="eyebrow">
          <span className="w-1.5 h-1.5 rounded-full bg-bloom-rose" />
          Taiwan BanG Dream! Event Collection
        </div>
        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="font-display font-extrabold leading-[1.08] text-[clamp(30px,5vw,44px)]">
              <span className="text-dream-ink">邦邦來台</span>
              <span className="text-gradient">圖鑑</span>
            </h1>
            <p className="mt-2.5 text-[15px] text-dream-sub max-w-md">
              邦邦聲優與樂團來台的活動紀錄，從 2018 記到現在。
            </p>
          </div>
          <StickyNote text={OWNER_NOTE} />
        </div>
      </div>

      {/* 儀表板：票根倒數 + 數據磚 */}
      <div className="mt-6 sm:mt-8 grid lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7 flex">
          <TicketCountdown events={events} onSelect={onSelect} />
        </div>
        <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4">
          <StatTile value={stats.total} label="收錄場次" sub="entries" href="#/collection" />
          <StatTile value={stats.bandCount} label="登場樂團" sub="bands" href="#/stats" />
          <StatTile value={stats.busiestYear} label={`最熱年份 · ${stats.busiestCount} 場`} sub="peak year"
            href={`#/collection?year=${stats.busiestYear}`}
            onClick={(e) => { if (onYearJump) { e.preventDefault(); onYearJump(Number(stats.busiestYear)) } }} />
          <StatTile value={stats.yearRange} label="跨越年份" sub="span" href="#/stats" />
        </div>
      </div>
    </section>
  )
}
