import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSummary, copyText, formatDateRangeCompact } from '../utils/share.js'
import { primaryMeta, bandMeta, parseGroup, isPersonal, rootGroup } from '../utils/bands.js'
import { photoUrl, coverOf, photoCredit, PHOTO_CREDIT_KEYS } from '../utils/media.js'
import { eventStatus, daysUntil, weekday, STATUS_LABEL } from '../utils/datetime.js'
import { eventContext, typeTags } from '../utils/context.js'
import { downloadIcs } from '../utils/ics.js'
import { downloadShareImage } from '../utils/shareImage.js'
import { REPORT_URL } from '../config.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'
import CollectionStrip from './CollectionStrip.jsx'

// 詳情浮層 = 一張「後台通行證」：舞台頭圖、撕票線、左邊存根放事實、右邊放這場在收藏史裡的位置
export default function EventDetail({ event, allEvents = [], attended, onToggleAttended, onClose, prevId, nextId, onNavigate, milestones = [] }) {
  const [toast, setToast] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const [coverOk, setCoverOk] = useState(true)
  const panelRef = useRef(null)
  const meta = primaryMeta(event)
  const personal = isPersonal(event)
  const isAttended = attended?.has(event.id)
  const ctx = useMemo(() => eventContext(event, allEvents), [event, allEvents])

  useEffect(() => { setLightbox(null); setCoverOk(true) }, [event.id])

  // 鎖背景捲動 + 進場聚焦面板；關閉時把焦點還給開啟詳情的元素（只在開關時跑一次）
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const prevFocus = document.activeElement
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = ''
      if (prevFocus instanceof HTMLElement) prevFocus.focus()
    }
  }, [])

  // 換場次時把浮層捲回頂端，不然會停在上一場的捲動位置
  useEffect(() => { panelRef.current?.scrollTo({ top: 0 }) }, [event.id])

  // 鍵盤操作：Esc 關閉 / ← → 切換 / Tab 焦點陷阱（依當前 lightbox、鄰場重新綁定）
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { if (lightbox) setLightbox(null); else onClose(); return }
      if (lightbox) return
      if (e.key === 'ArrowLeft' && prevId) onNavigate(prevId)
      else if (e.key === 'ArrowRight' && nextId) onNavigate(nextId)
      else if (e.key === 'Tab') trapFocus(e, panelRef.current)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, prevId, nextId, lightbox])

  // #19 JSON-LD（Event schema）
  useEffect(() => {
    const tag = document.createElement('script')
    tag.type = 'application/ld+json'
    tag.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Event',
      name: event.title,
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(event.startDate) ? event.startDate : undefined,
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(event.endDate) ? event.endDate : undefined,
      location: event.venue ? { '@type': 'Place', name: event.venue } : undefined,
      performer: (event.people || []).map(p => ({ '@type': 'Person', name: p })),
    })
    document.head.appendChild(tag)
    return () => { document.head.removeChild(tag) }
  }, [event])

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1800) }
  const copySummary = async () => flash((await copyText(buildSummary(event))) ? '已複製摘要' : '複製失敗')
  const copyLink = async () => flash((await copyText(`${location.origin}${location.pathname}#/event/${event.id}`)) ? '已複製連結' : '複製失敗')

  const dex = `#${String(event.number ?? 0).padStart(3, '0')}`
  const groups = event.relatedGroups || []
  const people = event.people || []
  const photos = event.photos || []
  const cover = coverOk ? coverOf(event) : null
  // 封面已做成上方 banner，照片牆就別重複它
  const galleryPhotos = cover ? photos.filter(p => photoUrl(p) !== cover) : photos
  const roles = groups.flatMap(g => parseGroup(g).parts)
  const status = eventStatus(event)
  const dleft = status === 'upcoming' ? daysUntil(event.startDate) : null
  const tags = typeTags(event)
  // 照片出處另外拉出來擺在圖片旁邊，不要混在存根的雜項欄裡
  const credit = photoCredit(event)
  const extras = Object.entries(event.extras || {}).filter(([k]) => !PHOTO_CREDIT_KEYS.includes(k))

  // 詳情是 hub 不是死路：同樂團 / 同聲優 / 同場館，看完自然滑進下一場
  const band = rootGroup(groups[0] || '')
  const related = allEvents.filter(o =>
    o.id !== event.id && (o.relatedGroups || []).some(g => rootGroup(g) === band)
  ).slice(0, 5)
  const relatedIds = new Set(related.map(o => o.id))
  const samePeople = allEvents.filter(o =>
    o.id !== event.id && !relatedIds.has(o.id) && (o.people || []).some(p => people.includes(p))
  ).slice(0, 5)
  const sameVenue = event.venue
    ? allEvents.filter(o => o.id !== event.id && o.venue === event.venue).slice(0, 5)
    : []

  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef} tabIndex={-1}
        className="ticket-paper modal-ticket relative w-full sm:max-w-3xl lg:max-w-5xl max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-dream-line shadow-glassHover scrollbar-thin dark:border-white/15 focus:outline-none"
        style={{ '--band': meta.glow }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={event.title}
      >
        {/* ---------- 舞台頭圖（有封面用照片、沒封面用樂團色舞台，同一套版型） ---------- */}
        <div className="relative overflow-hidden">
          {cover ? (
            <button onClick={() => setLightbox(cover)} aria-label="放大封面" className="block w-full text-left group/cover">
              <Img src={cover} onError={() => setCoverOk(false)}
                className="w-full h-60 sm:h-80 object-cover group-hover/cover:scale-[1.03] motion-reduce:transform-none" />
            </button>
          ) : (
            <div aria-hidden className="w-full h-44 sm:h-56 relative"
              style={{ background: `linear-gradient(155deg, ${meta.color}, rgba(${meta.glow},0.72))` }}>
              <Icon n={personal ? 'user' : meta.icon}
                className="absolute left-6 bottom-16 text-[88px] text-white/15" />
            </div>
          )}

          {/* 漸層：頂部壓深給控制列、底部融進卡身並襯白字 */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 26%)' }} />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(to top, rgba(0,0,0,0.62), rgba(${meta.glow},0.10) 46%, transparent 64%)` }} />

          {/* 巨型描邊編號水印 */}
          <div aria-hidden
            className="absolute right-4 top-12 font-display font-extrabold leading-none pointer-events-none select-none text-[64px] sm:text-[92px]"
            style={{ WebkitTextStroke: '2px rgba(255,255,255,0.30)', color: 'transparent' }}>
            {dex}
          </div>

          {/* 控制列（永遠浮在頭圖上） */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 sm:px-4 py-3 pointer-events-none">
            <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 text-[12.5px] font-bold text-white backdrop-blur-sm"
              style={{ background: personal ? 'rgba(139,92,246,0.85)' : `rgba(${meta.glow},0.85)` }}>
              <span className="grid place-items-center w-5 h-5 rounded-full bg-white/30 text-[11px]"><Icon n={personal ? 'user' : meta.icon} /></span>
              {personal ? '個人來台' : meta.name}
            </span>
            <div className="pointer-events-auto flex items-center gap-1.5">
              <OverBtn active={isAttended} onClick={() => onToggleAttended?.(event.id)} aria-label={isAttended ? '取消已去過' : '標記我去過'}>
                <Icon n="circle-check" className="text-[13px]" />
              </OverBtn>
              <OverBtn disabled={!prevId} onClick={() => prevId && onNavigate(prevId)} aria-label="上一張"><Icon n="chevron-left" className="text-[13px]" /></OverBtn>
              <OverBtn disabled={!nextId} onClick={() => nextId && onNavigate(nextId)} aria-label="下一張"><Icon n="chevron-right" className="text-[13px]" /></OverBtn>
              <OverBtn onClick={onClose} aria-label="關閉" className="ml-0.5"><Icon n="xmark" /></OverBtn>
            </div>
          </div>

          {/* 蓋章：去過的場次才有 */}
          {isAttended && (
            <div aria-hidden className="absolute right-5 sm:right-8 bottom-16 sm:bottom-20 z-10 pointer-events-none -rotate-[11deg]">
              <div className="stamp grid place-items-center w-24 h-24 sm:w-28 sm:h-28 rounded-full text-white">
                <span className="font-hand font-bold text-[19px] sm:text-[22px] leading-none">我去過</span>
                <span className="mt-1 text-[7.5px] sm:text-[8px] font-bold tracking-[0.28em] uppercase">Attended</span>
              </div>
            </div>
          )}

          {/* 撕紙齒邊：紙從照片上撕下來 */}
          <div aria-hidden className="tear-teeth absolute inset-x-0 bottom-0 h-2 z-10" />

          {/* 標題疊底部 */}
          <div className="absolute inset-x-0 bottom-0 px-5 sm:px-8 pb-4 sm:pb-5 pointer-events-none">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-bold text-white"
                style={{ background: status === 'past' ? 'rgba(0,0,0,0.5)' : meta.color }}>{STATUS_LABEL[status]}</span>
              <span className="text-[12.5px] font-semibold text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
                {formatDateRangeCompact(event.startDate, event.endDate) || ''}{weekday(event.startDate) && ` ・ ${weekday(event.startDate)}`}
              </span>
              {dleft != null && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: 'rgba(139,92,246,0.92)' }}>
                  {dleft === 0 ? '就是今天' : `還有 ${dleft} 天`}
                </span>
              )}
            </div>
            <h2 className="font-display font-bold text-[22px] sm:text-[30px] leading-snug text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] line-clamp-3">
              {event.title || '未命名活動'}
            </h2>
          </div>
        </div>

        {/* ---------- 撕票線：ADMIT ONE 微型字 + 條碼，下面一排打孔 ---------- */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-8 pt-3 pb-2 text-dream-faint">
          <span className="text-[9.5px] font-bold tracking-[0.3em] uppercase truncate">
            Admit One · Taiwan BanG Dream! Collection
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <span aria-hidden className="h-5 w-16 opacity-40"
              style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 5px)' }} />
            <span className="font-round font-bold text-[11px]" style={{ color: meta.color }}>{dex}</span>
          </span>
        </div>
        <div className="relative h-3.5">
          <div aria-hidden className="perf-h absolute inset-0" />
          <Punch className="-left-2" />
          <Punch className="-right-2" />
        </div>

        {/* ---------- 存根（左）＋ 脈絡（右）：手機疊成單欄，脈絡先出 ---------- */}
        <div className="flex flex-col lg:grid lg:grid-cols-[286px_14px_minmax(0,1fr)] lg:items-stretch">

          <aside className="order-2 lg:order-none w-full px-5 sm:px-8 lg:pl-6 lg:pr-0 py-5 lg:py-6 lg:self-start lg:sticky lg:top-0">
            <div className="rounded-2xl border border-dream-line dark:border-white/10 overflow-hidden divide-y divide-dashed divide-dream-line dark:divide-white/10"
              style={{ background: `rgba(${meta.glow},0.05)` }}>

              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-dream-faint">Stub · 存根</span>
                <span className="font-round font-bold text-[11px]" style={{ color: meta.color }}>{dex}</span>
              </div>

              <StubRow icon="calendar" label="日期" color={meta.color} glow={meta.glow}>
                <div className="font-display font-bold text-[16px] text-dream-ink leading-tight">
                  {formatDateRangeCompact(event.startDate, event.endDate) || '—'}
                </div>
                <div className="text-[12px] text-dream-faint mt-0.5">
                  {[weekday(event.startDate), ctx.ago].filter(Boolean).join(' · ')}
                </div>
              </StubRow>

              {event.venue && (
                <StubRow icon="location-dot" label="地點" color={meta.color} glow={meta.glow}>
                  <a href={`https://www.google.com/maps/search/${encodeURIComponent(event.venue)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="font-display font-bold text-[15px] text-dream-ink leading-tight hover:text-bloom-violet transition-colors inline-flex items-start gap-1.5">
                    {event.venue}<Icon n="link" className="text-[9px] mt-1.5 shrink-0 opacity-60" />
                  </a>
                  {ctx.venueTotal > 1 && (
                    <div className="text-[12px] text-dream-faint mt-0.5">這裡的第 {ctx.venueNth} 場 · 共 {ctx.venueTotal} 場</div>
                  )}
                </StubRow>
              )}

              {event.attendanceCount > 0 && (
                <StubRow icon="users" label="人次" color={meta.color} glow={meta.glow}>
                  <span className="font-display font-bold text-[18px] text-dream-ink leading-none">
                    {event.attendanceCount}<span className="text-[12px] font-normal text-dream-faint ml-1">人</span>
                  </span>
                </StubRow>
              )}

              <StubRow icon="tag" label="性質" color={meta.color} glow={meta.glow}>
                <div className="flex flex-wrap gap-1.5">
                  {event.category && <span className={`badge ${event.category === '本體' ? 'badge-core' : 'badge-side'}`}>{event.category === '擦邊' ? '個人' : '本體'}</span>}
                  {event.isFullBand && <span className="badge badge-full"><Icon n="star" className="text-[9px]" /> 全團</span>}
                  {tags.map(t => (
                    <span key={t} className="badge" style={{ background: `rgba(${meta.glow},0.14)`, color: meta.color }}>{t}</span>
                  ))}
                </div>
              </StubRow>

              {event.organizer && (
                <StubRow icon="user-group" label="主辦" color={meta.color} glow={meta.glow}>
                  <div className="text-[14px] text-dream-ink">{event.organizer}</div>
                  {ctx.organizerTotal > 1 && (
                    <div className="text-[12px] text-dream-faint mt-0.5">辦過的第 {ctx.organizerNth} 場</div>
                  )}
                </StubRow>
              )}

              {event.ticketUrl && (
                <StubRow icon="link" label="購票" color={meta.color} glow={meta.glow}>
                  <a className="text-bloom-violet hover:underline break-all text-[13px]" target="_blank" rel="noopener noreferrer" href={event.ticketUrl}>
                    {event.ticketUrl}
                  </a>
                </StubRow>
              )}

              {extras.map(([name, value]) => (
                <StubRow key={name} icon="tag" label={name} color={meta.color} glow={meta.glow}>
                  {/^https?:\/\//i.test(value)
                    ? <a className="text-bloom-violet hover:underline break-all text-[13px]" target="_blank" rel="noopener noreferrer" href={value}>{value}</a>
                    : <span className="text-[13.5px] text-dream-sub whitespace-pre-line">{value}</span>}
                </StubRow>
              ))}

              {event.sources?.length > 0 && (
                <StubRow icon="link" label="來源" color={meta.color} glow={meta.glow}>
                  <div className="flex flex-col gap-1.5">
                    {event.sources.map((src, i) => {
                      let host = src
                      try { host = new URL(src).hostname.replace(/^www\./, '') } catch {}
                      return (
                        <a key={i} href={src} target="_blank" rel="noopener noreferrer"
                          className="text-[13px] text-dream-sub hover:text-bloom-violet transition-colors truncate">{host}</a>
                      )
                    })}
                  </div>
                </StubRow>
              )}
            </div>
          </aside>

          <div aria-hidden className="hidden lg:block perf-v" />

          <div className="order-1 lg:order-none min-w-0 px-5 sm:px-8 lg:pl-6 lg:pr-7 pt-5 lg:pt-6 pb-2">

            {personal && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl px-4 py-3 text-[13px] text-dream-sub"
                style={{ background: `rgba(${meta.glow},0.10)`, border: `1px solid rgba(${meta.glow},0.22)` }}>
                <Icon n="user" className="mt-0.5" style={{ color: meta.color }} />
                <span>聲優以<span className="font-semibold text-dream-ink">個人身分</span>來台；與
                  <a href={`#/band/${encodeURIComponent(meta.name)}`} className="font-semibold underline" style={{ color: meta.color }}> {meta.name}</a>
                  {roles.length > 0 && <>（{roles.join('・')}）</>} 關聯，非邦邦官方場次。</span>
              </div>
            )}

            {/* 脈絡：這場在收藏史裡是什麼位置 */}
            <div className="rounded-2xl px-4 py-4 sm:px-5"
              style={{ background: `rgba(${meta.glow},0.08)`, border: `1px solid rgba(${meta.glow},0.2)` }}>
              <div className="eyebrow mb-3.5" style={{ color: meta.color }}>脈絡</div>

              {milestones.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {milestones.map(m => (
                    <span key={m.key}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-bold text-white"
                      style={{ background: meta.color }}>
                      <Icon n="star" className="text-[9px]" />{m.label}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
                {ctx.band && ctx.bandNth && (
                  <Stat value={`第 ${ctx.bandNth} 次`}
                    label={`${ctx.band} ${personal ? '相關場次' : '來台'} · 共 ${ctx.bandTotal} 場`} meta={meta} />
                )}
                {ctx.daysSinceLastBand != null && (
                  <Stat value={`${ctx.daysSinceLastBand} 天`}
                    label={personal ? '距上次同團場次' : '距上次同團來台'} meta={meta} />
                )}
                <Stat value={`第 ${ctx.yearNth} 場`} label={`${event.year} 年 · 全年 ${ctx.yearTotal} 場`} meta={meta} />
              </div>

              {ctx.prevBandEvent && (
                <button onClick={() => onNavigate(ctx.prevBandEvent.id)}
                  className="mt-3.5 w-full text-left text-[12.5px] text-dream-sub hover:text-dream-ink transition-colors">
                  上一次是 <span className="font-round font-bold" style={{ color: meta.color }}>#{String(ctx.prevBandEvent.number).padStart(3, '0')}</span>
                  <span className="ml-1.5">{ctx.prevBandEvent.title}</span>
                </button>
              )}

              {ctx.sameDay.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed" style={{ borderColor: `rgba(${meta.glow},0.28)` }}>
                  <div className="text-[12px] font-semibold text-dream-faint mb-1.5">同一天還有 {ctx.sameDay.length} 場</div>
                  <RelatedList items={ctx.sameDay} color={meta.color} onNavigate={onNavigate} />
                </div>
              )}
            </div>

            {/* 陣容：聲優帶累積次數，首次來台掛 NEW */}
            <Section title="陣容" color={meta.color}>
              {ctx.people.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {ctx.people.map(p => (
                    <a key={p.name} href={`#/person/${encodeURIComponent(p.name)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-dream-line dark:border-white/10 bg-white/70 dark:bg-white/[.06] pl-3 pr-1.5 py-1 text-[13.5px] text-dream-ink hover:border-bloom-violet transition-colors">
                      {p.name}
                      {p.isFirst ? (
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: meta.color }}>首次</span>
                      ) : (
                        <span className="rounded-full px-1.5 py-0.5 text-[10.5px] font-bold"
                          style={{ background: `rgba(${meta.glow},0.16)`, color: meta.color }}>第 {p.nth} 次</span>
                      )}
                    </a>
                  ))}
                </div>
              ) : <p className="text-[13px] text-dream-faint">尚無聲優資料</p>}

              {groups.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {groups.map(g => {
                    const m = bandMeta(g)
                    return (
                      <a key={g} href={`#/band/${encodeURIComponent(rootGroup(g))}`}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium hover:opacity-80 transition-opacity"
                        style={{ background: `rgba(${m.glow},0.14)`, color: m.color, border: `1px solid rgba(${m.glow},0.3)` }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />{g}
                      </a>
                    )
                  })}
                </div>
              )}
            </Section>

            {/* 收藏軌：53 場排成一條，這場亮起來，點任何一格直接跳過去 */}
            <Section title="收藏軌" color={meta.color}>
              <CollectionStrip chrono={ctx.chrono} isOn={(o) => o.id === event.id} onNavigate={onNavigate} />
              <div className="mt-2.5 flex items-center justify-between text-[12px] text-dream-faint">
                <span>全站第 <span className="font-round font-bold" style={{ color: meta.color }}>{ctx.index + 1}</span> 場 · 共 {ctx.total} 場</span>
                <span className="hidden sm:inline font-hand text-[13px]">點任一格跳過去</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <NeighborBtn side="prev" item={ctx.prevChrono} color={meta.color} onNavigate={onNavigate} />
                <NeighborBtn side="next" item={ctx.nextChrono} color={meta.color} onNavigate={onNavigate} />
              </div>
            </Section>

            {event.description && <Section title="活動簡介" color={meta.color}><p className="text-[14px] leading-7 text-dream-sub whitespace-pre-line">{event.description}</p></Section>}
            {event.impression && <Section title="個人心得" color={meta.color}><p className="text-[14px] leading-7 text-dream-sub whitespace-pre-line">{event.impression}</p></Section>}
            {event.notes && <Section title="備註" color={meta.color}><p className="text-[14px] leading-7 text-dream-sub whitespace-pre-line">{event.notes}</p></Section>}

            {galleryPhotos.length > 0 && (
              <Section title="活動照片" color={meta.color}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
                  {galleryPhotos.map((p, i) => {
                    const url = photoUrl(p)
                    return (
                      <button key={i} onClick={() => setLightbox(url)} aria-label={`放大照片 ${i + 1}`}
                        className="polaroid block"
                        style={{ transform: `rotate(${(i % 3) - 1}deg)` }}>
                        <span className="block aspect-[4/3] overflow-hidden bg-dream-line">
                          <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                        </span>
                      </button>
                    )
                  })}
                </div>
                {credit && <PhotoCredit credit={credit} color={meta.color} />}
              </Section>
            )}

            {/* 只有封面、沒有照片牆時，出處也要有地方可以標 */}
            {credit && galleryPhotos.length === 0 && cover && (
              <Section title="圖片出處" color={meta.color}>
                <PhotoCredit credit={credit} color={meta.color} />
              </Section>
            )}

            {related.length > 0 && (
              <Section title={`${meta.name} 的其他場次`} color={meta.color}>
                <RelatedList items={related} color={meta.color} onNavigate={onNavigate} />
              </Section>
            )}
            {samePeople.length > 0 && (
              <Section title="同聲優的其他場次" color={meta.color}>
                <RelatedList items={samePeople} color={meta.color} onNavigate={onNavigate} />
              </Section>
            )}
            {sameVenue.length > 0 && (
              <Section title={`也在 ${event.venue}`} color={meta.color}>
                <RelatedList items={sameVenue} color={meta.color} onNavigate={onNavigate} />
              </Section>
            )}

            {/* 缺照片/心得就給一條低調的補資料出口（config 沒設 REPORT_URL 就不出現） */}
            {REPORT_URL && !event.impression && galleryPhotos.length === 0 && (
              <a href={REPORT_URL} target="_blank" rel="noopener noreferrer"
                className="mt-6 flex items-center gap-2.5 rounded-xl border border-dashed border-dream-line dark:border-white/15 px-4 py-3 text-[13px] text-dream-faint hover:text-dream-ink hover:border-bloom-violet transition-colors">
                <Icon n="heart" style={{ color: meta.color }} />
                這場還缺照片和心得，你有的話幫忙補一筆
              </a>
            )}
          </div>
        </div>

        {/* 常駐操作列：黏在浮層底部，捲到哪都能分享 */}
        <div className="sticky bottom-0 z-10 px-5 sm:px-8 py-3 flex flex-wrap gap-2.5 items-center border-t border-dream-line dark:border-white/10"
          style={{ background: 'var(--modal-bg)' }}>
          {/* 手機只留圖示，四顆按鈕才不會擠成兩行吃掉半個畫面 */}
          <button className="btn-primary !h-10 !px-4 sm:!px-6" onClick={copyLink}>
            <Icon n="link" /> 複製連結
          </button>
          <button className="pill !px-3 sm:!px-4 !py-2 !text-[13.5px]" aria-label="加入行事曆" title="加入行事曆"
            onClick={() => flash(downloadIcs(event, `${event.id}.ics`) ? '已下載行事曆檔' : '這場沒有確定日期')}>
            <Icon n="calendar" /> <span className="hidden sm:inline">加行事曆</span>
          </button>
          <button className="pill !px-3 sm:!px-4 !py-2 !text-[13.5px]" aria-label="複製摘要" title="複製摘要" onClick={copySummary}>
            <Icon n="clipboard" /> <span className="hidden sm:inline">摘要</span>
          </button>
          <button className="pill !px-3 sm:!px-4 !py-2 !text-[13.5px]" aria-label="存成圖" title="存成圖"
            onClick={() => downloadShareImage(event, meta, personal, {
              attended: isAttended,
              bandNth: ctx.bandNth, bandTotal: ctx.bandTotal,
              index: ctx.index, total: ctx.total,
            })}><Icon n="star" /> <span className="hidden sm:inline">存成圖</span></button>
          <span className="ml-auto self-center text-[11px] text-dream-faint hidden sm:inline">← → 切換 · Esc 關閉</span>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 rounded-full bg-dream-ink text-white text-[13px] font-medium px-4 py-2">
          <Icon n="circle-check" className="text-bloom-pink" />{toast}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85"
          role="dialog" aria-modal="true" aria-label={`${event.title || '活動'} 放大照片`}
          onClick={(e) => { e.stopPropagation(); setLightbox(null) }}>
          <img src={lightbox} alt={event.title || ''} className="max-w-full max-h-full rounded-lg object-contain" />
          <button onClick={(e) => { e.stopPropagation(); setLightbox(null) }} aria-label="關閉照片"
            className="absolute top-5 right-5 grid place-items-center w-10 h-10 rounded-full bg-white/15 text-white hover:bg-white/30"><Icon n="xmark" /></button>
        </div>
      )}
    </div>
  )
}

function trapFocus(e, container) {
  if (!container) return
  const els = container.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])')
  if (!els.length) return
  const first = els[0], last = els[els.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

// 照片出處：網址就做成可點的連結，回得去原始出處
function PhotoCredit({ credit, color }) {
  return (
    <div className="mt-3 flex items-start gap-2 text-[12px] text-dream-faint">
      <Icon n="images" className="text-[10px] mt-1 shrink-0" style={{ color }} />
      <span className="min-w-0">
        <span className="font-semibold">{credit.label}：</span>
        {credit.isUrl
          ? <a href={credit.value} target="_blank" rel="noopener noreferrer"
              className="text-bloom-violet hover:underline break-all">{credit.value}</a>
          : <span className="break-words">{credit.value}</span>}
      </span>
    </div>
  )
}

// 撕票線兩端的打孔：一半被浮層邊界切掉，看起來就是咬掉一口
function Punch({ className = '' }) {
  return (
    <span aria-hidden
      className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-dream-line dark:border-white/15 ${className}`}
      style={{ background: 'rgb(var(--c-bg))' }} />
  )
}

// 浮在頭圖上的控制鈕：半透明深底 + 毛玻璃，白圖示
function OverBtn({ children, active, disabled, className = '', ...rest }) {
  return (
    <button disabled={disabled} {...rest}
      className={`grid place-items-center w-8 h-8 rounded-full backdrop-blur-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? 'bg-bloom-indigo text-white shadow-[0_0_12px_-2px_rgba(217,70,239,0.7)]' : 'bg-black/35 text-white hover:bg-black/55'} ${className}`}>
      {children}
    </button>
  )
}

// 存根的一列：左側樂團色圖示方塊 + 小標，下面放值
function StubRow({ icon, label, color, glow, children }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="grid place-items-center w-8 h-8 shrink-0 rounded-lg text-[13px]"
        style={{ background: `rgba(${glow},0.16)`, color }}><Icon n={icon} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-dream-faint mb-1">{label}</div>
        <div className="text-[14px] text-dream-ink">{children}</div>
      </div>
    </div>
  )
}

// 脈絡卡裡的一個數字：大字、團色漸層墨水、底下一條細髮線
function Stat({ value, label, meta }) {
  return (
    <div className="min-w-0">
      <div className="font-display font-extrabold text-[26px] sm:text-[29px] leading-none tracking-tight"
        style={{
          backgroundImage: `linear-gradient(135deg, ${meta.color} 15%, rgba(${meta.glow},0.55) 100%)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
        {value}
      </div>
      <div className="mt-2 pt-2 border-t text-[11.5px] leading-snug text-dream-sub"
        style={{ borderColor: `rgba(${meta.glow},0.28)` }}>{label}</div>
    </div>
  )
}

// 時間軸上的前一場 / 下一場
function NeighborBtn({ side, item, color, onNavigate }) {
  if (!item) return <div />
  const next = side === 'next'
  return (
    <button onClick={() => onNavigate(item.id)}
      className={`min-w-0 rounded-xl border border-dream-line dark:border-white/10 px-3 py-2.5 hover:border-bloom-violet transition-colors ${next ? 'text-right' : 'text-left'}`}>
      <div className={`flex items-center gap-1.5 text-[11px] text-dream-faint mb-1 ${next ? 'justify-end' : ''}`}>
        {!next && <Icon n="chevron-left" className="text-[9px]" />}
        {next ? '下一場' : '前一場'}
        {next && <Icon n="chevron-right" className="text-[9px]" />}
      </div>
      <div className="truncate text-[13px] text-dream-ink">
        <span className="font-round font-bold mr-1.5" style={{ color }}>#{String(item.number ?? 0).padStart(3, '0')}</span>
        {item.title}
      </div>
    </button>
  )
}

// 推薦清單：hub 的一節（同樂團 / 同聲優 / 同場館共用）
function RelatedList({ items, color, onNavigate }) {
  return (
    <ul className="space-y-1.5">
      {items.map(o => (
        <li key={o.id}>
          <button onClick={() => onNavigate(o.id)} className="w-full text-left flex items-center gap-2 text-[13px] text-dream-sub hover:text-dream-ink py-1">
            <span className="font-round font-bold shrink-0" style={{ color }}>#{String(o.number).padStart(3, '0')}</span>
            <span className="text-dream-faint shrink-0">{o.year}</span>
            <span className="truncate">{o.title}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Section({ title, color, children }) {
  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 font-display font-bold text-[15px] text-dream-ink mb-2">
        <span className="w-1.5 h-4 rounded" style={{ background: color }} />{title}
      </h3>
      {children}
    </section>
  )
}
