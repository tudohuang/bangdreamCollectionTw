import { useMemo, useState } from 'react'
import { bandMeta } from '../utils/bands.js'
import { monthGrid, monthLoad } from '../utils/parsePulse.js'
import { todayStr } from '../utils/datetime.js'
import Icon from './Icon.jsx'

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

// 動態頁的月曆：選一個月，看那個月每天誰有行程，以及誰整個月排滿了。
export default function PulseCalendar({ months = [], pulse = [], events = [], roster = [], onSelectEvent }) {
  const today = todayStr()
  // 沒有月份就沒有月曆可畫，整塊不出現。
  //
  // 少傳一個 prop 不該讓整頁掛掉 —— 那是 ErrorBoundary 接得住、
  // 但使用者只看得到「這個區塊出了點狀況」的那種錯，而且完全查不出原因。
  const defaultYm = months.includes(today.slice(0, 7))
    ? today.slice(0, 7)
    : months[months.length - 1] || ''
  const [ym, setYm] = useState(defaultYm)
  const hasMonths = months.length > 0
  const [day, setDay] = useState(null)

  // 名字 → 樂團色，月曆上的點與清單都靠它上色
  const colorOf = useMemo(() => {
    const map = new Map()
    for (const r of roster) map.set(r.name, bandMeta(r.band).color)
    return (name) => map.get(name) || '#9c94be'
  }, [roster])

  // 這個月每一天有哪些事：日本行程 + 來台場次（跨日的場次每一天都算）
  const byDay = useMemo(() => {
    const map = new Map()
    const push = (date, item) => {
      if (!map.has(date)) map.set(date, [])
      map.get(date).push(item)
    }
    for (const p of pulse) {
      if (p.date?.slice(0, 7) === ym) push(p.date, { where: 'jp', ...p })
    }
    for (const e of events) {
      if (!e.startDate || e.startDate.includes('??')) continue
      const end = e.endDate && e.endDate >= e.startDate ? e.endDate : e.startDate
      for (const d of daysBetween(e.startDate, end)) {
        if (d.slice(0, 7) !== ym) continue
        push(d, {
          where: 'tw', id: e.id, date: d, title: e.title,
          place: e.venue, name: (e.people || []).join('、') || (e.relatedGroups || [])[0] || '',
        })
      }
    }
    return map
  }, [pulse, events, ym])

  const grid = useMemo(() => monthGrid(ym), [ym])
  const busy = useMemo(() => monthLoad(pulse, ym, roster), [pulse, ym, roster])
  const tracked = useMemo(() => roster.filter(r => r.tracked && r.kind === 'person'), [roster])
  const free = tracked.filter(r => !busy.some(b => b.name === r.name))

  const i = months.indexOf(ym)
  const dayItems = day ? (byDay.get(day) || []) : []

  if (!hasMonths) return null

  return (
    <div className="flex flex-col gap-4">
      {/* 月份切換 */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setYm(months[i - 1])} disabled={i <= 0}
          aria-label="上個月" className="icon-btn disabled:opacity-30 disabled:pointer-events-none">
          <Icon n="chevron-left" />
        </button>
        <span className="font-display font-bold text-[18px] text-dream-ink w-[124px] text-center">
          {ym.slice(0, 4)} 年 {Number(ym.slice(5))} 月
        </span>
        <button onClick={() => setYm(months[i + 1])} disabled={i >= months.length - 1}
          aria-label="下個月" className="icon-btn disabled:opacity-30 disabled:pointer-events-none">
          <Icon n="chevron-right" />
        </button>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none ml-1">
          {months.map(m => (
            <button key={m} onClick={() => { setYm(m); setDay(null) }}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[14px] font-round font-bold transition-colors ${
                m === ym
                  ? 'bg-bloom-indigo text-white'
                  : 'text-dream-faint hover:text-dream-ink hover:bg-dream-line/60 dark:hover:bg-white/10'}`}>
              {Number(m.slice(5))} 月
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
        {/* 月曆 */}
        <div className="glass p-3 sm:p-4">
          <div className="grid grid-cols-7 mb-1">
            {WEEK.map((w, wi) => (
              <div key={w} className={`text-center text-[14px] font-bold pb-1.5 ${
                wi === 0 || wi === 6 ? 'text-bloom-rose/70' : 'text-dream-faint'}`}>{w}</div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            {grid.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((date, di) => {
                  if (!date) return <div key={di} />
                  const items = byDay.get(date) || []
                  const jp = items.filter(x => x.where === 'jp')
                  const tw = items.some(x => x.where === 'tw')
                  const isToday = date === today
                  const on = date === day
                  return (
                    <button key={date}
                      onClick={() => setDay(on ? null : date)}
                      disabled={!items.length}
                      aria-label={`${Number(date.slice(8))} 日，${items.length} 筆`}
                      className={`relative min-h-[62px] rounded-xl border p-1.5 text-left transition-colors ${
                        items.length ? 'cursor-pointer hover:border-bloom-violet' : 'cursor-default'
                      } ${on ? 'border-dream-ink ring-1 ring-dream-ink' : 'border-dream-line dark:border-white/10'} ${
                        tw ? 'bg-[rgba(var(--c-urgent),0.07)]' : ''}`}
                    >
                      <span className={`inline-grid place-items-center w-5 h-5 rounded-full font-round text-[14px] font-bold ${
                        isToday ? 'bg-bloom-indigo text-white' : 'text-dream-sub'}`}>
                        {Number(date.slice(8))}
                      </span>
                      {tw && (
                        <span className="absolute right-1.5 top-1.5 rounded-full px-1.5 text-[14px] font-bold text-white"
                          style={{ background: 'rgb(var(--c-urgent))' }}>台</span>
                      )}
                      <span className="mt-1 flex flex-wrap gap-[3px]">
                        {jp.slice(0, 6).map((it, k) => (
                          <span key={k} className="w-1.5 h-1.5 rounded-full"
                            style={{ background: colorOf(it.name) }} />
                        ))}
                        {jp.length > 6 && (
                          <span className="text-[14px] font-round text-dream-faint leading-none">+{jp.length - 6}</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {day && (
            <div className="mt-3 pt-3 border-t border-dashed border-dream-line dark:border-white/10">
              <div className="text-[14px] font-bold text-dream-ink mb-2">
                {Number(day.slice(5, 7))} / {Number(day.slice(8))} · {dayItems.length} 筆
              </div>
              <ul className="flex flex-col gap-1.5">
                {dayItems.map((it, k) => (
                  <li key={k} className="flex items-start gap-2 text-[14px]">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-[7px]"
                      style={{ background: it.where === 'tw' ? 'rgb(var(--c-urgent))' : colorOf(it.name) }} />
                    <span className="min-w-0">
                      <span className="font-medium text-dream-ink">{it.name}</span>
                      <span className="text-dream-faint mx-1.5">·</span>
                      {it.where === 'tw' && onSelectEvent ? (
                        <button onClick={() => onSelectEvent(it.id)}
                          className="text-left text-dream-sub hover:text-bloom-violet transition-colors">
                          {it.title}
                        </button>
                      ) : (
                        <span className="text-dream-sub">{it.title}</span>
                      )}
                      {it.place && <span className="text-[14px] text-dream-faint ml-1.5">{it.place}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 當月忙碌程度 */}
        <div className="glass p-4 flex flex-col gap-3">
          <div>
            <div className="font-display font-bold text-[16px] text-dream-ink">
              {Number(ym.slice(5))} 月沒空的人
            </div>
            <p className="text-[14px] text-dream-faint mt-0.5">
              依日本行程數排，排滿的人這個月大概走不開
            </p>
          </div>

          {busy.length === 0 ? (
            <p className="text-[14px] text-dream-faint">這個月還沒有任何行程紀錄。</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {busy.map(b => (
                <li key={b.name} className="flex items-center gap-2.5 text-[14px]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colorOf(b.name) }} />
                  <span className="min-w-0 flex-1 truncate text-dream-ink">{b.name}</span>
                  {/* 只有團體行程的人標一下，才知道這個「沒空」是跟著團走的 */}
                  {b.own === 0 && b.viaBand > 0 && (
                    <span className="shrink-0 rounded-full bg-dream-line/70 dark:bg-white/10 px-1.5 text-[14px] text-dream-faint">團</span>
                  )}
                  <span className="shrink-0 text-[14px] text-dream-faint font-round">
                    {b.first.slice(5).replace('-', '/')}
                    {b.last !== b.first && `–${b.last.slice(8)}`}
                  </span>
                  <span className="shrink-0 font-display font-bold text-[14px]" style={{ color: colorOf(b.name) }}>
                    {b.count}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {free.length > 0 && (
            <div className="pt-3 border-t border-dashed border-dream-line dark:border-white/10">
              <div className="text-[14px] font-bold text-dream-faint mb-2">
                本月沒有行程紀錄（{free.length} 位）
              </div>
              <div className="flex flex-wrap gap-1.5">
                {free.map(r => (
                  <span key={r.name}
                    className="rounded-full border border-dream-line dark:border-white/10 px-2 py-0.5 text-[14px] text-dream-sub">
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// start ~ end（含頭尾）之間的每一天
function daysBetween(start, end) {
  const out = []
  const d = new Date(start)
  const last = new Date(end)
  while (d <= last && out.length < 62) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}
