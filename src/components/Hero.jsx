import { useMemo } from 'react'
import { bandKey, primaryMeta, isPersonal } from '../utils/bands.js'
import { eventStatus, daysUntil, weekday, todayStr } from '../utils/datetime.js'
import { formatMonthDay } from '../utils/share.js'
import { isUrgent, urgentEvents, URGENT_LABEL } from '../utils/urgency.js'
import { countingSummary } from '../utils/counting.js'
import { OWNER_NOTE } from '../config.js'
import { JustAnnounced } from './JustAnnounced.jsx'
import { songIndex } from '../utils/songs.js'
import Icon from './Icon.jsx'
import Cover from './Cover.jsx'
import SubscribeCalendar from './SubscribeCalendar.jsx'
import ResumeLine from './ResumeLine.jsx'
import NewSince from './NewSince.jsx'

// 站長便利貼：首頁標題旁的手寫紙條
function StickyNote({ text }) {
  if (!text) return null
  return (
    <div className="self-end shrink-0 max-w-[260px] border-l-2 border-bloom-rose/60 pl-3.5 py-0.5">
      <p className="font-hand text-[17px] leading-7 text-dream-sub">{text}</p>
      <p className="mt-0.5 text-[14px] tracking-[0.22em] uppercase text-dream-faint">Owner's note</p>
    </div>
  )
}

// 資訊優先的 Hero。第一屏只回答三件事：
// 最近公布了誰、下一場是誰幾天後、今年到底有多少。
// 其他東西（月曆、那年今天、照片牆）一律往下排。

function computeStats(events) {
  const songCount = songIndex(events).length
  const years = events.map(e => e.year).filter(Boolean)
  const bands = new Set(events.flatMap(e => e.relatedGroups.map(bandKey)))
  return {
    total: events.length,
    yearRange: years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—',
    bandCount: bands.size,
    songCount,
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

// 今年快照：新訪客第一個問題是「聽說今年很多，到底多少」
function yearSnapshot(events, year) {
  const mine = events.filter(e => e.year === year)
  const today = todayStr()
  return {
    year,
    count: mine.length,
    share: events.length ? Math.round((mine.length / events.length) * 100) : 0,
    people: new Set(mine.flatMap(e => e.people || [])).size,
    ahead: mine.filter(e => (e.endDate || e.startDate || '') >= today).length,
    sessions: countingSummary(mine).sessions,
  }
}

function YearSnapshot({ events, onYearJump }) {
  const year = new Date().getFullYear()
  const s = useMemo(() => yearSnapshot(events, year), [events, year])
  if (!s.count) return null

  const rows = [
    ['活動紀錄', s.count, '筆'],
    ['推估場次', s.sessions, '場'],
    ['出演者', s.people, '人'],
    ['還沒發生', s.ahead, '場'],
  ]

  // 排成一列四格，高度跟旁邊的票根一樣；「看今年全部」收進標題列右邊
  return (
    <div className="glass p-5 h-full w-full min-w-0 flex flex-col justify-between gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-baseline gap-2">
          <span className="font-display font-extrabold text-[26px] leading-none text-gradient tabular-nums">{year}</span>
          <span className="text-[14px] font-medium text-dream-sub">到目前為止</span>
        </span>
        <button onClick={() => onYearJump && onYearJump(year)}
          className="shrink-0 inline-flex items-center gap-1 text-[14px] font-semibold text-bloom-indigo hover:underline">
          看今年全部 <Icon n="arrow-right" className="text-[10px]" />
        </button>
      </div>

      <dl className="grid grid-cols-4 gap-2">
        {rows.map(([k, n, unit]) => (
          <div key={k} className="min-w-0">
            <dd className="font-display font-bold text-[22px] leading-none text-dream-ink tabular-nums">
              {n}<span className="ml-0.5 text-[14px] font-medium text-dream-sub">{unit}</span>
            </dd>
            <dt className="mt-1.5 text-[14px] text-dream-faint truncate">{k}</dt>
          </div>
        ))}
      </dl>
    </div>
  )
}

// 票根式倒數卡：左邊是這場的海報，中間撕票區倒數，右邊場次資訊。下面接「再來還有誰」。
function TicketCountdown({ events, onSelect, aside }) {
  const hl = useMemo(() => pickHighlight(events), [events])
  const queue = useMemo(() => {
    const today = todayStr()
    return events
      .filter(e => (e.startDate || '') > today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
  }, [events])
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

  // 「再來還有」現在是整排四欄，八筆剛好兩列
  const rest = queue.filter(x => x.id !== e.id).slice(0, 8)

  return (
    <div className="w-full min-w-0 flex flex-col gap-4">
    <div className="grid lg:grid-cols-12 gap-4 items-stretch">
    <button onClick={() => onSelect?.(e.id)}
      className={`event-card group w-full text-left flex items-stretch lg:col-span-8 ${urgent ? 'urgent-card' : ''}`}
      style={{ '--band': m.glow }}>
      {/* 海報：票面左邊那塊印刷圖，跟活動卡用同一套封面檔 */}
      <div className="hidden sm:block relative shrink-0 w-40 lg:w-52 overflow-hidden">
        <Cover event={e} size="sm" sizes="208px" priority
          className="absolute inset-0 w-full h-full transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transform-none" />
        <span aria-hidden className="absolute inset-y-0 right-0 w-[3px]" style={{ background: accent }} />
      </div>
      {/* 撕票區 */}
      <div className="relative shrink-0 w-32 sm:w-36 grid place-items-center px-3 py-6 border-r border-dashed border-dream-line dark:border-white/20">
        <span aria-hidden className="absolute -right-2 -top-2.5 w-4 h-4 rounded-full bg-dream-bg border border-dream-line dark:border-white/15" />
        <span aria-hidden className="absolute -right-2 -bottom-2.5 w-4 h-4 rounded-full bg-dream-bg border border-dream-line dark:border-white/15" />
        <div className="text-center">
          <div className="text-[14px] font-bold tracking-[0.25em]" style={{ color: accent }}>
            {urgent ? 'URGENT' : upcoming ? 'UP NEXT' : 'LAST SHOW'}
          </div>
          <div className="font-display font-extrabold leading-none mt-1.5 text-dream-ink"
            style={{ fontSize: unit ? 'clamp(34px,4.5vw,46px)' : 'clamp(19px,2.4vw,26px)' }}>
            {big}
          </div>
          {unit && <div className="text-[14px] font-bold text-dream-sub mt-1">{unit}</div>}
        </div>
      </div>
      {/* 場次資訊 */}
      <div className="min-w-0 flex-1 p-4 sm:p-5 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[14px] mb-1 flex-wrap" style={{ color: m.color }}>
            {urgent && (
              <span className="urgent-badge">
                <Icon n="triangle-exclamation" className="text-[9px]" /> {URGENT_LABEL}
              </span>
            )}
            <Icon n={isPersonal(e) ? 'user' : m.icon} className="text-[10px]" />
            {isPersonal(e) ? '個人來台' : m.name}
          </div>
          <div className="font-display font-bold text-[16px] sm:text-[18px] text-dream-ink line-clamp-2 group-hover:text-bloom-violet transition-colors">
            {e.title}
          </div>
          <div className="text-[14px] text-dream-sub mt-1.5 flex items-center gap-1.5 flex-wrap">
            <Icon n="calendar" className="text-bloom-violet text-[10px]" />
            {e.year}.{formatMonthDay(e.startDate).replace(/^\d{4}\./, '')}
            {weekday(e.startDate) && `（${weekday(e.startDate).replace('週', '')}）`}
            {e.venue && <span className="text-dream-faint truncate">· {e.venue}</span>}
          </div>
        </div>
        <Icon n="chevron-right" className="shrink-0 text-dream-faint group-hover:text-bloom-violet transition-colors" />
      </div>
    </button>
    {aside && <div className="lg:col-span-4 flex min-w-0">{aside}</div>}
    </div>

    {/* 再來還有誰 —— 「最近公布」講的是新消息，這裡講的是即將發生 */}
    {rest.length > 0 && (
      <div className="glass px-4 py-3">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-[14px] font-bold text-dream-faint">再來還有</span>
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1">
          {rest.map(x => {
            const xm = primaryMeta(x)
            const left = daysUntil(x.startDate)
            return (
              <li key={x.id} className="min-w-0">
                <button onClick={() => onSelect?.(x.id)}
                  className="group w-full flex items-baseline gap-2.5 text-left text-[14px]">
                  <span className="shrink-0 w-11 text-right font-round font-bold tabular-nums" style={{ color: xm.color }}>
                    {left != null ? `${left}天` : '未定'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-dream-sub group-hover:text-dream-ink transition-colors">
                    {x.title}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {/* 看完「再來還有誰」的下一個念頭就是「怕忘記」——
            訂閱入口放在這裡，不用去活動頁找 */}
        <div className="mt-2.5 pt-2 border-t border-dashed border-dream-line dark:border-white/10">
          <SubscribeCalendar compact />
        </div>
      </div>
    )}
    </div>
  )
}

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
            <p className="mt-2.5 text-[16px] text-dream-sub max-w-md">
              邦邦聲優與樂團來台的活動紀錄，從 2018 記到現在。
            </p>
          </div>
          <StickyNote text={OWNER_NOTE} />
        </div>
      </div>

      {/* 第一屏。桌機：票根（帶海報）佔三分之二、今年快照在右，「最近公布」攤成一排封面在下面；
          手機：「最近公布」仍然排最前面 —— 這站常被偷襲，第一個問題永遠是「最近還有誰」 */}
      <div className="mt-6 sm:mt-8 flex flex-col gap-6 sm:gap-8">
        <div className="order-2 lg:order-1 min-w-0">
          <TicketCountdown events={events} onSelect={onSelect}
            aside={<YearSnapshot events={events} onYearJump={onYearJump} />} />
        </div>
        <div className="order-1 lg:order-2 min-w-0">
          <JustAnnounced events={events} onSelect={onSelect} variant="strip" />
        </div>
      </div>

      {/* 上次看到哪。沒紀錄或超過兩週就整行不出現 */}
      <ResumeLine events={events} onSelect={onSelect} />

      {/* 上次來之後新增了什麼。第一次來的人看不到 */}
      <NewSince events={events} onSelect={onSelect} />

      {/* 全站規模：從第一屏降級成一行字，不再佔四塊磚 */}
      <p className="mt-4 text-[14px] text-dream-faint">
        全站 {stats.total} 筆活動紀錄 · {stats.bandCount} 個樂團
        {stats.songCount > 0 && (
          <> · <a href="#/songs" className="hover:text-dream-ink underline decoration-dotted underline-offset-2">
            {stats.songCount} 首唱過的歌
          </a></>
        )} · {stats.yearRange}
      </p>
    </section>
  )
}
