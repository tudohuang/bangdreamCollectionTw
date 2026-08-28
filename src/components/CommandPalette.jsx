import { useEffect, useMemo, useRef, useState } from 'react'
import { searchEvents } from '../utils/search.js'
import { rootGroup, bandMeta, primaryMeta, isPersonal } from '../utils/bands.js'
import { isUrgent, urgentEvents, URGENT_LABEL } from '../utils/urgency.js'
import { eventStatus, todayStr } from '../utils/datetime.js'
import Icon from './Icon.jsx'

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '')

export default function CommandPalette({ open, onClose, events, onSelectEvent }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 0) } }, [open])

  // 還沒輸入時先列「緊急 / 即將 / 最新收錄」，讓 ⌘K 也能當快速導覽用
  const defaults = useMemo(() => {
    const today = todayStr()
    const seen = new Set()
    const take = (list, hint) => list.filter(e => !seen.has(e.id) && seen.add(e.id))
      .map(e => ({ type: 'event', label: e.title, key: 'd:' + e.id, event: e, hint }))
    const urgent = urgentEvents(events, today).slice(0, 2)
    const soon = events
      .filter(e => ['upcoming', 'ongoing'].includes(eventStatus(e, today)))
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
      .slice(0, 3)
    const latest = [...events].sort((a, b) => (b.number || 0) - (a.number || 0)).slice(0, 3)
    return [...take(urgent, '緊急'), ...take(soon, '即將'), ...take(latest, '最新收錄')]
  }, [events])

  const results = useMemo(() => {
    const nq = norm(q)
    if (!nq) return defaults
    const out = []
    // 聲優（前往圖鑑頁 / 在圖鑑中篩選）
    const people = [...new Set(events.flatMap(e => e.people || []))]
      .filter(p => norm(p).includes(nq)).slice(0, 3)
    for (const p of people) {
      out.push({ type: 'person', label: p, key: 'p:' + p })
      out.push({ type: 'filter', label: p, filterKey: 'people', key: 'fp:' + p })
    }
    // 樂團
    const bands = [...new Set(events.flatMap(e => (e.relatedGroups || []).map(rootGroup)))]
      .filter(b => norm(b).includes(nq)).slice(0, 3)
    for (const b of bands) {
      out.push({ type: 'band', label: b, key: 'b:' + b, color: bandMeta(b).color })
      out.push({ type: 'filter', label: b, filterKey: 'groups', key: 'fb:' + b, color: bandMeta(b).color })
    }
    // 活動
    const evs = searchEvents(events, q).list.slice(0, 8)
    for (const e of evs) out.push({ type: 'event', label: e.title, key: 'e:' + e.id, event: e })
    return out
  }, [q, events, defaults])

  useEffect(() => { setActive(0) }, [q])
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const go = (r) => {
    if (!r) return
    onClose()
    if (r.type === 'event') onSelectEvent(r.event.id)
    else if (r.type === 'filter') window.location.hash = `#/collection?${r.filterKey}=${encodeURIComponent(r.label)}`
    else window.location.hash = `#/${r.type}/${encodeURIComponent(r.label)}`
  }

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl border border-dream-line overflow-hidden dark:border-white/15 shadow-[0_24px_70px_-24px_rgba(139,92,246,0.5)]"
        style={{ background: 'var(--modal-bg)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b border-dream-line">
          <Icon n="magnifying-glass" className="text-dream-faint" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="搜尋活動、聲優、樂團…（愛美 / Aimi / Roselia）"
            className="flex-1 bg-transparent py-4 text-[16px] text-dream-ink outline-none placeholder:text-dream-faint" />
          <kbd className="text-[14px] text-dream-faint border border-dream-line rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto scrollbar-thin py-2">
          {q && results.length === 0 && (
            <div className="px-4 py-10 text-center text-[16px] text-dream-faint">找不到「{q}」</div>
          )}
          {!q && results.length > 0 && (
            <div className="px-4 pt-1 pb-2 text-[14px] font-bold tracking-[0.18em] uppercase text-dream-faint">
              先看這些
            </div>
          )}
          {!q && results.length === 0 && (
            <div className="px-4 py-10 text-center text-[14px] text-dream-faint">
              輸入關鍵字快速跳轉 · <kbd className="border border-dream-line rounded px-1">↑</kbd><kbd className="border border-dream-line rounded px-1 ml-0.5">↓</kbd> 選擇 · <kbd className="border border-dream-line rounded px-1">↵</kbd> 前往
            </div>
          )}
          {results.map((r, i) => {
            const isA = i === active
            return (
              <button key={r.key} data-active={isA}
                onMouseEnter={() => setActive(i)} onClick={() => go(r)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 ${isA ? 'bg-bloom-indigo/10' : ''}`}>
                <span className="grid place-items-center w-7 h-7 rounded shrink-0 text-[14px]"
                  style={(r.type === 'band' || (r.type === 'filter' && r.color))
                    ? { background: `${r.color}22`, color: r.color }
                    : r.type === 'event'
                      ? { background: `rgba(${primaryMeta(r.event).glow},0.14)`, color: primaryMeta(r.event).color }
                      : { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
                  <Icon n={r.type === 'person' ? 'microphone' : r.type === 'band' ? 'guitar' : r.type === 'filter' ? 'sliders' : (isPersonal(r.event) ? 'user' : 'calendar')} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[16px] text-dream-ink">
                    {r.type === 'event' && isUrgent(r.event) && (
                      <span className="urgent-badge shrink-0">
                        <Icon n="triangle-exclamation" className="text-[9px]" /> {URGENT_LABEL}
                      </span>
                    )}
                    <span className="truncate">
                      {r.type === 'filter' ? <>在圖鑑中篩選：<span className="font-semibold">{r.label}</span></> : r.label}
                    </span>
                  </span>
                  <span className="block text-[14px] text-dream-faint">
                    {r.type === 'person' ? '聲優圖鑑頁' : r.type === 'band' ? '樂團圖鑑頁' : r.type === 'filter' ? '套用篩選'
                      : `${r.hint ? r.hint + ' · ' : ''}#${String(r.event.number).padStart(3, '0')} · ${r.event.year}`}
                  </span>
                </span>
                {isA && <Icon n="chevron-right" className="text-dream-faint text-[12px] shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
