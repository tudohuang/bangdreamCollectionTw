import { useEffect, useMemo, useRef, useState } from 'react'
import { matchSearch } from '../utils/search.js'
import { rootGroup, bandMeta, primaryMeta, isPersonal } from '../utils/bands.js'
import Icon from './Icon.jsx'

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '')

export default function CommandPalette({ open, onClose, events, onSelectEvent }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 0) } }, [open])

  const results = useMemo(() => {
    const nq = norm(q)
    if (!nq) return []
    const out = []
    // 聲優
    const people = [...new Set(events.flatMap(e => e.people || []))]
      .filter(p => norm(p).includes(nq)).slice(0, 4)
    for (const p of people) out.push({ type: 'person', label: p, key: 'p:' + p })
    // 樂團
    const bands = [...new Set(events.flatMap(e => (e.relatedGroups || []).map(rootGroup)))]
      .filter(b => norm(b).includes(nq)).slice(0, 4)
    for (const b of bands) out.push({ type: 'band', label: b, key: 'b:' + b, color: bandMeta(b).color })
    // 活動
    const evs = events.filter(e => matchSearch(e, q)).slice(0, 8)
    for (const e of evs) out.push({ type: 'event', label: e.title, key: 'e:' + e.id, event: e })
    return out
  }, [q, events])

  useEffect(() => { setActive(0) }, [q])
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const go = (r) => {
    if (!r) return
    onClose()
    if (r.type === 'event') onSelectEvent(r.event.id)
    else window.location.hash = `#/${r.type}/${encodeURIComponent(r.label)}`
  }

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4 bg-dream-ink/50" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl border border-dream-line shadow-glassHover overflow-hidden dark:border-white/15"
        style={{ background: 'var(--modal-bg)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b border-dream-line">
          <Icon n="magnifying-glass" className="text-dream-faint" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="搜尋活動、聲優、樂團…（愛美 / Aimi / Roselia）"
            className="flex-1 bg-transparent py-4 text-[15px] text-dream-ink outline-none placeholder:text-dream-faint" />
          <kbd className="text-[11px] text-dream-faint border border-dream-line rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto scrollbar-thin py-2">
          {q && results.length === 0 && (
            <div className="px-4 py-10 text-center text-[14px] text-dream-faint">找不到「{q}」</div>
          )}
          {!q && (
            <div className="px-4 py-10 text-center text-[13px] text-dream-faint">
              輸入關鍵字快速跳轉 · <kbd className="border border-dream-line rounded px-1">↑</kbd><kbd className="border border-dream-line rounded px-1 ml-0.5">↓</kbd> 選擇 · <kbd className="border border-dream-line rounded px-1">↵</kbd> 前往
            </div>
          )}
          {results.map((r, i) => {
            const isA = i === active
            return (
              <button key={r.key} data-active={isA}
                onMouseEnter={() => setActive(i)} onClick={() => go(r)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 ${isA ? 'bg-bloom-indigo/10' : ''}`}>
                <span className="grid place-items-center w-7 h-7 rounded shrink-0 text-[12px]"
                  style={r.type === 'band'
                    ? { background: `${r.color}22`, color: r.color }
                    : r.type === 'event'
                      ? { background: `rgba(${primaryMeta(r.event).glow},0.14)`, color: primaryMeta(r.event).color }
                      : { background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                  <Icon n={r.type === 'person' ? 'microphone' : r.type === 'band' ? 'guitar' : (isPersonal(r.event) ? 'user' : 'calendar')} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] text-dream-ink truncate">{r.label}</span>
                  <span className="block text-[11px] text-dream-faint">
                    {r.type === 'person' ? '聲優' : r.type === 'band' ? '樂團' : `#${String(r.event.number).padStart(3, '0')} · ${r.event.year}`}
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
