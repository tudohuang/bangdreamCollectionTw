import { useMemo, useState } from 'react'
import log from '../data/changelog.json' with { type: 'json' }
import { recentFeed, daysAgoLabel } from '../utils/changelog.js'
import { eventStatus, countdownLabel, weekday, todayStr } from '../utils/datetime.js'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { isUrgent, URGENT_LABEL } from '../utils/urgency.js'
import Cover from './Cover.jsx'
import AgendaRow, { AgendaList } from './AgendaRow.jsx'
import Icon from './Icon.jsx'
import MonthCalendar from './MonthCalendar.jsx'
import MemoryWall from './MemoryWall.jsx'

// 首頁＝本月。只回答兩件事：這個月有什麼、之後還有什麼。
// 月份可以往前往後翻：海報與月曆跟著換，所以「翻某個月」的考古也在這裡。
// 以前首頁有九個區塊，倒數、今年快照、再來還有、最近公布、月曆講的都是同一批場次；
// 現在每一場只出現一次。最近才公布的直接在那一列標「新」，
// 只有公布了、但遠到這頁沒列出來的，才另外放在最上面。
const UPCOMING_MONTHS = 4
const FRESH_DAYS = 14

export default function ThisMonth({ events, onSelect, onBrowse }) {
  const today = todayStr()
  const nowYm = today.slice(0, 7)
  const [ym, setYm] = useState(nowYm)
  const [year, month] = ym.split('-').map(Number)
  const isNow = ym === nowYm

  // 能翻到的範圍：第一筆紀錄那個月 → 最後一筆（或這個月，取晚的）
  const [minYm, maxYm] = useMemo(() => {
    const yms = events.map(e => (e.startDate || '').slice(0, 7)).filter(Boolean).sort()
    return [yms[0] || nowYm, yms[yms.length - 1] > nowYm ? yms[yms.length - 1] : nowYm]
  }, [events, nowYm])
  const shift = (n) => {
    const d = new Date(year, month - 1 + n, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (next >= minYm && next <= maxYm) setYm(next)
  }

  // 「新」：兩週內公布的，或 Sheet 已經有、還沒進更新日誌的
  const fresh = useMemo(() => {
    const cut = new Date(Date.parse(today) - FRESH_DAYS * 86400000).toISOString().slice(0, 10)
    return recentFeed(log, events, 60)
      .filter(x => x.kind === 'added' && (!x.date || x.date >= cut))
      .filter(x => (x.event.endDate || x.event.startDate || '9999') >= today)
  }, [events, today])
  const freshIds = useMemo(() => new Set(fresh.map(x => x.event.id)), [fresh])

  const thisMonth = useMemo(() => events
    .filter(e => e.startDate && (e.startDate.slice(0, 7) === ym || (e.startDate < ym && (e.endDate || '') >= `${ym}-01`)))
    .sort((a, b) => a.startDate.localeCompare(b.startDate)), [events, ym])

  // 本月之後、還沒發生的，按月份分段；只看接下來幾個月，再遠的交給資料庫
  const later = useMemo(() => {
    const list = events
      .filter(e => e.startDate && e.startDate.slice(0, 7) > nowYm)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
    const groups = new Map()
    for (const e of list) {
      const k = e.startDate.slice(0, 7)
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k).push(e)
    }
    return [...groups].slice(0, UPCOMING_MONTHS)
  }, [events, nowYm])
  const laterTotal = useMemo(() => events.filter(e => e.startDate && e.startDate.slice(0, 7) > nowYm).length, [events, nowYm])

  const ahead = thisMonth.filter(e => eventStatus(e, today) !== 'past').length
  const shown = new Set([...thisMonth, ...later.flatMap(([, l]) => l)].map(e => e.id))
  const recent = fresh.filter(x => !shown.has(x.event.id))

  return (
    <div className="max-w-4xl mx-auto">
      {isNow && recent.length > 0 && (
        <section className="mb-10">
          <SectionHead title="最近公布" />
          <AgendaList>
            {recent.map(x => (
              <AgendaRow key={x.event.id} event={x.event} onSelect={onSelect} today={today} showYear fresh
                right={<span className="text-dream-faint">{daysAgoLabel(x.date, today)}</span>} />
            ))}
          </AgendaList>
        </section>
      )}

      <section className="mb-10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1 min-w-0">
            <MonthArrow dir={-1} onClick={() => shift(-1)} disabled={ym <= minYm} />
            <h1 className="font-display font-bold text-[32px] leading-none text-dream-ink tabular-nums whitespace-nowrap">
              {month} 月<span className="ml-2 text-[18px] font-semibold text-dream-faint">{year}</span>
            </h1>
            <MonthArrow dir={1} onClick={() => shift(1)} disabled={ym >= maxYm} />
          </div>
          <p className="text-[14px] text-dream-sub tabular-nums text-right">
            {!isNow && <button onClick={() => setYm(nowYm)} className="mr-3 font-semibold text-bloom-indigo hover:underline">回本月</button>}
            {thisMonth.length ? <>{thisMonth.length} 場{isNow && ahead > 0 && ahead < thisMonth.length && <> · 還有 {ahead} 場</>}</> : null}
          </p>
        </div>
        {thisMonth.length ? (
          // 這個月的場次是這一頁的主角，用大張海報：手機左右滑，桌機排成格子
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-none pb-1">
            {/* 還沒發生的排前面，手機一滑開就是接下來的那場；已結束的退到後面 */}
            {[...thisMonth.filter(e => eventStatus(e, today) !== 'past'), ...thisMonth.filter(e => eventStatus(e, today) === 'past')].map((e, i) => (
              <PosterCard key={e.id} event={e} onSelect={onSelect} today={today} fresh={freshIds.has(e.id)} priority={i < 3} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-dream-line dark:border-white/15 px-5 py-8 text-center text-[16px] text-dream-sub">
            {isNow ? '這個月目前沒有活動。' : '這個月沒有活動。'}
          </p>
        )}
        <MonthCalendar ym={ym} events={thisMonth} today={today} onSelect={onSelect} className="mt-6" />
      </section>

      {isNow && later.length > 0 && (
        <section className="mb-10">
          <SectionHead title="接下來" />
          <div className="space-y-6">
            {later.map(([k, list]) => (
              <div key={k}>
                <h3 className="mb-2 px-1 text-[14px] font-semibold text-dream-faint tabular-nums">
                  {Number(k.slice(5, 7))} 月{k.slice(0, 4) !== String(year) && ` · ${k.slice(0, 4)}`}
                  <span className="ml-2 font-normal">{list.length} 場</span>
                </h3>
                <AgendaList>
                  {list.map(e => <AgendaRow key={e.id} event={e} onSelect={onSelect} today={today} fresh={freshIds.has(e.id)} />)}
                </AgendaList>
              </div>
            ))}
          </div>
        </section>
      )}

      {laterTotal > later.reduce((n, [, l]) => n + l.length, 0) && (
        <button onClick={() => onBrowse({ timeframe: 'upcoming' })}
          className="mb-3 w-full text-center text-[14px] font-semibold text-bloom-indigo hover:underline">
          更後面還有 {laterTotal - later.reduce((n, [, l]) => n + l.length, 0)} 場
        </button>
      )}
      {isNow && <MemoryWall events={events} today={today} onSelect={onSelect} />}

      <button onClick={() => onBrowse({})}
        className="w-full flex items-center justify-between rounded-2xl border border-dream-line bg-white px-5 py-4 text-left hover:border-bloom-indigo/50 transition-colors dark:bg-white/[.03] dark:border-white/10">
        <span className="text-[16px] font-semibold text-dream-ink">查全部 {events.length} 筆紀錄</span>
        <Icon n="chevron-right" className="text-dream-faint" />
      </button>
    </div>
  )
}

function MonthArrow({ dir, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir < 0 ? '上個月' : '下個月'}
      className="grid place-items-center w-9 h-9 rounded-full text-dream-sub hover:bg-dream-line/60 hover:text-dream-ink disabled:opacity-25 disabled:pointer-events-none dark:hover:bg-white/10">
      <Icon n={dir < 0 ? 'chevron-left' : 'chevron-right'} className="text-[14px]" />
    </button>
  )
}

function SectionHead({ title }) {
  return <h2 className="mb-3 px-1 font-display font-bold text-[18px] text-dream-ink">{title}</h2>
}

// 本月的海報卡：封面鋪滿，底部壓一層暗色放日期與名稱；角上是倒數或「已結束」
function PosterCard({ event: e, onSelect, today, fresh, priority }) {
  const m = primaryMeta(e)
  const status = eventStatus(e, today)
  const past = status === 'past'
  const urgent = isUrgent(e) && !past
  const countdown = countdownLabel(e, { today })
  const [, mo, d] = (e.startDate || '').split('-')
  const wd = weekday(e.startDate).replace('週', '')
  const tag = urgent ? URGENT_LABEL : past ? '已結束' : countdown
  return (
    <button onClick={() => onSelect(e.id)}
      className="group snap-start shrink-0 w-[64vw] max-w-[260px] sm:w-auto sm:max-w-none text-left">
      <span className={`relative block aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 transition-transform duration-200 group-hover:-translate-y-1 ${past ? 'saturate-[.55]' : ''}`}>
        <Cover event={e} size="sm" sizes="(max-width: 639px) 64vw, 260px" priority={priority}
          className="absolute inset-0 w-full h-full [&_img]:object-top" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <span className="absolute left-3 top-3 flex gap-1.5">
          {fresh && <span className="rounded-full px-2.5 py-1 text-[12px] font-bold text-white bg-bloom-rose">新</span>}
          {tag && (
            <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${
              urgent ? 'bg-[rgb(var(--c-urgent))] text-white' : past ? 'bg-black/55 text-white/85' : 'bg-white text-dream-ink'}`}>{tag}</span>
          )}
        </span>
        <span className="absolute inset-x-0 bottom-0 p-3.5 text-white">
          <span className="flex items-baseline gap-2">
            <span className="font-display font-bold text-[30px] leading-none tabular-nums">{Number(d)}</span>
            <span className="text-[14px] text-white/80">{Number(mo)}月 {wd}</span>
          </span>
          <span className="mt-1.5 block font-display font-semibold text-[16px] leading-snug line-clamp-2">{e.title}</span>
          <span className="mt-1 flex items-center gap-1.5 text-[14px] text-white/75 min-w-0">
            <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: m.color }} />
            <span className="truncate">{isPersonal(e) ? `個人 · ${m.name}` : m.name}{e.venue && ` · ${e.venue}`}</span>
          </span>
        </span>
      </span>
    </button>
  )
}
