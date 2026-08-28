import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSummary, copyText, formatDateRangeCompact, shareUrl } from '../utils/share.js'
import { primaryMeta, parseGroup, isPersonal, rootGroup } from '../utils/bands.js'
import { photoUrl, photoCredit, PHOTO_CREDIT_KEYS } from '../utils/media.js'
import { coverSrc, coverSources } from '../utils/cover.js'
import { eventStatus, countdownLabel, weekday, STATUS_LABEL } from '../utils/datetime.js'
import { eventContext, typeTags } from '../utils/context.js'
import { downloadIcs } from '../utils/ics.js'
import { downloadShareImage } from '../utils/shareImage.js'
import { isUrgent, URGENT_LABEL } from '../utils/urgency.js'
import { organizersOf } from '../utils/organizers.js'
import { COORD_KEYS, LAT_KEYS, LNG_KEYS } from '../utils/geo.js'
import { canonicalVenue } from '../utils/derive.js'
import { personBandMap } from '../utils/derive.js'
import { tap } from '../utils/haptics.js'
import { renderMarkdown } from '../utils/markdown.js'
import { REPORT_URL } from '../config.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'
import CollectionStrip from './CollectionStrip.jsx'
import EntryPlate, { CastList, BandRow } from './EntryPlate.jsx'
import ArchiveSection from './ArchiveSection.jsx'
import MissingLine from './MissingLine.jsx'
import Chronicle from './Chronicle.jsx'
import {
  PhotoCredit, Punch, OverBtn, Stat,
  NeighborBtn, RelatedStrip, RelatedList, Section,
} from './DetailParts.jsx'

// 場次詳情浮層：頭圖、撕票線，左欄是這場的基本資料，右欄是它在收藏史裡的位置。
export default function EventDetail({ event, allEvents = [], attended, onToggleAttended, onClose, prevId, nextId, onNavigate, milestones = [], pulse = [], sheetRoster = [] }) {
  const [toast, setToast] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const [swipeX, setSwipeX] = useState(0)
  const [coverOk, setCoverOk] = useState(true)
  const panelRef = useRef(null)
  const meta = primaryMeta(event)
  const personal = isPersonal(event)
  const isAttended = attended?.has(event.id)
  const ctx = useMemo(() => eventContext(event, allEvents), [event, allEvents])
  // 誰飾演誰。以名冊為準，名冊沒有的人才用活動表推（見 utils/derive.js）
  const castRoster = useMemo(() => personBandMap(allEvents, sheetRoster), [allEvents, sheetRoster])

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

  // 換場次時把浮層捲回頂端，否則會停在上一場的捲動位置
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

  // 手機的兩種橫向手勢，靠「從哪裡開始滑」分辨，跟 iOS 一樣：
  //   從左邊緣往右滑 → 返回（頁面跟著手指走）
  //   在畫面中間左右滑 → 切換上一場／下一場
  // 縱向明顯比較大的一律放行，不然一邊捲動一邊會誤觸。
  const EDGE = 28          // 邊緣判定寬度
  const BACK_DISTANCE = 96 // 放開後要退多遠才算返回
  const SWITCH_DISTANCE = 60

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || lightbox) return
    let x0 = null, y0 = null, fromEdge = false

    const onStart = (e) => {
      if (e.touches.length !== 1) return
      x0 = e.touches[0].clientX
      y0 = e.touches[0].clientY
      fromEdge = x0 <= EDGE
    }

    const onMove = (e) => {
      if (x0 === null || !fromEdge) return
      const dx = e.touches[0].clientX - x0
      const dy = e.touches[0].clientY - y0
      if (Math.abs(dy) > Math.abs(dx)) { x0 = null; setSwipeX(0); return }
      setSwipeX(Math.max(0, dx))
    }

    const onEnd = (e) => {
      if (x0 === null) return
      const t = e.changedTouches[0]
      const dx = t.clientX - x0
      const dy = t.clientY - y0
      const edge = fromEdge
      x0 = null

      if (edge) {
        setSwipeX(0)
        if (dx > BACK_DISTANCE) { tap(); onClose() }
        return
      }
      if (Math.abs(dx) < SWITCH_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.8) return
      if (dx > 0 && prevId) { tap(); onNavigate(prevId) }
      else if (dx < 0 && nextId) { tap(); onNavigate(nextId) }
    }

    panel.addEventListener('touchstart', onStart, { passive: true })
    panel.addEventListener('touchmove', onMove, { passive: true })
    panel.addEventListener('touchend', onEnd, { passive: true })
    panel.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      panel.removeEventListener('touchstart', onStart)
      panel.removeEventListener('touchmove', onMove)
      panel.removeEventListener('touchend', onEnd)
      panel.removeEventListener('touchcancel', onEnd)
    }
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
  const copyLink = async () => flash((await copyText(shareUrl('event', event.id))) ? '已複製連結' : '複製失敗')

  const dex = `#${String(event.number ?? 0).padStart(3, '0')}`
  const groups = event.relatedGroups || []
  const people = event.people || []
  const photos = event.photos || []
  // 詳情頁用大尺寸；沒有本地檔的會自動退回原本的外連網址
  const cover = coverOk ? coverSrc(event, 'lg') : null
  const lgSources = coverSources(event, 'lg')
  // 封面已經是上方的 banner，照片牆不再重複顯示
  const galleryPhotos = cover ? photos.filter(p => photoUrl(p) !== cover) : photos
  const roles = groups.flatMap(g => parseGroup(g).parts)
  const status = eventStatus(event)
  const countdown = countdownLabel(event, { style: 'long' })
  const tags = typeTags(event)
  const urgent = isUrgent(event)
  // 照片出處顯示在圖片旁，不與存根的其他欄位混在一起
  const credit = photoCredit(event)
  // 座標與照片出處都是機器資料：前者給地圖與結構化資料用，後者顯示在照片旁。
  // 原樣列在銘牌上只會佔位置 —— 沒有人想讀 17 位小數。
  const HIDDEN_KEYS = [...PHOTO_CREDIT_KEYS, ...COORD_KEYS, ...LAT_KEYS, ...LNG_KEYS,
    '曲目', 'setlist', '票價', 'price', '周邊', '場販', 'goods', '主視覺', '繪師', 'keyVisual']
  const extras = Object.entries(event.extras || {}).filter(([k]) => !HIDDEN_KEYS.includes(k))

  // 相關場次：同樂團 / 同聲優 / 同場館
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
    <div className="modal-veil fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-6 sm:bg-black/60 sm:backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef} tabIndex={-1}
        className={`ticket-paper modal-ticket push-page relative w-full h-full sm:h-auto sm:max-w-3xl lg:max-w-5xl sm:max-h-[94vh] overflow-y-auto rounded-none sm:rounded-3xl border-0 sm:border border-dream-line sm:shadow-glassHover scrollbar-thin dark:border-white/15 focus:outline-none ${urgent ? 'urgent-card' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={event.title}
        style={{ '--band': meta.glow, transform: swipeX ? `translateX(${swipeX}px)` : undefined, transition: swipeX ? 'none' : undefined }}
      >
        {/* ---------- 舞台頭圖（有封面用照片、沒封面用樂團色舞台，同一套版型） ---------- */}
        <div className="relative overflow-hidden">
          {cover ? (
            // 活動主視覺多半是直式海報，硬 object-cover 會把臉裁掉。
            // 改成 letterbox：背景放同一張圖放大模糊，前景完整顯示。
            <button onClick={() => setLightbox(cover)} aria-label="放大封面"
              className="block w-full text-left group/cover relative h-60 sm:h-80 overflow-hidden bg-black/10">
              {/* 背景那張只是模糊的襯底，用小尺寸就夠 —— 反正要 blur 掉 */}
              <img aria-hidden src={coverSrc(event, 'sm')} alt=""
                className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-70" />
              <picture className="relative block w-full h-full">
                {lgSources && <source type="image/avif" srcSet={lgSources.avif} />}
                {lgSources && <source type="image/webp" srcSet={lgSources.webp} />}
                <img src={cover} alt="" decoding="async"
                  onError={() => setCoverOk(false)}
                  className="w-full h-full object-contain group-hover/cover:scale-[1.03] motion-reduce:transform-none" />
              </picture>
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
          {/* 頭圖上的控制列。
              手機是推進來的一頁，所以左上角是「返回」而不是叉叉，
              上下張的箭頭也收起來 —— 那裡改用左右滑，欄位留給返回。 */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 sm:px-4 py-3 pointer-events-none"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}>
            <button onClick={onClose} aria-label="返回"
              className="sm:hidden pointer-events-auto inline-flex items-center gap-0.5 h-9 pl-1.5 pr-3 rounded-full text-[14px] font-semibold text-white backdrop-blur-sm bg-black/35">
              <Icon n="chevron-left" className="text-[13px]" /> 返回
            </button>
            <span className="hidden sm:inline-flex pointer-events-auto items-center gap-2 rounded-full pl-1.5 pr-3 py-1 text-[14px] font-bold text-white backdrop-blur-sm"
              style={{ background: personal ? 'rgba(139,92,246,0.85)' : `rgba(${meta.glow},0.85)` }}>
              <span className="grid place-items-center w-5 h-5 rounded-full bg-white/30 text-[14px]"><Icon n={personal ? 'user' : meta.icon} /></span>
              {personal ? '個人來台' : meta.name}
            </span>
            <div className="pointer-events-auto flex items-center gap-1.5">
              <OverBtn active={isAttended} onClick={() => onToggleAttended?.(event.id)} aria-label={isAttended ? '取消已去過' : '標記我去過'}>
                <Icon n="circle-check" className="text-[13px]" />
              </OverBtn>
              <span className="hidden sm:flex items-center gap-1.5">
                <OverBtn disabled={!prevId} onClick={() => prevId && onNavigate(prevId)} aria-label="上一張"><Icon n="chevron-left" className="text-[13px]" /></OverBtn>
                <OverBtn disabled={!nextId} onClick={() => nextId && onNavigate(nextId)} aria-label="下一張"><Icon n="chevron-right" className="text-[13px]" /></OverBtn>
                <OverBtn className="ml-0.5" onClick={onClose} aria-label="關閉"><Icon n="xmark" /></OverBtn>
              </span>
            </div>
          </div>

          {/* 蓋章：去過的場次才有 */}
          {isAttended && (
            <div aria-hidden className="absolute right-5 sm:right-8 bottom-16 sm:bottom-20 z-10 pointer-events-none -rotate-[11deg]">
              <div className="stamp grid place-items-center w-24 h-24 sm:w-28 sm:h-28 rounded-full text-white">
                <span className="font-hand font-bold text-[19px] sm:text-[22px] leading-none">我去過</span>
                <span className="mt-1 text-[14px] sm:text-[14px] font-bold tracking-[0.28em] uppercase">Attended</span>
              </div>
            </div>
          )}

          {/* 撕紙齒邊：紙從照片上撕下來 */}
          <div aria-hidden className="tear-teeth absolute inset-x-0 bottom-0 h-2 z-10" />

          {/* 標題疊底部 */}
          <div className="absolute inset-x-0 bottom-0 px-5 sm:px-8 pb-4 sm:pb-5 pointer-events-none">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {urgent && (
                <span className="urgent-badge !text-[14px]">
                  <Icon n="triangle-exclamation" className="text-[10px]" /> {URGENT_LABEL}
                </span>
              )}
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[14px] font-bold text-white"
                style={{ background: status === 'past' ? 'rgba(0,0,0,0.5)' : meta.color }}>{STATUS_LABEL[status]}</span>
              <span className="text-[14px] font-semibold text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
                {formatDateRangeCompact(event.startDate, event.endDate) || ''}{weekday(event.startDate) && ` ・ ${weekday(event.startDate)}`}
              </span>
              {countdown && (
                <span className="rounded-full px-2 py-0.5 text-[14px] font-bold text-white" style={{ background: 'rgba(139,92,246,0.92)' }}>
                  {countdown}
                </span>
              )}
            </div>
            <h2 className="font-display font-bold text-[22px] sm:text-[30px] leading-snug text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] line-clamp-3 pr-12 sm:pr-0">
              {event.title || '未命名活動'}
            </h2>
          </div>
        </div>

        {/* ---------- 撕票線：ADMIT ONE 微型字 + 條碼，下面一排打孔 ---------- */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-8 pt-3 pb-2 text-dream-faint">
          <span className="text-[14px] font-bold tracking-[0.3em] uppercase truncate">
            Admit One · Taiwan BanG Dream! Collection
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <span aria-hidden className="h-5 w-16 opacity-40"
              style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 5px)' }} />
            <span className="font-round font-bold text-[14px]" style={{ color: meta.color }}>{dex}</span>
          </span>
        </div>
        <div className="relative h-3.5">
          <div aria-hidden className="perf-h absolute inset-0" />
          <Punch className="-left-2" />
          <Punch className="-right-2" />
        </div>

        {/* 站長一句話：全站唯一沒辦法從公開資料重建的東西，所以放在最前面 */}
        {event.oneLine && (
          <blockquote className="mx-5 sm:mx-8 mt-4 -mb-1 pl-4 border-l-[3px] text-[16px] sm:text-[18px] leading-relaxed font-hand text-dream-ink"
            style={{ borderColor: meta.color }}>
            {event.oneLine}
            <cite className="block mt-1 not-italic text-[14px] tracking-widest uppercase text-dream-faint">站長一句話</cite>
          </blockquote>
        )}

        {/* ---------- 存根（左）＋ 脈絡（右）：手機疊成單欄，脈絡先出 ---------- */}
        <div className="flex flex-col lg:grid lg:grid-cols-[286px_14px_minmax(0,1fr)] lg:items-stretch">

          <aside className="order-2 lg:order-none w-full px-5 sm:px-8 lg:pl-6 lg:pr-0 py-5 lg:py-6 lg:self-start lg:sticky lg:top-0">
            {/* 銘牌：用排版呈現資料，不用有邊框的欄位盒。
                原本這裡每一列是「圖示＋標籤＋值」，那是後台系統的長相。 */}
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-[14px] font-bold tracking-[0.32em] uppercase text-dream-faint">Entry</span>
              <span className="font-display font-extrabold text-[22px] leading-none tabular-nums"
                style={{ color: meta.color }}>{dex}</span>
            </div>

            <EntryPlate color={meta} rows={[
              {
                label: '日期',
                value: formatDateRangeCompact(event.startDate, event.endDate) || '—',
                note: [weekday(event.startDate), ctx.ago].filter(Boolean).join(' · '),
              },
              event.venue && {
                label: '會場',
                value: (
                  <span className="inline-flex items-start gap-1.5">
                    <a href={`#/venue/${encodeURIComponent(canonicalVenue(event.venue))}`} onClick={onClose}
                      className="hover:text-bloom-violet transition-colors">
                      {event.venue}
                    </a>
                    <a href={`https://www.google.com/maps/search/${encodeURIComponent(event.venue)}`}
                      target="_blank" rel="noopener noreferrer" aria-label="在 Google 地圖上開啟"
                      className="mt-1.5 shrink-0 opacity-50 hover:opacity-100 transition-opacity">
                      <Icon n="link" className="text-[9px]" />
                    </a>
                  </span>
                ),
                note: ctx.venueTotal > 1 ? `這裡的第 ${ctx.venueNth} 場` : null,
              },
              {
                label: '編制',
                value: (
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {urgent && <span className="urgent-badge"><Icon n="triangle-exclamation" className="text-[9px]" /> {URGENT_LABEL}</span>}
                    <span>{event.category === '擦邊' ? '個人' : '本體'}</span>
                    {event.isFullBand && <span style={{ color: meta.color }}>· 全團</span>}
                    {tags.length > 0 && <span className="text-dream-sub">· {tags.join('・')}</span>}
                  </span>
                ),
                note: event.attendanceCount > 0 ? `${event.attendanceCount} 人` : null,
              },
              event.organizer && {
                label: '主辦',
                value: (
                  <span className="flex flex-wrap gap-x-2 gap-y-1">
                    {organizersOf(event).map(name => (
                      <a key={name} href={`#/org/${encodeURIComponent(name)}`}
                        className="hover:text-bloom-violet transition-colors">{name}</a>
                    ))}
                  </span>
                ),
                note: ctx.organizerTotal > 1 ? `辦過的第 ${ctx.organizerNth} 場` : null,
              },
              event.ticketUrl && {
                label: '購票',
                value: (
                  <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[14px] font-normal text-bloom-violet hover:underline break-all">
                    {(() => { try { return new URL(event.ticketUrl).hostname.replace(/^www./, '') } catch { return event.ticketUrl } })()}
                  </a>
                ),
              },
              ...extras.map(([name, value]) => ({
                label: name,
                value: /^https?:///i.test(value)
                  ? <a className="text-[14px] font-normal text-bloom-violet hover:underline break-all" target="_blank" rel="noopener noreferrer" href={value}>{value}</a>
                  : <span className="text-[14px] font-normal text-dream-sub whitespace-pre-line">{value}</span>,
              })),
              event.sources?.length > 0 && {
                label: '來源',
                value: (
                  <span className="flex flex-col gap-1">
                    {event.sources.map((src, i) => {
                      let host = src
                      try { host = new URL(src).hostname.replace(/^www./, '') } catch {}
                      return (
                        <a key={i} href={src} target="_blank" rel="noopener noreferrer"
                          className="text-[14px] font-normal text-dream-sub hover:text-bloom-violet transition-colors truncate">{host}</a>
                      )
                    })}
                  </span>
                ),
              },
            ]} />
          </aside>

          <div aria-hidden className="hidden lg:block perf-v" />

          <div className="order-1 lg:order-none min-w-0 px-5 sm:px-8 lg:pl-6 lg:pr-7 pt-5 lg:pt-6 pb-2">

            {urgent && (
              <div className="urgent-note mb-5">
                <Icon n="triangle-exclamation" className="mt-0.5 shrink-0" style={{ color: 'rgb(var(--c-urgent))' }} />
                <span>
                  <span className="font-bold">這場被標成緊急</span>
                  ：情報還在動，時間、票務或內容隨時可能變。看到就先確認一次官方公告。
                  {event.ticketUrl && (
                    <>
                      {' '}
                      <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
                        className="font-bold underline underline-offset-2" style={{ color: 'rgb(var(--c-urgent))' }}>
                        直接去購票頁
                      </a>
                    </>
                  )}
                </span>
              </div>
            )}

            {personal && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl px-4 py-3 text-[14px] text-dream-sub"
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
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-bold text-white"
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
                  className="mt-3.5 w-full text-left text-[14px] text-dream-sub hover:text-dream-ink transition-colors">
                  上一次是 <span className="font-round font-bold" style={{ color: meta.color }}>#{String(ctx.prevBandEvent.number).padStart(3, '0')}</span>
                  <span className="ml-1.5">{ctx.prevBandEvent.title}</span>
                </button>
              )}

              {ctx.sameDay.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed" style={{ borderColor: `rgba(${meta.glow},0.28)` }}>
                  <div className="text-[14px] font-semibold text-dream-faint mb-1.5">同一天還有 {ctx.sameDay.length} 場</div>
                  <RelatedList items={ctx.sameDay} color={meta.color} onNavigate={onNavigate} />
                </div>
              )}
            </div>

            {/* 陣容：聲優帶累積次數，首次來台掛 NEW */}
            {/* 陣容：像設定集的角色表 —— 誰、飾演誰、第幾次來。
                原本是一排圓角標籤，那讀起來像篩選器不像名單。 */}
            <Section title={`陣容 ${ctx.people.length ? ctx.people.length + ' 人' : ''}`} color={meta.color}>
              {ctx.people.length > 0
                ? <CastList people={ctx.people} roster={castRoster} color={meta} />
                : <p className="text-[14px] text-dream-faint">尚無聲優資料</p>}
              <BandRow groups={groups} />
            </Section>

            {/* 史料層：曲目、票價、周邊、主視覺。沒資料整塊不出現 */}
            <ArchiveSection event={event} allEvents={allEvents} color={meta.color} glow={meta.glow} />
            {/* 缺什麼就講缺什麼。設定集不會因為一頁資料不全就把那頁抽掉 */}
            <MissingLine event={event} color={meta.color} />

            {/* 收藏軌：53 場排成一條，這場亮起來，點任何一格直接跳過去 */}
            <Section title="收藏軌" color={meta.color}>
              <CollectionStrip chrono={ctx.chrono} isOn={(o) => o.id === event.id} onNavigate={onNavigate} />
              <div className="mt-2.5 flex items-center justify-between text-[14px] text-dream-faint">
                <span>全站第 <span className="font-round font-bold" style={{ color: meta.color }}>{ctx.index + 1}</span> 場 · 共 {ctx.total} 場</span>
                <span className="hidden sm:inline font-hand text-[14px]">點任一格跳過去</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <NeighborBtn side="prev" item={ctx.prevChrono} color={meta.color} onNavigate={onNavigate} />
                <NeighborBtn side="next" item={ctx.nextChrono} color={meta.color} onNavigate={onNavigate} />
              </div>
            </Section>

            {event.description && <Section title="活動簡介" color={meta.color}><p className="text-[16px] leading-7 text-dream-sub whitespace-pre-line">{event.description}</p></Section>}
            {event.impression && (
              <Section title="個人心得" color={meta.color}>
                <div className="prose-note text-[16px] leading-7 text-dream-sub"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(event.impression) }} />
              </Section>
            )}
            {event.notes && <Section title="備註" color={meta.color}><p className="text-[16px] leading-7 text-dream-sub whitespace-pre-line">{event.notes}</p></Section>}

            {/* 史料層：這場周圍發生過什麼。基本資料任何人都查得到，這一層查不到 */}
            <Chronicle event={event} allEvents={allEvents} pulse={pulse}
              color={meta.color} glow={meta.glow} onNavigate={onNavigate} />

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
                <RelatedStrip items={related} color={meta.color} onNavigate={onNavigate} />
              </Section>
            )}
            {samePeople.length > 0 && (
              <Section title="同聲優的其他場次" color={meta.color}>
                <RelatedStrip items={samePeople} color={meta.color} onNavigate={onNavigate} />
              </Section>
            )}
            {sameVenue.length > 0 && (
              <Section title={`也在 ${event.venue}`} color={meta.color}>
                <RelatedStrip items={sameVenue} color={meta.color} onNavigate={onNavigate} />
              </Section>
            )}

            {/* 缺照片/心得就給一條低調的補資料出口（config 沒設 REPORT_URL 就不出現） */}
            {REPORT_URL && !event.impression && galleryPhotos.length === 0 && (
              <a href={REPORT_URL} target="_blank" rel="noopener noreferrer"
                className="mt-6 flex items-center gap-2.5 rounded-xl border border-dashed border-dream-line dark:border-white/15 px-4 py-3 text-[14px] text-dream-faint hover:text-dream-ink hover:border-bloom-violet transition-colors">
                <Icon n="heart" style={{ color: meta.color }} />
                這場還缺照片和心得，你有的話幫忙補一筆
              </a>
            )}
          </div>
        </div>

        {/* 常駐操作列：黏在浮層底部，捲到哪都能分享 */}
        <div className="sticky bottom-0 z-10 px-5 sm:px-8 py-3 flex flex-wrap gap-2.5 items-center border-t border-dream-line dark:border-white/10"
          style={{ background: 'var(--modal-bg)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}>
          {/* 手機只留圖示，四顆按鈕才不會擠成兩行吃掉半個畫面 */}
          <button className="btn-primary !h-11 sm:!h-10 !px-4 sm:!px-6" onClick={copyLink}>
            <Icon n="link" /> 複製連結
          </button>
          <button className="pill !h-11 sm:!h-auto !px-4 !py-2 !text-[14px]" aria-label="加入行事曆" title="加入行事曆"
            onClick={() => flash(downloadIcs(event, `${event.id}.ics`) ? '已下載行事曆檔' : '這場沒有確定日期')}>
            <Icon n="calendar" /> <span className="hidden sm:inline">加行事曆</span>
          </button>
          <button className="pill !h-11 sm:!h-auto !px-4 !py-2 !text-[14px]" aria-label="複製摘要" title="複製摘要" onClick={copySummary}>
            <Icon n="clipboard" /> <span className="hidden sm:inline">摘要</span>
          </button>
          <button className="pill !h-11 sm:!h-auto !px-4 !py-2 !text-[14px]" aria-label="存成圖" title="存成圖"
            onClick={() => downloadShareImage(event, meta, personal, {
              attended: isAttended,
              bandNth: ctx.bandNth, bandTotal: ctx.bandTotal,
              index: ctx.index, total: ctx.total,
            })}><Icon n="star" /> <span className="hidden sm:inline">存成圖</span></button>
          <span className="ml-auto self-center text-[14px] text-dream-faint hidden sm:inline">← → 切換 · Esc 關閉</span>
          <span className="ml-auto self-center text-[14px] text-dream-faint sm:hidden">左右滑切換 · 左緣滑回</span>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 rounded-full bg-dream-ink text-white text-[14px] font-medium px-4 py-2">
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
