import { useMemo, useState } from 'react'
import { buildAppliedChips } from '../utils/filters.js'
import { todayStr } from '../utils/datetime.js'
import AgendaRow, { AgendaList } from './AgendaRow.jsx'
import EventWall from './EventWall.jsx'
import FilterSheet from './FilterSheet.jsx'
import Icon from './Icon.jsx'

// 資料庫：考古用。
// 年份是最常用的軸，所以整排攤在最上面一按就到；本體／個人、即將／已結束是第二排的快篩；
// 其餘（樂團、聲優、場館、類型…）收進「篩選」。搜尋在頁首，打字就即時篩這一頁。
// 預設是列表（一列一場、讀得快），封面牆當切換選項。
export default function ArchivePage({ events, filtered, fuzzy, filters, onChange, onReset, onSelect,
  attended, onToggleAttended, milestones }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const today = todayStr()
  const years = useMemo(() => [...new Set(events.map(e => e.year).filter(Boolean))].sort((a, b) => b - a), [events])
  const chips = buildAppliedChips(filters)
  // 「篩選」鈕上的數字只算收在面板裡的條件；攤在外面的快篩看得到，不用重複算
  const hidden = ['groups', 'people', 'characters', 'types', 'venues', 'cities'].reduce((n, k) => n + (filters[k]?.length || 0), 0)
    + (filters.fullBand !== 'all') + (filters.attended !== 'all') + (filters.photos !== 'all') + (filters.urgent !== 'all')
  const cards = filters.view === 'cards'
  // 總表（對資料用）與舊網址的時間軸還是交給原本的元件
  const legacy = filters.view === 'table' || filters.view === 'timeline'
  const byYear = filters.order.startsWith('date')

  const groups = useMemo(() => {
    if (!byYear) return [[null, filtered]]
    const map = new Map()
    for (const e of filtered) {
      const y = e.year || '未定'
      if (!map.has(y)) map.set(y, [])
      map.get(y).push(e)
    }
    return [...map]
  }, [filtered, byYear])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-end justify-between gap-4 mb-4">
        <h1 className="font-display font-bold text-[32px] leading-none text-dream-ink">資料庫</h1>
        <div className="flex items-center gap-1 rounded-full border border-dream-line p-0.5 dark:border-white/15" role="group" aria-label="檢視方式">
          {[['list', '列表', 'bars-staggered'], ['cards', '封面', 'images']].map(([v, label, icon]) => {
            const on = filters.view === v
            return (
              <button key={v} onClick={() => onChange({ view: v })} aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[14px] font-medium transition-colors ${
                  on ? 'bg-dream-ink text-white dark:bg-white dark:text-[#0b0a24]' : 'text-dream-sub hover:text-dream-ink'}`}>
                <Icon n={icon} className="text-[11px]" />{label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 第一排：年份 */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        <Chip on={filters.year === 'all'} onClick={() => onChange({ year: 'all' })}>全部</Chip>
        {years.map(y => (
          <Chip key={y} on={filters.year === String(y)} onClick={() => onChange({ year: filters.year === String(y) ? 'all' : String(y) })}>
            <span className="tabular-nums">{y}</span>
          </Chip>
        ))}
      </div>

      {/* 第二排：快篩＋篩選 */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        <Chip on={filters.timeframe === 'upcoming'} onClick={() => onChange({ timeframe: filters.timeframe === 'upcoming' ? 'all' : 'upcoming' })}>即將舉行</Chip>
        <Chip on={filters.timeframe === 'past'} onClick={() => onChange({ timeframe: filters.timeframe === 'past' ? 'all' : 'past' })}>已結束</Chip>
        <span aria-hidden className="shrink-0 w-px h-5 bg-dream-line dark:bg-white/15 mx-1" />
        <Chip on={filters.category === '本體'} onClick={() => onChange({ category: filters.category === '本體' ? 'all' : '本體' })}>本體</Chip>
        <Chip on={filters.category === '擦邊'} onClick={() => onChange({ category: filters.category === '擦邊' ? 'all' : '擦邊' })}>個人</Chip>
        <span aria-hidden className="shrink-0 w-px h-5 bg-dream-line dark:bg-white/15 mx-1" />
        <Chip on={hidden > 0} onClick={() => setSheetOpen(true)}>
          <Icon n="sliders" className="text-[11px]" /> 篩選{hidden > 0 && <span className="tabular-nums"> {hidden}</span>}
        </Chip>
      </div>

      {/* 結果列：幾筆、搜尋字、清除 */}
      <div className="mt-4 mb-3 px-1 flex items-center justify-between gap-3 text-[14px]">
        <p className="text-dream-sub min-w-0 truncate">
          <span className="font-semibold text-dream-ink tabular-nums">{filtered.length}</span> 筆
          {filters.search && <> · 搜尋「{filters.search}」</>}
          {fuzzy && filtered.length > 0 && <span className="text-dream-faint"> · 沒有完全符合，列出相近的</span>}
        </p>
        {chips.length > 0 && (
          <button onClick={onReset} className="shrink-0 font-semibold text-bloom-indigo hover:underline">清除條件</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dream-line dark:border-white/15 px-5 py-12 text-center">
          <p className="text-[16px] text-dream-sub">沒有符合的活動。</p>
          <button onClick={onReset} className="mt-3 text-[14px] font-semibold text-bloom-indigo hover:underline">清除條件</button>
        </div>
      ) : cards || legacy ? (
        <EventWall events={filtered} allEvents={events} milestones={milestones} view={filters.view}
          attended={attended} onToggleAttended={onToggleAttended} onSelect={onSelect} onReset={onReset}
          groupByYear={byYear} suggestions={[]} search={filters.search} />
      ) : (
        <div className="space-y-6">
          {groups.map(([y, list]) => (
            <section key={y ?? 'all'}>
              {y != null && (
                <h2 className="sticky top-[var(--sticky-top)] z-10 -mx-1 px-2 py-2 mb-1 flex items-baseline gap-2 bg-dream-bg/95 backdrop-blur-sm">
                  <span className="font-display font-bold text-[18px] text-dream-ink tabular-nums">{y}</span>
                  <span className="text-[14px] text-dream-faint tabular-nums">{list.length} 場</span>
                </h2>
              )}
              <AgendaList>
                {list.map(e => <AgendaRow key={e.id} event={e} onSelect={onSelect} today={today} showYear={y == null} />)}
              </AgendaList>
            </section>
          ))}
        </div>
      )}

      {sheetOpen && (
        <FilterSheet events={events} filters={filters} onChange={onChange}
          onClose={() => setSheetOpen(false)} onReset={onReset} resultCount={filtered.length} />
      )}
    </div>
  )
}

function Chip({ on, onClick, children }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[14px] font-medium border transition-colors ${
        on ? 'bg-dream-ink text-white border-dream-ink dark:bg-white dark:text-[#0b0a24] dark:border-white'
           : 'bg-white text-dream-sub border-dream-line hover:text-dream-ink hover:border-dream-faint dark:bg-white/[.04] dark:border-white/15'}`}>
      {children}
    </button>
  )
}
