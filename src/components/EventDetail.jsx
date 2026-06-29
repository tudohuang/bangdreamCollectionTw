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

  // #15 推薦：同樂團其他場
  const band = rootGroup(groups[0] || '')
  const related = allEvents.filter(o =>
    o.id !== event.id && (o.relatedGroups || []).some(g => rootGroup(g) === band)
  ).slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-dream-ink/50" onClick={onClose}>
      <div
        ref={panelRef} tabIndex={-1}
        className="relative w-full sm:max-w-2xl max-h-[94vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-dream-line shadow-glassHover scrollbar-thin dark:border-white/15 focus:outline-none"
        style={{ background: 'var(--modal-bg)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={event.title}
      >
        {/* 有封面：控制列透明浮在封面上（白圖示），封面滿版到頂更沉浸；
            無封面：實心 sticky 列，並顯示樂團色票與團名 */}
        {cover ? (
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 sm:px-4 py-3
                          bg-gradient-to-b from-black/55 via-black/15 to-transparent pointer-events-none">
            <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 text-[12.5px] font-bold text-white backdrop-blur-sm"
              style={{ background: personal ? 'rgba(99,102,241,0.85)' : `rgba(${meta.glow},0.85)` }}>
              <span className="grid place-items-center w-5 h-5 rounded-full bg-white/30 text-[11px]"><Icon n={personal ? 'user' : meta.icon} /></span>
              {personal ? '個人來台' : meta.name}
            </span>
            <div className="pointer-events-auto flex items-center gap-1.5">
              <OverBtn active={isAttended} onClick={() => onToggleAttended?.(event.id)} aria-label="標記我去過"><Icon n="circle-check" className="text-[13px]" /></OverBtn>
              <OverBtn disabled={!prevId} onClick={() => prevId && onNavigate(prevId)} aria-label="上一張"><Icon n="chevron-left" className="text-[13px]" /></OverBtn>
              <span className="font-round font-bold text-[13px] px-1 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">{dex}</span>
              <OverBtn disabled={!nextId} onClick={() => nextId && onNavigate(nextId)} aria-label="下一張"><Icon n="chevron-right" className="text-[13px]" /></OverBtn>
              <OverBtn onClick={onClose} aria-label="關閉" className="ml-0.5"><Icon n="xmark" /></OverBtn>
            </div>
          </div>
        ) : (
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
        )}

        {cover && (
          <button
            onClick={() => setLightbox(cover)}
            aria-label="放大封面"
            className="block w-full relative overflow-hidden text-left group/cover"
          >
            <Img src={cover} onError={() => setCoverOk(false)}
                 className="w-full h-56 sm:h-72 object-cover group-hover/cover:scale-[1.04] motion-reduce:transform-none" />
            {/* 底部把封面融進卡片背景，中段帶一層樂團色，讓疊上去的白字浮起來 */}
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: `linear-gradient(to top, var(--modal-bg) 3%, rgba(${meta.glow},0.16) 38%, transparent 66%)` }} />
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0.04) 44%, transparent 62%)' }} />
            {/* 疊在封面上的標題（圖鑑卡風格） */}
            <div className="absolute inset-x-0 bottom-0 px-5 sm:px-8 pb-4 sm:pb-5">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="inline-flex items-center rounded px-2 py-0.5 text-[11.5px] font-bold text-white"
                  style={{ background: status === 'past' ? 'rgba(0,0,0,0.5)' : meta.color }}>{STATUS_LABEL[status]}</span>
                <span className="text-[12.5px] font-semibold text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
                  {formatDateRange(event.startDate, event.endDate) || ''}{weekday(event.startDate) && ` ・ ${weekday(event.startDate)}`}
                </span>
                {dleft != null && (
                  <span className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: 'rgba(99,102,241,0.92)' }}>
                    {dleft === 0 ? '就是今天' : `還有 ${dleft} 天`}
                  </span>
                )}
              </div>
              <h2 className="font-display font-bold text-[22px] sm:text-[28px] leading-snug text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] line-clamp-3">
                {event.title || '未命名活動'}
              </h2>
            </div>
          </button>
        )}

        <div className={`px-5 sm:px-8 pb-6 sm:pb-7 relative ${cover ? 'pt-5 sm:pt-6' : 'pt-6 sm:pt-7'}`}>
          {/* 有封面時，狀態與標題已疊在封面上，這裡不重複 */}
          {!cover && (
            <>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`badge ${status === 'past' ? 'badge-side' : 'badge-core'}`}>{STATUS_LABEL[status]}</span>
                {dleft != null && <span className="text-[12px] font-bold text-bloom-indigo">{dleft === 0 ? '就是今天' : `還有 ${dleft} 天`}</span>}
              </div>
              <h2 className="font-display font-bold text-[24px] sm:text-[28px] leading-snug text-dream-ink">{event.title || '未命名活動'}</h2>
            </>
          )}

          {personal && (
            <div className="mt-4 flex items-start gap-2.5 rounded-md px-4 py-3 text-[13px] text-dream-sub"
              style={{ background: `rgba(${meta.glow},0.10)`, border: `1px solid rgba(${meta.glow},0.22)` }}>
              <Icon n="user" className="mt-0.5" style={{ color: meta.color }} />
              <span>聲優以<span className="font-semibold text-dream-ink">個人身分</span>來台；與
                <a href={`#/band/${encodeURIComponent(meta.name)}`} className="font-semibold underline" style={{ color: meta.color }}> {meta.name}</a>
                {roles.length > 0 && <>（{roles.join('・')}）</>} 關聯，非邦邦官方場次。</span>
            </div>
          )}

          <div className={`flex flex-wrap items-center gap-2 ${cover && !personal ? 'mt-1' : 'mt-5'}`}>
            {event.category && <span className={`badge ${event.category === '本體' ? 'badge-core' : 'badge-side'}`}>{event.category === '擦邊' ? '個人' : '本體'}</span>}
            {event.isFullBand && <span className="badge badge-full"><Icon n="star" className="text-[9px]" /> 全團</span>}
            {event.type && <span className="badge badge-side">{event.type}</span>}
          </div>

          {/* 一眼掃 facts：日期 / 地點 / 人次 抽成小色塊 tile */}
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <FactTile icon="calendar" label="日期" color={meta.color} glow={meta.glow}>
              <span className="font-display font-bold text-[15px] text-dream-ink leading-tight">
                {formatDateRange(event.startDate, event.endDate) || '—'}
              </span>
              {weekday(event.startDate) && <span className="text-[12px] text-dream-faint mt-0.5">{weekday(event.startDate)}</span>}
            </FactTile>
            {event.venue && (
              <FactTile icon="location-dot" label="地點" color={meta.color} glow={meta.glow}
                href={`https://www.google.com/maps/search/${encodeURIComponent(event.venue)}`}>
                <span className="font-display font-bold text-[15px] text-dream-ink leading-tight line-clamp-2">{event.venue}</span>
                <span className="text-[12px] text-bloom-indigo mt-0.5 inline-flex items-center gap-1">在地圖開啟<Icon n="link" className="text-[9px]" /></span>
              </FactTile>
            )}
            {event.attendanceCount > 0 && (
              <FactTile icon="users" label="人次" color={meta.color} glow={meta.glow}>
                <span className="font-display font-bold text-[18px] text-dream-ink leading-none">{event.attendanceCount}<span className="text-[12px] font-normal text-dream-faint ml-1">人</span></span>
              </FactTile>
            )}
          </div>

          {/* 聲優 / 樂團 / 主辦 / 購票 / 備註：收進一張資訊卡，細線分隔 */}
          <div className="mt-3 rounded-xl border border-dream-line dark:border-white/10 overflow-hidden divide-y divide-dream-line dark:divide-white/10">
            <InfoLine icon="microphone" term="聲優" color={meta.color} glow={meta.glow}>
              {people.length ? <span className="flex flex-wrap gap-1.5">
                {people.map(p => (
                  <a key={p} href={`#/person/${encodeURIComponent(p)}`}
                    className="rounded-full bg-white/70 dark:bg-white/10 border border-dream-line px-2.5 py-0.5 text-[13px] hover:border-bloom-indigo transition-colors">{p}</a>
                ))}
              </span> : <span className="text-dream-faint text-[13px]">尚無資料</span>}
            </InfoLine>
            <InfoLine icon="guitar" term="樂團" color={meta.color} glow={meta.glow}>
              {groups.length ? <span className="flex flex-wrap gap-1.5">
                {groups.map(g => {
                  const m = bandMeta(g)
                  return (
                    <a key={g} href={`#/band/${encodeURIComponent(rootGroup(g))}`}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium hover:opacity-80 transition-opacity"
                      style={{ background: `rgba(${m.glow},0.14)`, color: m.color, border: `1px solid rgba(${m.glow},0.3)` }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />{g}
                    </a>
                  )
                })}
              </span> : <span className="text-dream-faint text-[13px]">尚無資料</span>}
            </InfoLine>
            {event.organizer && <InfoLine icon="user-group" term="主辦" color={meta.color} glow={meta.glow}>
              <span className="text-[14px] text-dream-ink">{event.organizer}</span>
            </InfoLine>}
            {event.ticketUrl && <InfoLine icon="link" term="購票" color={meta.color} glow={meta.glow}>
              <a className="text-bloom-indigo hover:underline break-all text-[13.5px]" target="_blank" rel="noopener noreferrer" href={event.ticketUrl}>{event.ticketUrl}</a>
            </InfoLine>}
            {event.notes && <InfoLine icon="note-sticky" term="備註" color={meta.color} glow={meta.glow}>
              <span className="text-[14px] text-dream-sub whitespace-pre-line">{event.notes}</span>
            </InfoLine>}
          </div>

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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80"
          role="dialog" aria-modal="true" aria-label={`${event.title || '活動'} 放大照片`}
          onClick={(e) => { e.stopPropagation(); setLightbox(null) }}>
          <img src={lightbox} alt={event.title || ''} className="max-w-full max-h-full rounded object-contain" />
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

// 浮在封面上的控制鈕：半透明深底 + 毛玻璃，白圖示
function OverBtn({ children, active, disabled, className = '', ...rest }) {
  return (
    <button disabled={disabled} {...rest}
      className={`grid place-items-center w-8 h-8 rounded-full backdrop-blur-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? 'bg-bloom-indigo text-white' : 'bg-black/35 text-white hover:bg-black/55'} ${className}`}>
      {children}
    </button>
  )
}

function NavBtn({ dir, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir === 'left' ? '上一張' : '下一張'}
      className="grid place-items-center w-8 h-8 rounded bg-white/70 dark:bg-white/10 text-dream-sub hover:text-dream-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
      <Icon n={dir === 'left' ? 'chevron-left' : 'chevron-right'} className="text-[13px]" />
    </button>
  )
}

// 一眼掃 fact 小色塊；給 href 就整塊變成可點的外部連結
function FactTile({ icon, label, color, glow, href, children }) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="grid place-items-center w-5 h-5 rounded text-[10px] text-white" style={{ background: color }}><Icon n={icon} /></span>
        <span className="text-[11px] font-semibold text-dream-faint">{label}</span>
      </div>
      <div className="flex flex-col">{children}</div>
    </>
  )
  const cls = 'rounded-xl px-3.5 py-3 border'
  const style = { background: `rgba(${glow},0.07)`, borderColor: `rgba(${glow},0.18)` }
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} block hover:brightness-105 transition`} style={style}>{inner}</a>
    : <div className={cls} style={style}>{inner}</div>
}

// 資訊卡內的一列：左側樂團色圖示方塊 + 小標，右側值
function InfoLine({ icon, term, color, glow, children }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="grid place-items-center w-9 h-9 shrink-0 rounded-lg text-[14px]"
        style={{ background: `rgba(${glow},0.14)`, color }}><Icon n={icon} /></span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-[11px] font-semibold text-dream-faint mb-1">{term}</div>
        <div className="text-[14px] text-dream-ink">{children}</div>
      </div>
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
