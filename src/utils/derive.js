// 從活動資料衍生的維度：城市、角色、場館、聲優 roster
import { parseGroup, rootGroup } from './bands.js'

const CITY_KEYS = ['台北', '臺北', '新北', '桃園', '台中', '臺中', '台南', '臺南', '高雄', '新竹', '基隆', '宜蘭']

// 城市：優先用手填欄位，否則從場館/標題猜（台/臺統一成台）
export function detectCity(e) {
  if (e.city) return e.city.replace('臺', '台')
  const hay = `${e.venue || ''} ${e.title || ''}`
  for (const c of CITY_KEYS) {
    if (hay.includes(c)) return c.replace('臺', '台')
  }
  return ''
}

// 一個活動牽涉到的角色（團體／關聯 裡「／」後面的部分）
export function eventCharacters(e) {
  return (e.relatedGroups || []).flatMap(g => parseGroup(g).parts)
}

export function uniqueCharacters(events) {
  return [...new Set(events.flatMap(eventCharacters))].sort()
}

export function uniqueVenues(events) {
  return [...new Set(events.map(e => e.venue).filter(Boolean))].sort()
}

export function uniqueCities(events) {
  return [...new Set(events.map(detectCity).filter(Boolean))].sort()
}

// 聲優 → { band, char } 推測表（取單人單團且帶角色的場次最可靠）
export function buildRoster(events) {
  const map = {}
  for (const e of events) {
    const ppl = e.people || [], grp = e.relatedGroups || []
    if (ppl.length === 1 && grp.length === 1) {
      const { band, parts } = parseGroup(grp[0])
      if (parts.length && !map[ppl[0]]) {
        map[ppl[0]] = { band: rootGroup(band), char: parts[parts.length - 1] }
      }
    }
  }
  return map
}
