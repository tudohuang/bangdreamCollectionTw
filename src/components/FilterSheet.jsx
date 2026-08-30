import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { rootGroup, bandMeta } from '../utils/bands.js'
import { uniqueCharacters, uniqueVenues, uniqueCities } from '../utils/derive.js'
import Icon from './Icon.jsx'
import Segmented from './Segmented.jsx'
import { TIMEFRAMES, ORDERS, VIEWS } from './filterOptions.js'

// 「全部篩選」抽屜與它專用的三個零件（Row / ChipGroup / Segmented）。
//
// 從 FilterPanel 抽出來的原因：那支 532 行裡，這一塊佔了 250 行，
// 而它跟上面的篩選列其實只有一個介面 —— 開／關。
// 兩者混在一起的時候，改一顆 pill 的樣式要先捲過整個抽屜的拖曳邏輯。

function uniq(arr) { return [...new Set(arr)] }
// 「全部篩選」抽屜：手機從底部滑出（bottom sheet）、桌面置中對話框
export default function FilterSheet({ events, filters, onChange, onClose, onReset, resultCount }) {
  const [dragY, setDragY] = useState(0)
  const panelRef = useRef(null)
  const scrollRef = useRef(null)
  const years = useMemo(() => uniq(events.map(e => e.year).filter(Boolean)).sort((a, b) => a - b), [events])
  const types = useMemo(() => uniq(events.map(e => e.type).filter(Boolean)).sort(), [events])
  const groups = useMemo(() => uniq(events.flatMap(e => (e.relatedGroups || []).map(rootGroup))).sort(), [events])
  const characters = useMemo(() => uniqueCharacters(events), [events])
  const venues = useMemo(() => uniqueVenues(events), [events])
  const cities = useMemo(() => uniqueCities(events), [events])
  const people = useMemo(() => {
    const count = {}
    for (const e of events) for (const p of (e.people || [])) count[p] = (count[p] || 0) + 1
    return Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [events])

  const toggleIn = (key, val) => {
    const cur = filters[key] || []
    onChange({ [key]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] })
  }

  // 鎖背景捲動 + Esc 關閉
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  // 手機：往下拉可以關掉。只在內容捲到最頂端時才接管，
  // 否則使用者想往上捲條件清單就會誤關。
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    let y0 = null

    const atTop = () => (scrollRef.current?.scrollTop ?? 0) <= 0
    const onStart = (e) => { y0 = atTop() && e.touches.length === 1 ? e.touches[0].clientY : null }
    const onMove = (e) => {
      if (y0 === null) return
      const dy = e.touches[0].clientY - y0
      if (dy <= 0 || !atTop()) { y0 = null; setDragY(0); return }
      setDragY(dy)
    }
    const onEnd = () => {
      if (y0 === null) return
      y0 = null
      setDragY(cur => { if (cur > 110) onClose(); return 0 })
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
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef}
        className="sheet-panel w-full sm:max-w-2xl max-h-[88vh] sm:max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-dream-line dark:border-white/15"
        style={{
          background: 'var(--modal-bg)',
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? 'none' : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="篩選"
      >
        {/* 手機的抓握條：看得出可以往下拉關掉 */}
        <span aria-hidden className="sm:hidden mx-auto mt-2.5 mb-1 w-10 h-1 rounded-full bg-dream-faint/40" />

        <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-4 border-b border-dream-line dark:border-white/10">
          <h3 className="font-display font-bold text-[16px] text-dream-ink flex items-center gap-2">
            <Icon n="sliders" className="text-bloom-indigo text-[13px]" /> 篩選
          </h3>
          <div className="flex items-center gap-2">
            <button className="text-[14px] text-dream-faint hover:text-bloom-rose" onClick={onReset}>重設</button>
            <button className="icon-btn" onClick={onClose} aria-label="關閉"><Icon n="xmark" /></button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 sm:px-6 py-5 space-y-5">
          {/* 手機的快篩本來攤在工具列上，現在收進來 */}
          <div className="sm:hidden space-y-5">
            <Row label="本體 / 個人">
              <ChipGroup options={[['全部', 'all'], ['本體', '本體'], ['個人', '擦邊']]}
                value={filters.category} onChange={(v) => onChange({ category: v })} single />
            </Row>
            <Row label="時間">
              <ChipGroup options={TIMEFRAMES} value={filters.timeframe}
                onChange={(v) => onChange({ timeframe: v })} single />
            </Row>
            <Row label="只看">
              <ChipGroup
                options={[['我去過', 'attended'], ['有照片', 'photos']]}
                values={[
                  ...(filters.attended === 'yes' ? ['attended'] : []),
                  ...(filters.photos === 'yes' ? ['photos'] : []),
                ]}
                onToggle={(v) => onChange(v === 'attended'
                  ? { attended: filters.attended === 'yes' ? 'all' : 'yes' }
                  : { photos: filters.photos === 'yes' ? 'all' : 'yes' })} />
            </Row>
            <Row label="排序">
              <ChipGroup options={ORDERS} value={filters.order}
                onChange={(v) => onChange({ order: v })} single />
            </Row>
          </div>
          <Row label="檢視方式">
            <ChipGroup options={VIEWS.map(([label, v]) => [label, v])}
              value={filters.view} onChange={(v) => onChange({ view: v })} single />
          </Row>
          <Row label="年份">
            <ChipGroup options={[['全部', 'all'], ...years.map(y => [String(y), String(y)])]}
              value={String(filters.year)} onChange={(v) => onChange({ year: v })} single />
          </Row>
          <Row label="樂團（可多選）">
            <ChipGroup options={groups.map(g => [g, g])} values={filters.groups}
              onToggle={(v) => toggleIn('groups', v)} colored />
          </Row>
          <Row label="聲優（可多選）">
            <ChipGroup options={people.map(([p, c]) => [`${p} ${c}`, p])} values={filters.people}
              onToggle={(v) => toggleIn('people', v)} />
          </Row>
          {characters.length > 0 && (
            <Row label="角色（可多選）">
              <ChipGroup options={characters.map(c => [c, c])} values={filters.characters}
                onToggle={(v) => toggleIn('characters', v)} />
            </Row>
          )}
          <Row label="活動類型（可多選）">
            <ChipGroup options={types.map(t => [t, t])} values={filters.types}
              onToggle={(v) => toggleIn('types', v)} />
          </Row>
          {venues.length > 0 && (
            <Row label="場館（可多選）">
              <ChipGroup options={venues.map(v => [v, v])} values={filters.venues}
                onToggle={(v) => toggleIn('venues', v)} />
            </Row>
          )}
          {cities.length > 0 && (
            <Row label="城市（可多選）">
              <ChipGroup options={cities.map(c => [c, c])} values={filters.cities}
                onToggle={(v) => toggleIn('cities', v)} />
            </Row>
          )}
          <Row label="全團">
            <ChipGroup options={[['全部', 'all'], ['僅全團', 'full']]}
              value={filters.fullBand} onChange={(v) => onChange({ fullBand: v })} single />
          </Row>
        </div>

        <div className="px-5 sm:px-6 py-3.5 border-t border-dream-line dark:border-white/10"
          style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}>
          <button className="btn-primary w-full sm:w-auto !h-11" onClick={onClose}>
            顯示 {resultCount} 筆結果
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <div className="text-[14px] font-bold text-dream-faint mb-2">{label}</div>
      <div>{children}</div>
    </div>
  )
}

// single 模式用 value/onChange；多選模式用 values(array)/onToggle
// 選項超過門檻時（聲優、場館…）只先顯示前 N 個並附搜尋框，
// 已選的置頂，其餘收在「展開」後面。
function ChipGroup({ options, value, onChange, values, onToggle, colored, single, initial = 8 }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const searchable = !single && options.length > 12
  const picked = values || []

  const filtered = q
    ? options.filter(([label, val]) => `${label} ${val}`.toLowerCase().includes(q.toLowerCase()))
    : options
  // 已選的排到最前，才不會勾完就被收進「展開」裡看不見
  const ordered = single ? filtered : [...filtered].sort((a, b) => (picked.includes(b[1]) ? 1 : 0) - (picked.includes(a[1]) ? 1 : 0))
  const collapsed = searchable && !open && !q
  const shown = collapsed ? ordered.slice(0, Math.max(initial, picked.length)) : ordered
  const hidden = ordered.length - shown.length

  return (
    <div>
      {searchable && (
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={`在 ${options.length} 個選項中找…`}
          className="dream-input !py-1.5 !text-[14px] mb-2.5"
        />
      )}
      <div className="flex flex-wrap gap-2">
        {shown.map(([label, val]) => {
          const active = single ? String(value) === String(val) : picked.includes(val)
          const m = colored && val !== 'all' ? bandMeta(val) : null
          return (
            <button key={val} className={`pill ${active ? 'pill-active' : ''}`}
              onClick={() => (single ? onChange(val) : onToggle(val))}>
              {m && <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />}
              {label}
            </button>
          )
        })}
        {hidden > 0 && (
          <button className="pill !text-bloom-indigo !border-dashed" onClick={() => setOpen(true)}>
            還有 {hidden} 個 <Icon n="chevron-down" className="text-[10px]" />
          </button>
        )}
        {searchable && open && !q && (
          <button className="pill !text-dream-faint" onClick={() => setOpen(false)}>收合</button>
        )}
        {q && shown.length === 0 && (
          <span className="text-[14px] text-dream-faint py-1.5">找不到「{q}」</span>
        )}
      </div>
    </div>
  )
}

