import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { rootGroup, bandMeta } from '../utils/bands.js'
import { uniqueCharacters, uniqueVenues, uniqueCities } from '../utils/derive.js'
import { isUrgent, URGENT_LABEL } from '../utils/urgency.js'
import { buildAppliedChips, removeChipPatch } from '../utils/filters.js'
import Icon from './Icon.jsx'
import FilterSheet from './FilterSheet.jsx'
import Segmented from './Segmented.jsx'

function uniq(arr) { return [...new Set(arr)] }

const TIMEFRAMES = [['全部', 'all'], ['即將', 'upcoming'], ['已結束', 'past'], ['今年', 'thisYear'], ['本月', 'thisMonth']]
const ORDERS = [['日期↑', 'date-asc'], ['日期↓', 'date-desc'], ['人次', 'attendance'], ['編號', 'number']]
const VIEWS = [
  ['卡片', 'cards', 'grid'],
  ['時間軸', 'timeline', 'bars-staggered'],
  ['總表', 'table', 'table'],
]
// 工具列只留兩種常用檢視；總表是給要對資料的人用的，收進「全部篩選」。
// 已經在總表裡的時候要把它顯示出來，不然沒有路可以切回去。
const mainViews = (view) => (view === 'table' ? VIEWS : VIEWS.slice(0, 2))

// 進階篩選維度：收在「全部篩選」抽屜裡，不佔工具列
const ADV_KEYS = ['year', 'groups', 'people', 'characters', 'types', 'venues', 'cities', 'fullBand']

// variant='bar'（預設，內容上方橫條）／'sidebar'（xl 以上的左側常駐工作台）
export default function FilterPanel({ events, filters, onChange, onReset, resultCount, variant = 'bar', onExportIcs }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const side = variant === 'sidebar'

  const advCount =
    (filters.year !== 'all' ? 1 : 0) +
    (filters.fullBand !== 'all' ? 1 : 0) +
    ['groups', 'people', 'characters', 'types', 'venues', 'cities'].reduce((n, k) => n + (filters[k]?.length || 0), 0)

  // 手機的篩選鈕要顯示「現在有幾個條件生效」，所以連快篩也要算進去
  const quickCount =
    (filters.category !== 'all' ? 1 : 0) +
    (filters.timeframe !== 'all' ? 1 : 0) +
    (filters.attended !== 'all' ? 1 : 0) +
    (filters.photos !== 'all' ? 1 : 0) +
    (filters.urgent !== 'all' ? 1 : 0)
  const mobileCount = advCount + quickCount

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

  // ---------- sidebar：標題與結果數一起收進側欄 ----------
  if (side) {
    return (
      <div className="glass p-4 flex flex-col gap-3.5">
        <div>
          <div className="eyebrow"><Icon n="grid" className="text-[10px]" /> Collection</div>
          <h2 className="font-display font-bold text-[26px] text-dream-ink leading-tight mt-1.5">活動圖鑑</h2>
          <div className="mt-1.5 text-[14px] text-dream-faint" aria-live="polite">
            <span className="font-display font-bold text-[18px] text-bloom-indigo">{resultCount}</span> 筆結果
          </div>
        </div>

        <SearchBox filters={filters} onChange={onChange} resultCount={resultCount} />
        <Segmented full value={filters.category} onChange={(v) => onChange({ category: v })}
          options={[['全部', 'all'], ['本體', '本體'], ['個人', '擦邊']]} />
        <Segmented full value={filters.view} onChange={(v) => onChange({ view: v })} options={mainViews(filters.view)} />

        <span className="h-px bg-dream-line dark:bg-white/10" />

        <div className="flex flex-wrap gap-2">
          <TimeframePills filters={filters} onChange={onChange} />
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickPills filters={filters} onChange={onChange} advCount={advCount} onOpenSheet={openSheet} onExportIcs={onExportIcs} hasUrgent={hasUrgent} />
        </div>

        <label className="flex items-center gap-2 text-[14px] text-dream-faint">
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
          <div className="text-[14px] text-dream-faint mt-1">筆結果</div>
        </div>
      </div>

      {/* 單列工具列：搜尋 + 本體/個人 + 檢視 */}
      <div className="glass p-4 sm:p-5 py-3 sm:py-5">
        {/* 桌機：搜尋 ＋ 兩組切換排成一列 */}
        <div className="hidden sm:grid lg:grid-cols-[1fr_auto_auto] gap-3 items-center">
          <SearchBox filters={filters} onChange={onChange} resultCount={resultCount} />
          <Segmented value={filters.category} onChange={(v) => onChange({ category: v })}
            options={[['全部', 'all'], ['本體', '本體'], ['個人', '擦邊']]} />
          <Segmented value={filters.view} onChange={(v) => onChange({ view: v })} options={mainViews(filters.view)} />
        </div>

        {/* 手機：一列搞定 —— 搜尋框 ＋ 一顆篩選鈕。
            把七八個 pill 攤在畫面上是桌機的做法，手機那樣做會吃掉半個螢幕，
            而且橫滑列永遠有東西被切在邊界。條件全部收進 Bottom Sheet。 */}
        <div className="sm:hidden flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <SearchBox filters={filters} onChange={onChange} resultCount={resultCount} compact />
          </div>
          <button onClick={openSheet}
            aria-label={mobileCount ? `篩選，目前 ${mobileCount} 個條件` : '篩選'}
            className={`shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-[14px] font-medium transition-colors ${
              mobileCount
                ? 'bg-bloom-indigo text-white'
                : 'border border-dream-line text-dream-sub dark:border-white/15'}`}>
            <Icon n="sliders" className="text-[12px]" />
            篩選
            {mobileCount > 0 && (
              <span className="grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/25 text-[14px] font-bold tabular-nums">
                {mobileCount}
              </span>
            )}
          </button>
        </div>

        {/* 桌機：常用快篩攤開排 */}
        <div className="hidden sm:flex mt-3 items-center gap-2 flex-wrap">
          <TimeframePills filters={filters} onChange={onChange} />
          <span className="shrink-0 w-px h-5 bg-dream-line mx-1" />
          <QuickPills filters={filters} onChange={onChange} advCount={advCount} onOpenSheet={openSheet} onExportIcs={onExportIcs} hasUrgent={hasUrgent} />
          <span className="shrink-0 sm:ml-auto flex items-center gap-2">
            <span className="hidden sm:inline text-[14px] text-dream-faint">排序</span>
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
// 清單內搜尋。刻意跟頂部工具列那顆放大鏡講不同的話 ——
// 那顆是「跳到某個頁面」，這裡是「在這批活動裡過濾」，
// placeholder 與右側的即時筆數都是在強調這件事。
function SearchBox({ filters, onChange, resultCount, compact }) {
  const has = !!filters.search
  return (
    <div className="relative">
      <span className={`absolute ${compact ? 'left-3' : 'left-3.5'} top-1/2 -translate-y-1/2 text-dream-faint`}>
        <Icon n="magnifying-glass" className={compact ? 'text-[12px]' : ''} />
      </span>
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        aria-label="在活動清單裡搜尋"
        className={`dream-input ${compact ? '!h-10 !text-[14px] !pl-9 !pr-24' : '!pl-10'} ${has && !compact ? '!pr-24' : ''}`}
        placeholder={compact ? '在活動裡搜尋…' : '在這些活動裡搜尋聲優、樂團、城市…'}
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
      />
      {has && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <span aria-live="polite" className="text-[14px] font-medium text-dream-faint tabular-nums">
            {resultCount} 筆
          </span>
          <button type="button" onClick={() => onChange({ search: '' })} aria-label="清除搜尋"
            className="grid place-items-center w-7 h-7 rounded-full text-dream-faint hover:text-dream-ink hover:bg-dream-line/60 dark:hover:bg-white/10">
            <Icon n="xmark" className="text-[11px]" />
          </button>
        </span>
      )}
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
      className={`rounded-md border border-dream-line bg-white text-[14px] text-dream-ink px-2 py-1.5 dark:bg-white/5 ${className}`}
      value={filters.order} onChange={(e) => onChange({ order: e.target.value })}
    >
      {ORDERS.map(([l, v]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

function AppliedChips({ chips, filters, onChange, onReset }) {
  return (
    <>
      <span className="text-[14px] text-dream-faint self-center">已套用：</span>
      {chips.map(c => (
        <button key={c.key + c.val} className="pill !text-bloom-indigo"
          onClick={() => onChange(removeChipPatch(filters, c))}>
          {c.label} <Icon n="xmark" className="text-[10px]" />
        </button>
      ))}
      <button className="pill !text-bloom-rose" onClick={onReset}>清除全部</button>
    </>
  )
}

