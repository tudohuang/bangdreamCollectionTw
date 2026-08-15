import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { rootGroup, bandMeta } from '../utils/bands.js'
import { uniqueCharacters, uniqueVenues, uniqueCities } from '../utils/derive.js'
import { isUrgent, URGENT_LABEL } from '../utils/urgency.js'
import Icon from './Icon.jsx'

function uniq(arr) { return [...new Set(arr)] }

const TIMEFRAMES = [['全部', 'all'], ['即將', 'upcoming'], ['已結束', 'past'], ['今年', 'thisYear'], ['本月', 'thisMonth']]
const ORDERS = [['日期↑', 'date-asc'], ['日期↓', 'date-desc'], ['人次', 'attendance'], ['編號', 'number']]
const VIEWS = [
  ['卡片', 'cards', 'grid'],
  ['時間軸', 'timeline', 'bars-staggered'],
  ['總表', 'table', 'table'],
]

// 進階篩選維度（收進「全部篩選」抽屜，不佔工具列）
const ADV_KEYS = ['year', 'groups', 'people', 'characters', 'types', 'venues', 'cities', 'fullBand']

// variant='bar'（預設，內容上方橫條）／'sidebar'（xl 以上的左側常駐工作台）
export default function FilterPanel({ events, filters, onChange, onReset, resultCount, variant = 'bar', onExportIcs }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const side = variant === 'sidebar'

  const advCount =
    (filters.year !== 'all' ? 1 : 0) +
    (filters.fullBand !== 'all' ? 1 : 0) +
    ['groups', 'people', 'characters', 'types', 'venues', 'cities'].reduce((n, k) => n + (filters[k]?.length || 0), 0)

  const chips = buildAppliedChips(filters)
  const openSheet = () => setSheetOpen(true)
  // 沒有緊急場次時就不擺這顆按鈕，平常的工具列不該長出用不到的東西
  const hasUrgent = useMemo(() => events.some(isUrgent), [events])

  // 一定要 portal 到 body：側欄是 position:sticky，它會建立 stacking context，
  // 浮層的 z-50 會被關在裡面，結果被後面的卡片蓋過去。
  const sheet = sheetOpen && typeof document !== 'undefined' && createPortal(
    <FilterSheet
      events={events}
      filters={filters}
      onChange={onChange}
      onClose={() => setSheetOpen(false)}
      onReset={() => {
        const patch = { year: 'all', fullBand: 'all' }
        for (const k of ['groups', 'people', 'characters', 'types', 'venues', 'cities']) patch[k] = []
        onChange(patch)
      }}
      resultCount={resultCount}
    />,
    document.body
  )

  // ---------- 側欄：標題與結果數也搬進來，左邊那條就是整個圖鑑的操作台 ----------
  if (side) {
    return (
      <div className="glass p-4 flex flex-col gap-3.5">
        <div>
          <div className="eyebrow"><Icon n="grid" className="text-[10px]" /> Collection</div>
          <h2 className="font-display font-bold text-[26px] text-dream-ink leading-tight mt-1.5">活動圖鑑</h2>
          <div className="mt-1.5 text-[12px] text-dream-faint" aria-live="polite">
            <span className="font-display font-bold text-[17px] text-bloom-indigo">{resultCount}</span> 筆結果
          </div>
        </div>

        <SearchBox filters={filters} onChange={onChange} />
        <Segmented full value={filters.category} onChange={(v) => onChange({ category: v })}
          options={[['全部', 'all'], ['本體', '本體'], ['個人', '擦邊']]} />
        <Segmented full value={filters.view} onChange={(v) => onChange({ view: v })} options={VIEWS} />

        <span className="h-px bg-dream-line dark:bg-white/10" />

        <div className="flex flex-wrap gap-2">
          <TimeframePills filters={filters} onChange={onChange} />
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickPills filters={filters} onChange={onChange} advCount={advCount} onOpenSheet={openSheet} onExportIcs={onExportIcs} hasUrgent={hasUrgent} />
        </div>

        <label className="flex items-center gap-2 text-[11px] text-dream-faint">
          排序
          <SortSelect filters={filters} onChange={onChange} className="flex-1" />
        </label>

        {chips.length > 0 && (
          <div className="pt-3 border-t border-dream-line dark:border-white/10 flex flex-wrap gap-2">
            <AppliedChips chips={chips} filters={filters} onChange={onChange} onReset={onReset} />
          </div>
        )}
        {sheet}
      </div>
    )
  }

  // ---------- 橫條：窄螢幕與其他情境 ----------
  return (
    <div className="mb-8">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <div className="eyebrow"><Icon n="grid" className="text-[10px]" /> Collection</div>
          <h2 className="section-h mt-1.5">活動圖鑑</h2>
        </div>
        <div className="text-right shrink-0" aria-live="polite">
          <div className="font-display text-2xl font-bold text-bloom-indigo leading-none">{resultCount}</div>
          <div className="text-[11px] text-dream-faint mt-1">筆結果</div>
        </div>
      </div>

      {/* 單列工具列：搜尋 + 本體/個人 + 檢視 */}
      <div className="glass p-4 sm:p-5">
        <div className="grid lg:grid-cols-[1fr_auto_auto] gap-3 items-center">
          <SearchBox filters={filters} onChange={onChange} />
          <Segmented value={filters.category} onChange={(v) => onChange({ category: v })}
            options={[['全部', 'all'], ['本體', '本體'], ['個人', '擦邊']]} />
          <Segmented value={filters.view} onChange={(v) => onChange({ view: v })} options={VIEWS} />
        </div>

        {/* 常用快篩 + 全部篩選 + 排序 */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TimeframePills filters={filters} onChange={onChange} />
          <span className="w-px h-5 bg-dream-line mx-1" />
          <QuickPills filters={filters} onChange={onChange} advCount={advCount} onOpenSheet={openSheet} onExportIcs={onExportIcs} hasUrgent={hasUrgent} />
          <span className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-dream-faint">排序</span>
            <SortSelect filters={filters} onChange={onChange} />
          </span>
        </div>

        {/* 已套用篩選 chip 列 */}
        {chips.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dream-line flex flex-wrap items-center gap-2">
            <AppliedChips chips={chips} filters={filters} onChange={onChange} onReset={onReset} />
          </div>
        )}
      </div>

      {sheet}
    </div>
  )
}

// ---- 兩種版型共用的控制項 ----
function SearchBox({ filters, onChange }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dream-faint"><Icon n="magnifying-glass" /></span>
      <input
        type="search"
        className="dream-input !pl-10"
        placeholder="搜尋聲優、樂團、活動、城市…"
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
      />
    </div>
  )
}

function TimeframePills({ filters, onChange }) {
  return TIMEFRAMES.map(([l, v]) => (
    <button key={v} className={`pill ${filters.timeframe === v ? 'pill-active' : ''}`}
      onClick={() => onChange({ timeframe: v })}>{l}</button>
  ))
}

function QuickPills({ filters, onChange, advCount, onOpenSheet, onExportIcs, hasUrgent }) {
  return (
    <>
      {hasUrgent && (
        <button
          className={`pill ${filters.urgent === 'yes' ? '!text-white !border-transparent' : '!text-rose-600 !border-rose-300'}`}
          style={filters.urgent === 'yes' ? { background: 'rgb(var(--c-urgent))' } : undefined}
          onClick={() => onChange({ urgent: filters.urgent === 'yes' ? 'all' : 'yes' })}>
          <Icon n="triangle-exclamation" className="text-[11px]" /> {URGENT_LABEL}
        </button>
      )}
      <button className={`pill ${filters.attended === 'yes' ? 'pill-active' : ''}`}
        onClick={() => onChange({ attended: filters.attended === 'yes' ? 'all' : 'yes' })}>
        <Icon n="circle-check" className="text-[11px]" /> 我去過
      </button>
      <button className={`pill ${filters.photos === 'yes' ? 'pill-active' : ''}`}
        onClick={() => onChange({ photos: filters.photos === 'yes' ? 'all' : 'yes' })}>
        <Icon n="images" className="text-[11px]" /> 有照片
      </button>
      <button className={`pill ${advCount ? '!border-bloom-indigo !text-bloom-indigo' : ''}`}
        onClick={onOpenSheet}>
        <Icon n="sliders" className="text-[11px]" /> 全部篩選{advCount ? `（${advCount}）` : ''}
      </button>
      {onExportIcs && (
        <button className="pill" onClick={onExportIcs} title="把目前篩選出來的場次存成 .ics 行事曆檔">
          <Icon n="calendar" className="text-[11px]" /> 匯出行事曆
        </button>
      )}
    </>
  )
}

function SortSelect({ filters, onChange, className = '' }) {
  return (
    <select
      className={`rounded-md border border-dream-line bg-white text-[13px] text-dream-ink px-2 py-1.5 dark:bg-white/5 ${className}`}
      value={filters.order} onChange={(e) => onChange({ order: e.target.value })}
    >
      {ORDERS.map(([l, v]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

function AppliedChips({ chips, filters, onChange, onReset }) {
  return (
    <>
      <span className="text-[11px] text-dream-faint self-center">已套用：</span>
      {chips.map(c => (
        <button key={c.key + c.val} className="pill !text-bloom-indigo"
          onClick={() => removeChip(filters, onChange, c)}>
          {c.label} <Icon n="xmark" className="text-[10px]" />
        </button>
      ))}
      <button className="pill !text-bloom-rose" onClick={onReset}>清除全部</button>
    </>
  )
}

// 「全部篩選」抽屜：手機從底部滑出（bottom sheet）、桌面置中對話框
function FilterSheet({ events, filters, onChange, onClose, onReset, resultCount }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl max-h-[86vh] sm:max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-dream-line dark:border-white/15"
        style={{ background: 'var(--modal-bg)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="全部篩選"
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-dream-line dark:border-white/10">
          <h3 className="font-display font-bold text-[16px] text-dream-ink flex items-center gap-2">
            <Icon n="sliders" className="text-bloom-indigo text-[13px]" /> 全部篩選
          </h3>
          <div className="flex items-center gap-2">
            <button className="text-[13px] text-dream-faint hover:text-bloom-rose" onClick={onReset}>重設</button>
            <button className="icon-btn" onClick={onClose} aria-label="關閉"><Icon n="xmark" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 sm:px-6 py-5 space-y-5">
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

        <div className="px-5 sm:px-6 py-3.5 border-t border-dream-line dark:border-white/10">
          <button className="btn-primary w-full sm:w-auto" onClick={onClose}>
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
      <div className="text-[11px] font-bold text-dream-faint mb-2">{label}</div>
      <div>{children}</div>
    </div>
  )
}

// single 模式用 value/onChange；多選模式用 values(array)/onToggle
function ChipGroup({ options, value, onChange, values, onToggle, colored, single }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([label, val]) => {
        const active = single ? String(value) === String(val) : (values || []).includes(val)
        const m = colored && val !== 'all' ? bandMeta(val) : null
        return (
          <button key={val} className={`pill ${active ? 'pill-active' : ''}`}
            onClick={() => (single ? onChange(val) : onToggle(val))}>
            {m && <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />}
            {label}
          </button>
        )
      })}
    </div>
  )
}

function Segmented({ value, onChange, options, full }) {
  return (
    <div className={`flex p-1 rounded-full bg-white border border-dream-line overflow-x-auto scrollbar-none max-w-full dark:bg-white/[.06] dark:border-white/15 ${full ? 'w-full' : ''}`}>
      {options.map(([l, v, icon]) => (
        <button key={v}
          className={`${full ? 'flex-1 justify-center' : 'shrink-0'} whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
            value === v
              ? 'bg-bloom-indigo text-white shadow-sm'
              : 'text-dream-sub hover:text-dream-ink hover:bg-dream-line/50 dark:hover:bg-white/10'}`}
          onClick={() => onChange(v)}>
          {icon && <Icon n={icon} className="text-[11px] opacity-80" />}
          {l}
        </button>
      ))}
    </div>
  )
}

// ---- 已套用篩選 chips ----
const SINGLE_LABELS = {
  category: { '本體': '本體', '擦邊': '個人' },
  fullBand: { full: '僅全團' },
  attended: { yes: '我去過' },
  photos: { yes: '有照片' },
  urgent: { yes: URGENT_LABEL },
  timeframe: { upcoming: '即將', past: '已結束', thisYear: '今年', thisMonth: '本月' },
}
function buildAppliedChips(f) {
  const chips = []
  if (f.year !== 'all') chips.push({ key: 'year', val: f.year, label: `${f.year} 年` })
  for (const [k, val] of [['category', f.category], ['fullBand', f.fullBand], ['attended', f.attended], ['photos', f.photos], ['urgent', f.urgent], ['timeframe', f.timeframe]]) {
    if (val && val !== 'all') chips.push({ key: k, val, label: SINGLE_LABELS[k]?.[val] || val })
  }
  for (const k of ['groups', 'people', 'characters', 'types', 'venues', 'cities']) {
    for (const v of (f[k] || [])) chips.push({ key: k, val: v, label: v })
  }
  if (f.search) chips.push({ key: 'search', val: f.search, label: `「${f.search}」` })
  return chips
}
function removeChip(filters, onChange, c) {
  if (['groups', 'people', 'characters', 'types', 'venues', 'cities'].includes(c.key)) {
    onChange({ [c.key]: (filters[c.key] || []).filter(v => v !== c.val) })
  } else if (c.key === 'search') {
    onChange({ search: '' })
  } else {
    onChange({ [c.key]: 'all' })
  }
}
