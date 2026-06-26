import { useEffect, useRef, useState } from 'react'
import { buildSummary, copyText, formatDateRange } from '../utils/share.js'
import { primaryMeta, bandMeta, parseGroup, isPersonal, rootGroup } from '../utils/bands.js'
import { photoUrl, coverOf } from '../utils/media.js'
import { eventStatus, daysUntil, weekday, STATUS_LABEL } from '../utils/datetime.js'
import { downloadShareImage } from '../utils/shareImage.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'

export default function EventDetail({ event, allEvents = [], attended, onToggleAttended, onClose, prevId, nextId, onNavigate }) {
  const [toast, setToast] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const [coverOk, setCoverOk] = useState(true)
  const panelRef = useRef(null)
  const meta = primaryMeta(event)
  const personal = isPersonal(event)
  const isAttended = attended?.has(event.id)

  useEffect(() => { setLightbox(null); setCoverOk(true) }, [event.id])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { if (lightbox) setLightbox(null); else onClose(); return }
      if (lightbox) return
      if (e.key === 'ArrowLeft' && prevId) onNavigate(prevId)
      else if (e.key === 'ArrowRight' && nextId) onNavigate(nextId)
      else if (e.key === 'Tab') trapFocus(e, panelRef.current)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
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

  // #15 推薦：同樂團其他場
  const band = rootGroup(groups[0] || '')
  const related = allEvents.filter(o =>
    o.id !== event.id && (o.relatedGroups || []).some(g => rootGroup(g) === band)
  ).slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-dream-ink/50" onClick={onClose}>
      <div
        ref={panelRef} tabIndex={-1}
        className="relative w-full sm:max-w-2xl max-h-[94vh] overflow-y-auto rounded-t-xl sm:rounded-xl border border-dream-line shadow-glassHover scrollbar-thin dark:border-white/15 focus:outline-none"
        style={{ background: 'var(--modal-bg)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={event.title}
      >
        <div className="sticky top-0 z-10">
          <div className="h-1.5 w-full" style={{ background: meta.color }} />
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white/95 dark:bg-black/40 border-b border-dream-line dark:border-white/10">
            <span className="inline-flex items-center gap-2 rounded pl-1.5 pr-3 py-1 text-[13px] font-bold text-white"
              style={{ background: personal ? '#6366f1' : meta.color }}>
              <span className="grid place-items-center w-6 h-6 rounded bg-white/25 text-[12px]"><Icon n={personal ? 'user' : meta.icon} /></span>
              {personal ? '個人來台' : meta.name}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onToggleAttended?.(event.id)} aria-label="標記我去過"
                className={`grid place-items-center w-8 h-8 rounded ${isAttended ? 'bg-bloom-indigo text-white' : 'border border-dream-line text-dream-faint hover:text-dream-ink'}`}>
                <Icon n="circle-check" className="text-[13px]" />
              </button>
              <NavBtn dir="left" disabled={!prevId} onClick={() => prevId && onNavigate(prevId)} />
              <span className="font-round font-bold text-[14px] px-1" style={{ color: meta.color }}>{dex}</span>
              <NavBtn dir="right" disabled={!nextId} onClick={() => nextId && onNavigate(nextId)} />
              <button onClick={onClose} aria-label="關閉"
                className="grid place-items-center w-9 h-9 rounded bg-white/70 dark:bg-white/10 text-dream-sub hover:text-dream-ink transition-colors ml-1">
                <Icon n="xmark" />
              </button>
            </div>
          </div>
        </div>

        {cover && (
          <button
            onClick={() => setLightbox(cover)}
            aria-label="放大封面"
            className="block w-full relative overflow-hidden group/cover"
          >
            <Img src={cover} onError={() => setCoverOk(false)}
                 className="w-full h-44 sm:h-60 object-cover group-hover/cover:scale-105 motion-reduce:transform-none" />
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: 'linear-gradient(to top, var(--modal-bg) 2%, transparent 55%)' }} />
          </button>
        )}

        <div className={`px-5 sm:px-8 pb-6 sm:pb-7 ${cover ? 'pt-3 sm:pt-4 -mt-6 relative' : 'pt-6 sm:pt-7'}`}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`badge ${status === 'past' ? 'badge-side' : 'badge-core'}`}>{STATUS_LABEL[status]}</span>
            {dleft != null && <span className="text-[12px] font-bold text-bloom-indigo">{dleft === 0 ? '就是今天' : `還有 ${dleft} 天`}</span>}
          </div>

          <h2 className="font-display font-bold text-[24px] sm:text-[28px] leading-snug text-dream-ink">{event.title || '未命名活動'}</h2>

          {personal && (
            <div className="mt-4 flex items-start gap-2.5 rounded-md px-4 py-3 text-[13px] text-dream-sub"
              style={{ background: `rgba(${meta.glow},0.10)`, border: `1px solid rgba(${meta.glow},0.22)` }}>
              <Icon n="user" className="mt-0.5" style={{ color: meta.color }} />
              <span>聲優以<span className="font-semibold text-dream-ink">個人身分</span>來台；與
                <a href={`#/band/${encodeURIComponent(meta.name)}`} className="font-semibold underline" style={{ color: meta.color }}> {meta.name}</a>
                {roles.length > 0 && <>（{roles.join('・')}）</>} 關聯，非邦邦官方場次。</span>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {event.category && <span className={`badge ${event.category === '本體' ? 'badge-core' : 'badge-side'}`}>{event.category === '擦邊' ? '個人' : '本體'}</span>}
            {event.isFullBand && <span className="badge badge-full"><Icon n="star" className="text-[9px]" /> 全團</span>}
            {event.type && <span className="badge badge-side">{event.type}</span>}
          </div>

          <dl className="mt-7 space-y-5">
            <Row term="日期" icon="calendar">
              {formatDateRange(event.startDate, event.endDate) || '—'}{weekday(event.startDate) && ` ・ ${weekday(event.startDate)}`}
            </Row>
            <Row term="聲優" icon="microphone">
              {people.length ? <span className="flex flex-wrap gap-1.5">
                {people.map(p => (
                  <a key={p} href={`#/person/${encodeURIComponent(p)}`}
                    className="rounded bg-white/70 dark:bg-white/10 border border-dream-line px-2.5 py-0.5 text-[13px] hover:border-bloom-indigo">{p}</a>
                ))}
              </span> : '尚無資料'}
            </Row>
            <Row term="樂團" icon="guitar">
              {groups.length ? <span className="flex flex-wrap gap-1.5">
                {groups.map(g => {
                  const m = bandMeta(g)
                  return (
                    <a key={g} href={`#/band/${encodeURIComponent(rootGroup(g))}`}
                      className="inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-[13px] font-medium hover:opacity-80"
                      style={{ background: `rgba(${m.glow},0.14)`, color: m.color, border: `1px solid rgba(${m.glow},0.3)` }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />{g}
                    </a>
                  )
                })}
              </span> : '尚無資料'}
            </Row>
            {event.attendanceCount > 0 && <Row term="人次" icon="users">{event.attendanceCount} 人</Row>}
            {event.venue && <Row term="地點" icon="location-dot">
              {event.venue}{' '}
              <a className="text-bloom-indigo underline text-[12px]" target="_blank" rel="noopener noreferrer"
                href={`https://www.google.com/maps/search/${encodeURIComponent(event.venue)}`}>地圖</a>
            </Row>}
            {event.organizer && <Row term="主辦" icon="user-group">{event.organizer}</Row>}
            {event.ticketUrl && <Row term="購票" icon="link">
              <a className="text-bloom-indigo underline break-all" target="_blank" rel="noopener noreferrer" href={event.ticketUrl}>{event.ticketUrl}</a>
            </Row>}
            {event.notes && <Row term="備註" icon="note-sticky">{event.notes}</Row>}
          </dl>

          {event.description && <Section title="活動簡介" color={meta.color}><p className="text-[14px] leading-7 text-dream-sub whitespace-pre-line">{event.description}</p></Section>}
          {event.impression && <Section title="個人心得" color={meta.color}><p className="text-[14px] leading-7 text-dream-sub whitespace-pre-line">{event.impression}</p></Section>}

          {galleryPhotos.length > 0 && (
            <Section title="活動照片" color={meta.color}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {galleryPhotos.map((p, i) => {
                  const url = photoUrl(p)
                  return (
                    <button key={i} onClick={() => setLightbox(url)}
                      className="aspect-[4/3] overflow-hidden rounded border border-dream-line" aria-label={`放大照片 ${i + 1}`}>
                      <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  )
                })}
              </div>
            </Section>
          )}

          {event.sources && event.sources.length > 0 && (
            <Section title="來源連結" color={meta.color}>
              <ul className="text-[13.5px] space-y-1">
                {event.sources.map((src, i) => <li key={i}><a className="text-bloom-indigo hover:underline break-all" href={src} target="_blank" rel="noopener noreferrer">{src}</a></li>)}
              </ul>
            </Section>
          )}

          {related.length > 0 && (
            <Section title={`${meta.name} 的其他場次`} color={meta.color}>
              <ul className="space-y-1.5">
                {related.map(o => (
                  <li key={o.id}>
                    <button onClick={() => onNavigate(o.id)} className="w-full text-left flex items-center gap-2 text-[13px] text-dream-sub hover:text-dream-ink py-1">
                      <span className="font-round font-bold shrink-0" style={{ color: meta.color }}>#{String(o.number).padStart(3, '0')}</span>
                      <span className="text-dream-faint shrink-0">{o.year}</span>
                      <span className="truncate">{o.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="mt-8 flex flex-wrap gap-2.5 items-center">
            <button className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[14px] font-bold text-white bg-bloom-indigo hover:bg-bloom-violet transition-colors" onClick={copyLink}>
              <Icon n="link" /> 複製連結
            </button>
            <button className="pill !px-4 !py-2.5 !text-[14px]" onClick={copySummary}><Icon n="clipboard" /> 摘要</button>
            <button className="pill !px-4 !py-2.5 !text-[14px]" onClick={() => downloadShareImage(event, meta, personal)}><Icon n="star" /> 存成圖</button>
            <span className="ml-auto self-center text-[11px] text-dream-faint hidden sm:inline">← → 切換 · Esc 關閉</span>
          </div>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 rounded bg-dream-ink text-white text-[13px] font-medium px-4 py-2">
          <Icon n="circle-check" className="text-bloom-pink" />{toast}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80" onClick={(e) => { e.stopPropagation(); setLightbox(null) }}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded object-contain" />
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

function NavBtn({ dir, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir === 'left' ? '上一張' : '下一張'}
      className="grid place-items-center w-8 h-8 rounded bg-white/70 dark:bg-white/10 text-dream-sub hover:text-dream-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
      <Icon n={dir === 'left' ? 'chevron-left' : 'chevron-right'} className="text-[13px]" />
    </button>
  )
}

function Row({ term, icon, children }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-3 items-start">
      <dt className="flex items-center gap-2 text-[13px] font-semibold text-dream-faint pt-0.5">
        {icon && <Icon n={icon} className="text-bloom-indigo w-4 text-center" />}{term}
      </dt>
      <dd className="text-[14px] text-dream-ink">{children}</dd>
    </div>
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
