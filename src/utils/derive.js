// 從活動資料衍生的維度：城市、角色、場館、聲優 roster
import { parseGroup, rootGroup } from './bands.js'
import { VENUE_CITY_KEYWORDS } from '../data/venues.js'

const CITY_KEYS = ['台北', '臺北', '新北', '桃園', '台中', '臺中', '台南', '臺南', '高雄', '新竹', '基隆', '宜蘭']
const norm = (c) => c.replace('臺', '台')

// 城市：Sheet 的「城市」欄 > 場館/標題裡直接出現的城市名 > 場館關鍵字對照表。
// 光靠字串比對會漏掉一半（MOONDOG、TICC、南港展覽館… 名字裡沒有城市），所以要有第三層。
export function detectCity(e) {
  if (e.city) return norm(e.city)

  const hay = `${e.venue || ''} ${e.title || ''}`
  // 「新北」要比「台北」先判，否則 Zepp New Taipei 會被 Taipei 規則吃掉
  if (hay.includes('新北')) return '新北'
  for (const c of CITY_KEYS) {
    if (hay.includes(c)) return norm(c)
  }

  const venue = e.venue || ''
  for (const [kw, city] of VENUE_CITY_KEYWORDS) {
    if (venue.includes(kw)) return city
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

// 聲優屬於哪個團：以「名冊」分頁為準。
//
// 為什麼不能只靠活動表推：BanG Dream! Special LIVE 這種聯合場次，一列裡塞了
// 兩團十個人，反推就會把同台的團全算到每個人頭上（愛美變成 Roselia 的人）。
// 名冊是人工維護的權威答案，活動表只用來補名冊上沒有的人（客串、其他作品的聲優）。
//
// 回傳 Map: 名字 → { band, char, source: 'sheet' | 'guess' | 'single' }
export function personBandMap(events, sheetRoster = []) {
  const out = new Map()

  // 1. 名冊：說了算
  for (const r of sheetRoster) {
    if (r.kind === 'person' && r.name) {
      out.set(r.name, { band: r.band || '', char: r.role || '', source: 'sheet' })
    }
  }

  // 2. 活動表裡「一個人 × 一個團 × 有角色」的場次，最接近一手資料
  for (const [name, g] of Object.entries(buildRoster(events))) {
    if (!out.has(name)) out.set(name, { band: g.band, char: g.char, source: 'guess' })
  }

  // 3. 還是沒有的話：如果他每次出現都只跟同一個團，那就是那個團
  const seen = new Map()
  for (const e of events) {
    for (const p of (e.people || [])) {
      if (out.has(p)) continue
      if (!seen.has(p)) seen.set(p, new Set())
      for (const g of (e.relatedGroups || [])) seen.get(p).add(rootGroup(g))
    }
  }
  for (const [name, set] of seen) {
    if (set.size === 1) out.set(name, { band: [...set][0], char: '', source: 'single' })
  }

  return out
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
