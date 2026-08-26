import { useMemo, useState } from 'react'
import { bandMeta, rootGroup, primaryMeta, isPersonal, BAND_META } from '../utils/bands.js'
import { coverSrc } from '../utils/cover.js'
import { personBandMap, detectCity } from '../utils/derive.js'
import { eventStatus, daysUntil } from '../utils/datetime.js'
import { formatMonthDay, copyText, formatDateRangeCompact, shareUrl } from '../utils/share.js'
import { sortChrono, daysBetween } from '../utils/context.js'
import { yearGaps } from '../utils/insights.js'
import { downloadIcs } from '../utils/ics.js'
import { downloadPassCard } from '../utils/passImage.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'
import CollectionStrip from './CollectionStrip.jsx'
import LifeTimeline from './LifeTimeline.jsx'

function tally(arr) {
  const m = {}
  for (const x of arr) m[x] = (m[x] || 0) + 1
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

export default function ProfilePage({ kind, value, events, attended, onToggleAttended, onSelect, onClose, sheetRoster = [] }) {
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

    // 團／角色以「名冊」為準（聯合場次反推會判錯團）
    const roster = kind === 'person' ? personBandMap(events, sheetRoster).get(value) : null

    // 這個人／團自己的時間線：空白期、下一場、隔最久的一次
    const chrono = sortChrono(list)
    const ids = new Set(list.map(e => e.id))
    const gaps = yearGaps(chrono)
    const next = chrono.find(e => {
      const st = eventStatus(e)
      return st === 'upcoming' || st === 'ongoing'
    })
    let longest = null
    for (let i = 1; i < chrono.length; i++) {
      const d = daysBetween(chrono[i - 1].startDate, chrono[i].startDate)
      if (d != null && (!longest || d > longest.days)) {
        longest = { days: d, from: chrono[i - 1], to: chrono[i] }
      }
    }
    return { list, chrono, ids, years, attendance, cities, fullBand, related, roster, gaps, next, longest }
  }, [kind, value, events, sheetRoster])

  const { list, chrono, ids, years, attendance, cities, fullBand, related, roster, gaps, next, longest } = data
  const allChrono = useMemo(() => sortChrono(events), [events])

  // 場次依年份分組（新到舊），沒有年份的歸到最後
  const byYear = useMemo(() => {
    const map = new Map()
    for (const e of list) {
      const y = e.year || 0
      if (!map.has(y)) map.set(y, [])
      map.get(y).push(e)
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [list])

  const meta = kind === 'band'
    ? bandMeta(value)
    : (roster ? bandMeta(roster.band) : (list[0] ? primaryMeta(list[0]) : BAND_META.other))

  const first = list.length ? list[list.length - 1].year : null
  const last = list.length ? list[0].year : null
  const span = first && last ? (first === last ? `${first}` : `${first}–${last}`) : '—'

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1800) }
  const copyLink = async () => {
    const ok = await copyText(shareUrl(kind, value))
    flash(ok ? '已複製連結' : '複製失敗')
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
      {/* 手機的 App Bar 左上角已經有「返回」，這顆是給桌機的 */}
      <button onClick={onClose} className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-dream-sub hover:text-dream-ink mb-6">
        <Icon n="chevron-left" className="text-[11px]" /> 回首頁
      </button>

      {/* 主檔頭：樂團色舞台光 + 巨型浮水印圖示 */}
      <div className="glass overflow-hidden relative">
        <div className="h-1.5 w-full" style={{ background: meta.color }} />
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(560px 300px at 85% -20%, rgba(${meta.glow},0.22), transparent 65%)` }} />
        <Icon aria-hidden n={kind === 'person' ? 'microphone' : meta.icon}
          className="absolute -right-4 -bottom-6 text-[120px] pointer-events-none select-none opacity-[0.06] dark:opacity-[0.1]"
          style={{ color: meta.color }} />
        <div className="p-6 sm:p-8 flex items-start gap-5 relative">
          <div className="grid place-items-center w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0 text-2xl text-white"
            style={{ background: meta.color, boxShadow: `0 0 26px -4px rgba(${meta.glow},0.65)` }}>
            <Icon n={kind === 'person' ? 'microphone' : meta.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold tracking-wide" style={{ color: meta.color }}>
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
          </div>
        </div>

        {/* 操作列獨立一行，手機上才不會被頭像擠成三行 */}
        <div className="relative px-6 sm:px-8 pb-6 sm:pb-8 -mt-1 flex flex-wrap gap-2">
          <button onClick={copyLink} className="btn-primary !h-10 !px-5 !text-[13px]">
            <Icon n="link" /> 複製連結
          </button>
          <button className="pill !px-4 !py-2 !text-[13px]"
            onClick={() => flash(downloadIcs(list, `${value}.ics`) ? '已下載行事曆檔' : '沒有確定日期的場次')}>
            <Icon n="calendar" /> 加行事曆
          </button>
          <button className="pill !px-4 !py-2 !text-[13px]"
            onClick={() => downloadPassCard(events, ids, {
              title: `${value} 的來台紀錄`,
              header: `${kind === 'person' ? 'VOICE ACTOR' : 'BAND'} · TAIWAN BANG DREAM!`,
            })}>
            <Icon n="star" /> 存成圖
          </button>
        </div>
      </div>

      {/* 下一次來台：這頁才不只是回顧 */}
      {next && (
        <button onClick={() => onSelect(next.id)}
          className="mt-4 w-full text-left rounded-2xl px-5 py-4 flex items-center gap-4 transition-colors hover:brightness-[1.02]"
          style={{ background: `rgba(${meta.glow},0.10)`, border: `1px solid rgba(${meta.glow},0.28)` }}>
          <span className="shrink-0 text-center">
            <span className="block font-display font-extrabold text-[30px] leading-none" style={{ color: meta.color }}>
              {Math.max(0, daysUntil(next.startDate) ?? 0)}
            </span>
            <span className="block text-[11px] text-dream-faint mt-1">天後</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold" style={{ color: meta.color }}>下一次來台</span>
            <span className="block font-display font-bold text-[15px] text-dream-ink line-clamp-2 mt-0.5">{next.title}</span>
            <span className="block text-[13px] text-dream-faint mt-0.5">
              {formatDateRangeCompact(next.startDate, next.endDate)}{next.venue && ` · ${next.venue}`}
            </span>
          </span>
          <Icon n="chevron-right" className="shrink-0 text-[12px] text-dream-faint" />
        </button>
      )}

      {/* 脈絡：空白期與隔最久的一次 */}
      {(gaps.length > 0 || (longest && longest.days >= 365)) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {gaps.map(g => (
            <span key={g.from} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-dream-line dark:border-white/15 px-3 py-1.5 text-[13px] text-dream-sub">
              <Icon n="calendar" className="text-[10px] text-dream-faint" />
              {g.length === 1 ? `${g.from} 年` : `${g.from}–${g.to}`} 沒有場次
            </span>
          ))}
          {longest && longest.days >= 365 && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium"
              style={{ background: `rgba(${meta.glow},0.12)`, color: meta.color }}>
              <Icon n="bolt" className="text-[10px]" />
              最久隔了 {Math.floor(longest.days / 365)} 年
            </span>
          )}
        </div>
      )}

      <LifeTimeline list={list} color={meta.color} glow={meta.glow} onSelect={onSelect} />

      {/* 收藏軌：在全站 {allChrono.length} 場裡，這個人／團站在哪些位置 */}
      {allChrono.length > 1 && (
        <div className="mt-7">
          <div className="flex items-center justify-between text-[11px] font-bold text-dream-faint mb-2.5">
            <span>在全站的位置</span>
            <span className="font-normal">{list.length} / {allChrono.length} 場</span>
          </div>
          <CollectionStrip chrono={allChrono} isOn={(e) => ids.has(e.id)} onNavigate={onSelect} />
        </div>
      )}

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
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[13px] text-dream-sub">
          <Icon n="location-dot" className="text-bloom-rose text-[11px]" />
          {cities.map(([c, n]) => <span key={c} className="text-dream-ink">{c}<span className="text-dream-faint"> ×{n}</span></span>)}
        </div>
      )}

      {/* 全部場次：新到舊，年份分組，中間空掉的年份也標出來 */}
      <div className="mt-9">
        <h2 className="section-h mb-5">全部場次 <span className="text-dream-faint text-lg font-bold">{list.length}</span></h2>
        {byYear.map(([year, arr], gi) => {
          const prev = byYear[gi - 1]
          const skipped = prev && prev[0] - year > 1
          return (
            <div key={year} className={gi ? 'mt-6' : ''}>
              {skipped && (
                <div className="mb-4 flex items-center gap-3 text-[13px] text-dream-faint">
                  <span className="h-px flex-1 border-t border-dashed border-dream-line dark:border-white/15" />
                  {year + 1 === prev[0] - 1
                    ? `${year + 1} 年沒有場次`
                    : `${year + 1}–${prev[0] - 1} 沒有場次`}
                  <span className="h-px flex-1 border-t border-dashed border-dream-line dark:border-white/15" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-2.5">
                <span className="font-display font-bold text-[15px]" style={{ color: meta.color }}>{year}</span>
                <span className="text-[13px] text-dream-faint">{arr.length} 場</span>
                <span className="h-px flex-1 bg-dream-line dark:bg-white/10" />
              </div>
              <ul className="space-y-2.5">
                {arr.map(e => <EventRow key={e.id} e={e} attended={attended} onSelect={onSelect} onToggleAttended={onToggleAttended} />)}
              </ul>
            </div>
          )
        })}
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 rounded bg-dream-ink text-white text-[13px] font-medium px-4 py-2">
          <Icon n="circle-check" className="text-bloom-pink" />{toast}
        </div>
      )}
    </div>
  )
}

// 一列場次
function EventRow({ e, attended, onSelect, onToggleAttended }) {
  const m = primaryMeta(e)
  const cover = coverSrc(e)
  const status = eventStatus(e)
  const att = attended?.has(e.id)
  return (
    <li>
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
          <div className="flex items-center gap-2 text-[13px] text-dream-sub">
            <span className="font-round font-bold" style={{ color: m.color }}>#{String(e.number ?? 0).padStart(3, '0')}</span>
            <span>{e.year}.{formatMonthDay(e.startDate).replace(/^\d{4}\./, '')}</span>
            {status === 'past' && <span className="text-dream-faint">已結束</span>}
            {(status === 'upcoming' || status === 'ongoing') && <span className="text-bloom-indigo font-bold">即將</span>}
          </div>
          <div className="font-display font-bold text-[15px] text-dream-ink line-clamp-1 mt-0.5 group-hover:text-bloom-indigo transition-colors">{e.title}</div>
          {e.type && <div className="text-[13px] text-dream-faint mt-0.5 truncate">{e.type}</div>}
        </div>
        <span
          role="button" tabIndex={0}
          onClick={(ev) => { ev.stopPropagation(); onToggleAttended?.(e.id) }}
          onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.stopPropagation(); onToggleAttended?.(e.id) } }}
          aria-label={att ? '取消已去過' : '標記我去過'}
          className={`grid place-items-center w-7 h-7 rounded-full shrink-0 transition-colors ${
            att
              ? 'bg-bloom-indigo text-white shadow-sm'
              : 'border border-dream-line text-dream-faint hover:text-bloom-indigo hover:border-bloom-sky'}`}>
          <Icon n="circle-check" className="text-[11px]" />
        </span>
      </button>
    </li>
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
