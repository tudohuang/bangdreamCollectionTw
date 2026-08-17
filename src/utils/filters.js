// 「已套用了哪些篩選」的單一來源：篩選面板與卡牆上的結果摘要條共用同一份，
// 兩邊的用詞和移除行為才不會各講各的。
import { URGENT_LABEL } from './urgency.js'

const SINGLE_LABELS = {
  category: { '本體': '本體', '擦邊': '個人' },
  fullBand: { full: '僅全團' },
  attended: { yes: '我去過' },
  photos: { yes: '有照片' },
  urgent: { yes: URGENT_LABEL },
  timeframe: { upcoming: '即將', past: '已結束', thisYear: '今年', thisMonth: '本月' },
}

export const MULTI_KEYS = ['groups', 'people', 'characters', 'types', 'venues', 'cities']

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

// 回傳「拿掉這顆 chip」要送出的 patch
export function removeChipPatch(filters, c) {
  if (MULTI_KEYS.includes(c.key)) return { [c.key]: (filters[c.key] || []).filter(v => v !== c.val) }
  if (c.key === 'search') return { search: '' }
  return { [c.key]: 'all' }
}
