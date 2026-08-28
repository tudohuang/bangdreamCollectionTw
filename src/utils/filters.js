// 圖鑑頁的篩選狀態：預設值、套用、排序，以及與網址參數的互轉。
// 全部是純函式，App 只負責把 state 傳進來。
import { rootGroup } from './bands.js'
import { eventCharacters, detectCity, canonicalVenue } from './derive.js'
import { coverOf } from './media.js'
import { searchEvents } from './search.js'
import { eventStatus, todayStr } from './datetime.js'
import { isUrgent, URGENT_LABEL } from './urgency.js'

export const DEFAULT_FILTERS = {
  year: 'all',
  groups: [], people: [], characters: [], types: [], venues: [], cities: [],
  category: 'all',     // all | 本體 | 擦邊
  fullBand: 'all',     // all | full
  attended: 'all',     // all | yes
  photos: 'all',       // all | yes
  urgent: 'all',       // all | yes
  timeframe: 'all',    // all | upcoming | past | thisYear | thisMonth
  search: '',
  view: 'cards',       // cards | timeline | table
  order: 'date-asc',   // date-asc | date-desc | attendance | number
}

export const VIEW_SET = ['cards', 'timeline', 'table']
export const MULTI_KEYS = ['groups', 'people', 'characters', 'types', 'venues', 'cities']
const SINGLE_KEYS = ['year', 'category', 'fullBand', 'attended', 'photos', 'urgent', 'timeframe', 'search', 'view', 'order']

// 回傳陣列（跟以前一樣）。要知道是不是走了容錯，用 applyFiltersDetailed。
export function applyFilters(events, f, attended) {
  return applyFiltersDetailed(events, f, attended).list
}

export function applyFiltersDetailed(events, f, attended) {
  const today = todayStr()
  const now = new Date()
  const narrowed = events.filter(e => {
    if (f.year !== 'all' && e.year !== Number(f.year)) return false
    if (f.groups.length && !f.groups.some(g => (e.relatedGroups || []).some(rg => rootGroup(rg) === g))) return false
    if (f.people.length && !f.people.some(p => (e.people || []).includes(p))) return false
    if (f.characters.length && !f.characters.some(c => eventCharacters(e).includes(c))) return false
    if (f.types.length && !f.types.includes(e.type)) return false
    if (f.venues.length && !f.venues.includes(canonicalVenue(e.venue))) return false
    if (f.cities.length && !f.cities.includes(detectCity(e))) return false
    if (f.category !== 'all' && e.category !== f.category) return false
    if (f.fullBand === 'full' && !e.isFullBand) return false
    if (f.attended === 'yes' && !attended.has(e.id)) return false
    if (f.photos === 'yes' && !coverOf(e)) return false
    if (f.urgent === 'yes' && !isUrgent(e)) return false
    if (f.timeframe !== 'all') {
      const st = eventStatus(e, today)
      if (f.timeframe === 'upcoming' && !(st === 'upcoming' || st === 'ongoing')) return false
      if (f.timeframe === 'past' && st !== 'past') return false
      if (f.timeframe === 'thisYear' && e.year !== now.getFullYear()) return false
      if (f.timeframe === 'thisMonth' && (e.year !== now.getFullYear() || e.month !== now.getMonth() + 1)) return false
    }
    return true
  })
  // 搜尋放最後：先看精準有沒有命中，全部落空才放寬到錯字容錯。
  // 有結果的時候放寬只會稀釋好結果 —— 打「愛美」的人不想看到「愛実」。
  return searchEvents(narrowed, f.search)
}

// 沒有日期的場次（日期未定）一律排到最後，不要因為空字串被排到最前面
const byDate = (dir) => (x, y) => {
  const dx = x.startDate || '', dy = y.startDate || ''
  if (!dx && !dy) return 0
  if (!dx) return 1
  if (!dy) return -1
  return dir === 'desc' ? dy.localeCompare(dx) : dx.localeCompare(dy)
}

export function orderEvents(events, order) {
  const list = [...events]
  if (order === 'date-desc') return list.sort(byDate('desc'))
  if (order === 'attendance') return list.sort((x, y) => (y.attendanceCount || 0) - (x.attendanceCount || 0))
  if (order === 'number') return list.sort((x, y) => (x.number || 0) - (y.number || 0))
  return list.sort(byDate('asc'))
}

// ---- 網址參數 ----
export function filtersToParams(f) {
  const params = {}
  for (const k of MULTI_KEYS) if (f[k]?.length) params[k] = f[k].join(',')
  for (const k of SINGLE_KEYS) if (f[k] && f[k] !== DEFAULT_FILTERS[k]) params[k] = f[k]
  return params
}

export function paramsToFilters(params) {
  const f = {}
  for (const k of MULTI_KEYS) if (params[k]) f[k] = params[k].split(',').filter(Boolean)
  for (const k of SINGLE_KEYS) if (params[k] != null) f[k] = params[k]
  // 舊網址的 gallery / year / calendar 檢視已經合併掉了
  if (f.view && !VIEW_SET.includes(f.view)) f.view = 'cards'
  return f
}

// ---- 已套用的條件 ----
// 篩選面板與卡牆上的摘要條共用這一份，兩邊的用詞與移除行為才會一致。
const SINGLE_LABELS = {
  category: { '本體': '本體', '擦邊': '個人' },
  fullBand: { full: '僅全團' },
  attended: { yes: '我去過' },
  photos: { yes: '有照片' },
  urgent: { yes: URGENT_LABEL },
  timeframe: { upcoming: '即將', past: '已結束', thisYear: '今年', thisMonth: '本月' },
}

export function buildAppliedChips(f) {
  const chips = []
  if (f.year !== 'all') chips.push({ key: 'year', val: f.year, label: `${f.year} 年` })
  for (const k of ['category', 'fullBand', 'attended', 'photos', 'urgent', 'timeframe']) {
    const val = f[k]
    if (val && val !== 'all') chips.push({ key: k, val, label: SINGLE_LABELS[k]?.[val] || val })
  }
  for (const k of MULTI_KEYS) {
    for (const v of (f[k] || [])) chips.push({ key: k, val: v, label: v })
  }
  if (f.search) chips.push({ key: 'search', val: f.search, label: `「${f.search}」` })
  return chips
}

export function removeChipPatch(filters, chip) {
  if (MULTI_KEYS.includes(chip.key)) return { [chip.key]: (filters[chip.key] || []).filter(v => v !== chip.val) }
  if (chip.key === 'search') return { search: '' }
  return { [chip.key]: 'all' }
}
