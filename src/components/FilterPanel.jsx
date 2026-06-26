import { useMemo, useState } from 'react'
import { rootGroup, bandMeta } from '../utils/bands.js'
import { uniqueCharacters, uniqueVenues, uniqueCities } from '../utils/derive.js'
import Icon from './Icon.jsx'

function uniq(arr) { return [...new Set(arr)] }

const TIMEFRAMES = [['全部', 'all'], ['即將', 'upcoming'], ['已結束', 'past'], ['今年', 'thisYear'], ['本月', 'thisMonth']]
const ORDERS = [['日期↑', 'date-asc'], ['日期↓', 'date-desc'], ['人次', 'attendance'], ['編號', 'number']]
const VIEWS = [['卡片', 'cards'], ['回憶牆', 'gallery'], ['時間軸', 'timeline'], ['年份', 'year'], ['月曆', 'calendar'], ['總表', 'table']]

export default function FilterPanel({ events, filters, onChange, onReset, resultCount }) {
  const [open, setOpen] = useState(false)

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

  const chips = buildAppliedChips(filters)

  return (
    <div className="mb-8">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <div className="eyebrow"><Icon n="star" className="text-[10px]" /> Collection</div>
          <h2 className="section-h mt-1.5">活動圖鑑牆</h2>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-2xl font-bold text-bloom-indigo leading-none">{resultCount}</div>
          <div className="text-[11px] text-dream-faint mt-1">筆結果</div>
        </div>
      </div>

      <div className="glass p-4 sm:p-5">
        {/* 搜尋 + 本體/個人 + 檢視 */}
        <div className="grid lg:grid-cols-[1fr_auto_auto] gap-3 items-center">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dream-faint"><Icon n="magnifying-glass" /></span>
            <input
              type="search"
              className="dream-input !pl-10"
              placeholder="搜尋聲優、樂團、活動、城市…（愛美 / Aimi / Roselia）"
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
            />
          </div>
          <Segmented value={filters.category} onChange={(v) => onChange({ category: v })}
            options={[['全部', 'all'], ['本體', '本體'], ['個人', '擦邊']]} />
          <Segmented value={filters.view} onChange={(v) => onChange({ view: v })} options={VIEWS} />
        </div>

        {/* 時間框 + 排序 + 收藏 */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {TIMEFRAMES.map(([l, v]) => (
            <button key={v} className={`pill ${filters.timeframe === v ? 'pill-active' : ''}`}
              onClick={() => onChange({ timeframe: v })}>{l}</button>
          ))}
          <span className="w-px h-5 bg-dream-line mx-1" />
          <button className={`pill ${filters.attended === 'yes' ? 'pill-active' : ''}`}
            onClick={() => onChange({ attended: filters.attended === 'yes' ? 'all' : 'yes' })}>
            <Icon n="circle-check" className="text-[11px]" /> 我去過
          </button>
          <span className="w-px h-5 bg-dream-line mx-1" />
          <span className="text-[11px] text-dream-faint">排序</span>
          <select
            className="rounded-md border border-dream-line bg-white text-[13px] text-dream-ink px-2 py-1.5 dark:bg-white/5"
            value={filters.order} onChange={(e) => onChange({ order: e.target.value })}
          >
            {ORDERS.map(([l, v]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* 已套用篩選 chip 列 */}
        {chips.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dream-line flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-dream-faint">已套用：</span>
            {chips.map(c => (
              <button key={c.key + c.val} className="pill !text-bloom-indigo"
                onClick={() => removeChip(filters, onChange, c)}>
                {c.label} <Icon n="xmark" className="text-[10px]" />
              </button>
            ))}
            <button className="pill !text-bloom-rose" onClick={onReset}>清除全部</button>
          </div>
        )}

        {/* 展開更多 */}
        <div className="mt-3 pt-3 border-t border-dream-line">
          <button className="inline-flex items-center gap-2 text-[13px] font-semibold text-bloom-indigo hover:underline"
            onClick={() => setOpen(o => !o)} aria-expanded={open}>
            <Icon n="chevron-down" className={`text-[11px] transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? '收起篩選' : '更多篩選（樂團 / 聲優 / 角色 / 年份…）'}
          </button>

          {open && (
            <div className="mt-5 space-y-5">
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
          )}
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

function Segmented({ value, onChange, options }) {
  return (
    <div className="flex p-0.5 rounded-md bg-white border border-dream-line overflow-x-auto scrollbar-none max-w-full">
      {options.map(([l, v]) => (
        <button key={v}
          className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
            value === v ? 'bg-bloom-indigo text-white' : 'text-dream-sub hover:text-dream-ink'}`}
          onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  )
}

// ---- 已套用篩選 chips ----
const SINGLE_LABELS = {
  category: { '本體': '本體', '擦邊': '個人' },
  fullBand: { full: '僅全團' },
  attended: { yes: '我去過' },
  timeframe: { upcoming: '即將', past: '已結束', thisYear: '今年', thisMonth: '本月' },
}
function buildAppliedChips(f) {
  const chips = []
  if (f.year !== 'all') chips.push({ key: 'year', val: f.year, label: `${f.year} 年` })
  for (const [k, val] of [['category', f.category], ['fullBand', f.fullBand], ['attended', f.attended], ['timeframe', f.timeframe]]) {
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
