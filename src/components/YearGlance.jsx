import { primaryMeta, isPersonal } from '../utils/bands.js'
import { isUrgent } from '../utils/urgency.js'
import Icon from './Icon.jsx'

// 手機版的年度總覽：12 個月排成 4×3 的格子，一眼看完整年。
//
// 桌機那套（12 張並排的月卡）縮到手機只能橫滑，代價是：
// 看不到整年的形狀、滑到一半會迷路、空月份跟滿月份佔一樣寬。
// 這裡改成先給「哪幾個月有事、哪個月最滿」，點下去才展開那個月的清單。
//
// 格子的深淺＝那個月的活動數，所以不用讀數字也看得出節奏。

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function YearGlance({ year, byMonth, thisYear, thisMonth, openMonth, onOpenMonth, onSelect }) {
  const peak = Math.max(1, ...MONTHS.map(m => (byMonth.get(m) || []).length))
  const opened = openMonth ? (byMonth.get(openMonth) || []) : []

  return (
    <div className="sm:hidden">
      <div className="grid grid-cols-4 gap-1.5">
        {MONTHS.map(m => {
          const list = byMonth.get(m) || []
          const isNow = year === thisYear && m === thisMonth
          const isOpen = openMonth === m
          const has = list.length > 0
          // 有活動的月份用樂團色底，濃淡跟著活動數走
          const strength = has ? 0.13 + (list.length / peak) * 0.4 : 0
          const tint = has ? primaryMeta(list[0]).glow : null
          const urgent = list.some(isUrgent)

          return (
            <button
              key={m}
              onClick={() => onOpenMonth(isOpen ? null : m)}
              aria-pressed={isOpen}
              aria-label={`${m} 月，${has ? `${list.length} 場` : '沒有活動'}`}
              className={`relative rounded-xl px-1 py-2.5 flex flex-col items-center gap-1 transition-colors ${
                isOpen ? 'ring-2 ring-bloom-indigo' : ''} ${
                has ? 'text-dream-ink' : 'text-dream-faint/70'}`}
              style={{
                background: has ? `rgba(${tint},${strength})` : 'transparent',
                boxShadow: has ? 'none' : 'inset 0 0 0 1px rgba(var(--c-ink),0.07)',
              }}
            >
              {isNow && (
                <span aria-hidden className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-bloom-indigo" />
              )}
              {urgent && (
                <span aria-hidden className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full"
                  style={{ background: 'rgb(var(--c-urgent))' }} />
              )}
              <span className="font-display font-bold text-[15px] leading-none tabular-nums">{m}</span>
              <span className="text-[10.5px] leading-none tabular-nums">
                {has ? `${list.length} 場` : '—'}
              </span>
            </button>
          )
        })}
      </div>

      {/* 展開的那個月。沒點就給一行提示，不留空白 */}
      {openMonth ? (
        <div className="mt-3 rounded-xl bg-dream-line/30 dark:bg-white/[.04] px-3.5 py-3">
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-display font-bold text-[15px] text-dream-ink">
              {year} 年 {openMonth} 月
              <span className="ml-2 text-[12px] font-normal text-dream-faint">{opened.length} 場</span>
            </span>
            <button onClick={() => onOpenMonth(null)} aria-label="收起"
              className="text-[12px] text-dream-faint hover:text-dream-ink">收起</button>
          </div>
          <ul className="flex flex-col">
            {opened.map(e => {
              const meta = primaryMeta(e)
              const day = e.startDate ? Number(e.startDate.slice(8, 10)) : null
              const urgent = isUrgent(e)
              const color = urgent ? 'rgb(var(--c-urgent))' : meta.color
              return (
                <li key={e.id} className="border-b border-dream-line/70 last:border-0 dark:border-white/10">
                  <button onClick={() => onSelect(e.id)}
                    className="row-press w-full flex items-center gap-2.5 py-2.5 text-left">
                    <span className="shrink-0 w-9 text-right font-round font-bold text-[13px] tabular-nums" style={{ color }}>
                      {day ? `${day}日` : '未定'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] text-dream-ink truncate">
                        {(e.people || []).join('、') || e.title}
                      </span>
                      <span className="block text-[11.5px] text-dream-faint truncate">
                        {isPersonal(e) ? '個人' : meta.name}{e.venue ? ` · ${e.venue}` : ''}
                      </span>
                    </span>
                    <Icon n="chevron-right" className="shrink-0 text-[10px] text-dream-faint" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-2.5 text-[12px] text-dream-faint text-center">點一個月份看當月場次</p>
      )}
    </div>
  )
}
