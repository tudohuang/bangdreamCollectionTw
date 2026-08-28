import { useMemo } from 'react'
import { organizerProfile } from '../utils/organizers.js'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import { formatMonthDay } from '../utils/share.js'
import Icon from './Icon.jsx'

// 主辦頁：只列客觀履歷。辦得好不好留給活動心得講，這裡不評分。
export default function OrganizerPage({ value, events, onSelect, onClose }) {
  const p = useMemo(() => organizerProfile(events, value), [events, value])

  if (!p) {
    return (
      <section className="glass px-6 py-20 text-center">
        <div className="font-display font-bold text-xl text-dream-ink">找不到「{value}」</div>
        <button onClick={onClose} className="btn-primary mt-6">回上一頁</button>
      </section>
    )
  }

  const maxYear = Math.max(...p.byYear.map(([, n]) => n), 1)
  const stats = [
    ['累計', `${p.count} 筆`],
    ['本體', p.core],
    ['個人', p.personal],
    ['首次', p.firstYear ?? '—'],
    ['最近', p.lastYear ?? '—'],
  ]

  return (
    <section>
      {/* 同上：手機用 App Bar 的返回 */}
      <button onClick={onClose}
        className="hidden sm:inline-flex items-center gap-1.5 text-[14px] text-dream-sub hover:text-dream-ink transition-colors">
        <Icon n="chevron-left" className="text-[11px]" /> 回上一頁
      </button>

      <div className="mt-4">
        <div className="eyebrow"><Icon n="users" className="text-[10px]" /> Organizer</div>
        <h2 className="section-h mt-1.5">{p.name}</h2>
        <p className="mt-2 text-[14px] text-dream-sub">
          {p.firstYear === p.lastYear ? `${p.firstYear} 年` : `${p.firstYear}–${p.lastYear}`}
          ，主辦或協辦 {p.count} 筆收錄活動。
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-3 sm:grid-cols-5 gap-px rounded-xl overflow-hidden bg-dream-line dark:bg-white/10">
        {stats.map(([k, v]) => (
          <div key={k} className="bg-white px-3 py-3.5 text-center dark:bg-white/[.04]">
            <dd className="font-display font-bold text-[20px] text-dream-ink tabular-nums leading-none">{v}</dd>
            <dt className="text-[14px] text-dream-faint mt-1.5">{k}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid lg:grid-cols-2 gap-5">
        <div className="glass p-6">
          <h3 className="font-display font-bold text-[16px] text-dream-ink mb-4">年份分布</h3>
          <div className="space-y-2">
            {p.byYear.map(([year, n]) => (
              <div key={year} className="flex items-center gap-3 text-[14px]">
                <span className="w-10 shrink-0 text-dream-faint tabular-nums">{year}</span>
                <span className="flex-1 h-2.5 rounded-full bg-dream-line dark:bg-white/10 overflow-hidden">
                  <span className="block h-full rounded-full bg-gradient-to-r from-bloom-sky to-bloom-indigo"
                    style={{ width: `${(n / maxYear) * 100}%` }} />
                </span>
                <span className="w-6 text-right font-round font-bold text-dream-sub tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6 space-y-5">
          <Chips title="常用場館" items={p.venues.slice(0, 6)} />
          <Chips title="城市" items={p.cities} />
          <Chips title="活動類型" items={p.types.slice(0, 8)} />
        </div>
      </div>

      {p.people.length > 0 && (
        <div className="mt-5 glass p-6">
          <h3 className="font-display font-bold text-[16px] text-dream-ink mb-3.5">合作藝人</h3>
          <div className="flex flex-wrap gap-2">
            {p.people.slice(0, 24).map(([name, n]) => (
              <a key={name} href={`#/person/${encodeURIComponent(name)}`} className="pill">
                {name} <span className="text-dream-faint">×{n}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-9">
        <h2 className="section-h mb-5">活動履歷 <span className="text-dream-faint text-lg font-bold">{p.count}</span></h2>
        <ul className="space-y-2.5">
          {p.list.map(e => {
            const m = primaryMeta(e)
            return (
              <li key={e.id}>
                <button onClick={() => onSelect(e.id)}
                  className="event-card group w-full flex items-center gap-3 p-3.5 text-left"
                  style={{ '--band': m.glow }}>
                  <span className="shrink-0 w-16 text-center">
                    <span className="block font-round font-bold text-[14px]" style={{ color: m.color }}>{e.year}</span>
                    <span className="block text-[14px] text-dream-faint">
                      {e.startDate ? formatMonthDay(e.startDate).replace(/^\d{4}\./, '') : '未定'}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-semibold text-[16px] text-dream-ink line-clamp-1 group-hover:text-bloom-violet transition-colors">
                      {e.title}
                    </span>
                    <span className="flex items-center gap-1.5 text-[14px] text-dream-sub">
                      <Icon n={isPersonal(e) ? 'user' : m.icon} className="text-[9px]" style={{ color: m.color }} />
                      {isPersonal(e) ? '個人' : m.name}
                      {e.venue && <span className="text-dream-faint truncate hidden sm:inline">· {e.venue}</span>}
                    </span>
                  </span>
                  <Icon n="chevron-right" className="shrink-0 text-dream-faint" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function Chips({ title, items }) {
  if (!items.length) return null
  return (
    <div>
      <div className="text-[14px] font-bold text-dream-faint mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map(([name, n]) => (
          <span key={name} className="pill">{name} <span className="text-dream-faint">×{n}</span></span>
        ))}
      </div>
    </div>
  )
}
