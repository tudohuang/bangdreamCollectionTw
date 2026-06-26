import { useMemo } from 'react'
import { bandMeta, rootGroup, primaryMeta, isPersonal, BAND_META } from '../utils/bands.js'
import { coverOf } from '../utils/media.js'
import { buildRoster, detectCity } from '../utils/derive.js'
import { eventStatus } from '../utils/datetime.js'
import { formatMonthDay, copyText } from '../utils/share.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'
import { useState } from 'react'

function tally(arr) {
  const m = {}
  for (const x of arr) m[x] = (m[x] || 0) + 1
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

export default function ProfilePage({ kind, value, events, attended, onToggleAttended, onSelect, onClose }) {
  const [toast, setToast] = useState('')

  const data = useMemo(() => {
    const list = events
      .filter(e => kind === 'person'
        ? (e.people || []).includes(value)
        : (e.relatedGroups || []).some(g => rootGroup(g) === value))
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))

    const years = list.map(e => e.year).filter(Boolean)
    const attendance = list.reduce((s, e) => s + (e.attendanceCount || 0), 0)
    const cities = tally(list.map(detectCity).filter(Boolean))
    const fullBand = list.filter(e => e.isFullBand).length

    // 關聯（人 → 看過的樂團；團 → 成員聲優）
    const relatedRaw = kind === 'person'
      ? list.flatMap(e => (e.relatedGroups || []).map(rootGroup))
      : list.flatMap(e => e.people || [])
    const related = tally(relatedRaw)

    const roster = kind === 'person' ? buildRoster(events)[value] : null
    return { list, years, attendance, cities, fullBand, related, roster }
  }, [kind, value, events])

  const { list, years, attendance, cities, fullBand, related, roster } = data

  const meta = kind === 'band'
    ? bandMeta(value)
    : (roster ? bandMeta(roster.band) : (list[0] ? primaryMeta(list[0]) : BAND_META.other))

  const first = list.length ? list[list.length - 1].year : null
  const last = list.length ? list[0].year : null
  const span = first && last ? (first === last ? `${first}` : `${first}–${last}`) : '—'

  const copyLink = async () => {
    const ok = await copyText(`${location.origin}${location.pathname}#/${kind}/${encodeURIComponent(value)}`)
    setToast(ok ? '已複製連結' : '複製失敗')
    setTimeout(() => setToast(''), 1800)
  }

  if (!list.length) {
    return (
      <div className="py-24 text-center">
        <div className="text-dream-faint text-4xl mb-4"><Icon n={kind === 'person' ? 'microphone' : 'guitar'} /></div>
        <div className="font-display font-bold text-xl text-dream-ink">找不到「{value}」的場次</div>
        <button onClick={onClose} className="pill mt-6">← 回首頁</button>
      </div>
    )
  }

  return (
    <div className="animate-riseIn">
      <button onClick={onClose} className="inline-flex items-center gap-1.5 text-[13px] text-dream-sub hover:text-dream-ink mb-6">
        <Icon n="chevron-left" className="text-[11px]" /> 回首頁
      </button>

      {/* 主檔頭 */}
      <div className="glass overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: meta.color }} />
        <div className="p-6 sm:p-8 flex items-start gap-5">
          <div className="grid place-items-center w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0 text-2xl text-white"
            style={{ background: meta.color }}>
            <Icon n={kind === 'person' ? 'microphone' : meta.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold tracking-wide" style={{ color: meta.color }}>
              {kind === 'person' ? '聲優' : '樂團'}
            </div>
            <h1 className="font-display font-extrabold text-dream-ink leading-tight mt-0.5"
              style={{ fontSize: 'clamp(26px,5vw,40px)' }}>{value}</h1>
            {kind === 'person' && roster && (
              <div className="mt-1 text-[13px] text-dream-sub">
                飾 <span className="font-semibold text-dream-ink">{roster.char}</span>
                <span className="text-dream-faint"> · {roster.band}</span>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <Stat n={list.length} unit="場" label="來台場次" color={meta.color} />
              <Stat n={span} label="跨越年份" color={meta.color} />
              {attendance > 0 && <Stat n={attendance} unit="人次" label="累計人次" color={meta.color} />}
              {kind === 'band' && <Stat n={related.length} unit="位" label="登場聲優" color={meta.color} />}
              {kind === 'band' && fullBand > 0 && <Stat n={fullBand} unit="場" label="全團場次" color={meta.color} />}
              {kind === 'person' && <Stat n={related.length} unit="團" label="關聯樂團" color={meta.color} />}
            </div>
            <div className="mt-5 flex gap-2.5">
              <button onClick={copyLink}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-bold text-white bg-bloom-indigo hover:bg-bloom-violet transition-colors">
                <Icon n="link" /> 複製這頁連結
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 關聯 chips */}
      {related.length > 0 && (
        <div className="mt-7">
          <div className="text-[11px] font-bold text-dream-faint mb-2.5">
            {kind === 'person' ? '看過的樂團／關聯' : '登場成員（依次數）'}
          </div>
          <div className="flex flex-wrap gap-2">
            {related.map(([name, n]) => {
              const isBand = kind === 'person'
              const bm = isBand ? bandMeta(name) : null
              return (
                <a key={name} href={`#/${isBand ? 'band' : 'person'}/${encodeURIComponent(name)}`}
                  className="pill">
                  {bm && <span className="w-2 h-2 rounded-full" style={{ background: bm.color }} />}
                  {name} <span className="text-dream-faint">×{n}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {cities.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[12.5px] text-dream-sub">
          <Icon n="location-dot" className="text-bloom-rose text-[11px]" />
          {cities.map(([c, n]) => <span key={c} className="text-dream-ink">{c}<span className="text-dream-faint"> ×{n}</span></span>)}
        </div>
      )}

      {/* 全部場次 */}
      <div className="mt-9">
        <h2 className="section-h mb-5">全部場次 <span className="text-dream-faint text-lg font-bold">{list.length}</span></h2>
        <ul className="space-y-2.5">
          {list.map(e => {
            const m = primaryMeta(e)
            const cover = coverOf(e)
            const status = eventStatus(e)
            const att = attended?.has(e.id)
            return (
              <li key={e.id}>
                <button onClick={() => onSelect(e.id)}
                  className="event-card group w-full text-left flex items-center gap-3.5 p-3 pr-4"
                  style={{ '--band': m.glow }}>
                  <div className="relative w-16 h-16 sm:w-20 sm:h-16 shrink-0 rounded overflow-hidden grid place-items-center"
                    style={{ background: cover ? undefined : `rgba(${m.glow},0.12)` }}>
                    {cover
                      ? <Img src={cover} className="w-full h-full object-cover group-hover:scale-105 motion-reduce:transform-none" />
                      : <span className="text-lg" style={{ color: m.color }}><Icon n={isPersonal(e) ? 'user' : m.icon} /></span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[12px] text-dream-sub">
                      <span className="font-round font-bold" style={{ color: m.color }}>#{String(e.number ?? 0).padStart(3, '0')}</span>
                      <span>{e.year}.{formatMonthDay(e.startDate).replace(/^\d{4}\./, '')}</span>
                      {status === 'past' && <span className="text-dream-faint">已結束</span>}
                      {(status === 'upcoming' || status === 'ongoing') && <span className="text-bloom-indigo font-bold">即將</span>}
                    </div>
                    <div className="font-display font-bold text-[14px] text-dream-ink line-clamp-1 mt-0.5 group-hover:text-bloom-indigo transition-colors">{e.title}</div>
                    {e.type && <div className="text-[12px] text-dream-faint mt-0.5 truncate">{e.type}</div>}
                  </div>
                  <span
                    role="button" tabIndex={0}
                    onClick={(ev) => { ev.stopPropagation(); onToggleAttended?.(e.id) }}
                    onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.stopPropagation(); onToggleAttended?.(e.id) } }}
                    aria-label={att ? '取消已去過' : '標記我去過'}
                    className={`grid place-items-center w-7 h-7 rounded shrink-0 ${att ? 'bg-bloom-indigo text-white' : 'border border-dream-line text-dream-faint hover:text-dream-ink'}`}>
                    <Icon n="circle-check" className="text-[11px]" />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 rounded bg-dream-ink text-white text-[13px] font-medium px-4 py-2">
          <Icon n="circle-check" className="text-bloom-pink" />{toast}
        </div>
      )}
    </div>
  )
}

function Stat({ n, unit, label, color }) {
  return (
    <div>
      <div className="font-display font-bold text-dream-ink leading-none">
        <span className="text-xl" style={{ color }}>{n}</span>
        {unit && <span className="text-[13px] text-dream-sub ml-0.5">{unit}</span>}
      </div>
      <div className="text-[11px] text-dream-faint mt-1">{label}</div>
    </div>
  )
}
