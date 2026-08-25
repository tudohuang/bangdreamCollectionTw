import { useMemo } from 'react'
import { isPersonal } from '../utils/bands.js'
import { formatMonthDay } from '../utils/share.js'
import Icon from './Icon.jsx'

// 個人／樂團的來台時間軸。
//
// 「來台 5 次、初登場 2018」這種摘要看不出節奏；
// 攤成一條時間軸才看得出哪一年是空窗、哪一年突然密集。
// 同一個月的場次併成一顆點，點越大那個月越滿。

const DAY = 86400000
const startOf = (y) => Date.parse(`${y}-01-01T00:00:00Z`)
const endOf = (y) => Date.parse(`${y}-12-31T00:00:00Z`)

function build(list) {
  const dated = list.filter(e => e.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate))
  if (!dated.length) return null

  const firstYear = Number(dated[0].startDate.slice(0, 4))
  const lastYear = Math.max(Number(dated[dated.length - 1].startDate.slice(0, 4)), new Date().getFullYear())
  const from = startOf(firstYear)
  const span = Math.max(1, endOf(lastYear) - from)
  const at = (date) => ((Date.parse(`${date}T00:00:00Z`) - from) / span) * 100

  // 同月合併
  const months = new Map()
  for (const e of dated) {
    const ym = e.startDate.slice(0, 7)
    if (!months.has(ym)) months.set(ym, [])
    months.get(ym).push(e)
  }
  const dots = [...months.entries()].map(([ym, arr]) => ({
    ym,
    left: at(`${ym}-15`),
    events: arr,
    personal: arr.every(isPersonal),
  }))

  // 最長空窗：只有超過一年才值得標
  let gap = null
  for (let i = 1; i < dated.length; i++) {
    const days = (Date.parse(dated[i].startDate) - Date.parse(dated[i - 1].startDate)) / DAY
    if (days >= 365 && (!gap || days > gap.days)) {
      gap = { days, left: at(dated[i - 1].startDate), width: at(dated[i].startDate) - at(dated[i - 1].startDate) }
    }
  }

  const years = []
  for (let y = firstYear; y <= lastYear; y++) years.push({ y, left: at(`${y}-01-01`) })

  return {
    dots, gap, years, firstYear, lastYear,
    first: dated[0],
    last: dated[dated.length - 1],
    core: dated.filter(e => !isPersonal(e)).length,
    personal: dated.filter(isPersonal).length,
  }
}

export default function LifeTimeline({ list, color, glow, onSelect }) {
  const t = useMemo(() => build(list), [list])
  if (!t || t.dots.length < 2) return null

  const stats = [
    ['本體', t.core],
    ['個人', t.personal],
    ['累計', t.core + t.personal],
    ['首次', t.firstYear],
    ['最近', t.last.startDate.slice(0, 4)],
    ...(t.gap ? [['最長空窗', `${Math.floor(t.gap.days / 365)} 年`]] : []),
  ]

  return (
    <div className="mt-7">
      <div className="flex items-center justify-between text-[11px] font-bold text-dream-faint mb-3">
        <span>來台時間軸</span>
        <span className="font-normal">{t.firstYear}–{t.lastYear}</span>
      </div>

      <div className="relative h-16 select-none">
        {/* 年份刻度 */}
        {t.years.map(({ y, left }) => (
          <span key={y} className="absolute top-0 bottom-0 border-l border-dream-line dark:border-white/10"
            style={{ left: `${left}%` }} aria-hidden />
        ))}

        {/* 最長空窗：標出來才看得懂為什麼中間那麼空 */}
        {t.gap && (
          <span className="absolute top-[26px] h-[6px] rounded-full border border-dashed"
            style={{ left: `${t.gap.left}%`, width: `${t.gap.width}%`, borderColor: `rgba(${glow},0.5)` }}
            title={`隔了 ${Math.round(t.gap.days)} 天`} aria-hidden />
        )}

        {/* 軸線 */}
        <span aria-hidden className="absolute left-0 right-0 top-[28px] h-[2px] rounded-full"
          style={{ background: `rgba(${glow},0.22)` }} />

        {/* 每個月一顆點，大小＝那個月幾場 */}
        {t.dots.map(d => {
          const size = Math.min(18, 9 + (d.events.length - 1) * 3)
          const label = `${d.ym.replace('-', '/')}｜${d.events.map(e => e.title).join('、')}`
          return (
            <button key={d.ym} title={label} aria-label={label}
              onClick={() => onSelect(d.events[0].id)}
              className="tap-target absolute -translate-x-1/2 rounded-full transition-transform hover:scale-125 focus-visible:scale-125"
              style={{
                left: `${d.left}%`,
                top: 29 - size / 2,
                width: size,
                height: size,
                background: d.personal ? 'transparent' : color,
                border: `2px solid ${color}`,
                boxShadow: `0 0 0 3px rgba(${glow},0.14)`,
              }} />
          )
        })}

        {/* 年份文字 */}
        {t.years.map(({ y, left }, i) => (
          (t.years.length <= 10 || i % 2 === 0) && (
            <span key={y} className="absolute top-[46px] -translate-x-1/2 text-[10.5px] text-dream-faint tabular-nums"
              style={{ left: `${left}%` }}>{y}</span>
          )
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-dream-sub">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} /> 本體
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: color }} /> 個人
        </span>
        <span className="text-dream-faint">點越大＝那個月場次越多</span>
      </div>

      <dl className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-px rounded-xl overflow-hidden bg-dream-line dark:bg-white/10">
        {stats.map(([k, v]) => (
          <div key={k} className="bg-white px-2 py-2.5 text-center dark:bg-white/[.04]">
            <dd className="font-round font-bold text-[15px] text-dream-ink tabular-nums">{v}</dd>
            <dt className="text-[10.5px] text-dream-faint mt-0.5">{k}</dt>
          </div>
        ))}
      </dl>

      <p className="mt-2.5 text-[12px] text-dream-faint flex items-start gap-1.5">
        <Icon n="calendar" className="text-[10px] mt-1" />
        第一場 {formatMonthDay(t.first.startDate)}「{t.first.title}」
      </p>
    </div>
  )
}
