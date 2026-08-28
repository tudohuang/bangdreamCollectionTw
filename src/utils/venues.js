import { detectCity } from './derive.js'

// 場館：正規化、城市、以及「同一個場館的所有場次」。
//
// 為什麼需要這支：Sheet 的「地點」是人手打的，同一個場館會有兩種寫法 ——
//   南港展覽館一館 / 台北南港展覽館一館 4 樓
//   Clapper Studio / 三創生活園區 CLAPPER STUDIO
// 直接拿字串當 key，場館頁就會把同一個地方拆成兩個，統計也跟著錯。
//
// 城市欄在 Sheet 裡是空的（0/59），但地點是滿的（59/59），
// 所以城市用場館推。推導只是預設值 —— Sheet 的「城市」有填一律優先。

// 樓層 / 廳室 / 展區這種「同一棟建築裡的位置」不是不同場館，全部從 key 裡拿掉。
// 例：「南港展覽館一館 4 樓」「微風廣場 8F C1、C2 廳」「左營店 10F 舞台區」
const PLACE_TAIL = /\s*(?:[0-9]+\s*(?:樓|f)|b[0-9]+)[\s\S]*$/i

// 城市字首只在算 key 的時候用得到（把「台北南港展覽館」正規化成「南港展覽館」）。
// 真正判斷城市的是 derive.js 的 detectCity —— 那張表已經維護很久了，
// 這裡再開一張只會製造兩個會慢慢分岔的答案。
const CITY_TOKENS = ['台北', '新北', '基隆', '桃園', '新竹', '苗栗', '台中',
  '彰化', '南投', '雲林', '嘉義', '台南', '高雄', '屏東', '宜蘭', '花蓮', '台東']

const halfWidth = (s) =>
  s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))

// 正規化之後還是對不起來的，明著寫。目前只有一組：
// 「Clapper Studio」與「三創生活園區 CLAPPER STUDIO」是同一個地方，
// 一個寫了所在園區、一個沒寫。這種靠規則猜會誤傷別的場館，所以列表解決。
const ALIAS = {
  '三創生活園區clapperstudio': 'clapperstudio',
}

export function venueKey(raw) {
  let s = String(raw || '').trim()
  if (!s || s === '未確認' || s === '—' || s === '-') return ''
  s = halfWidth(s).toLowerCase().replace(/臺/g, '台')
  // 括號與引號故意處理得不一樣：
  //   （TITAN SCREEN）、(B1) 是附註 —— 整段丟掉
  //   「魔法氣泡」是店名本身 —— 只拿掉引號，字要留著，
  //   不然 Bushiroad 各家門市會全部併成同一個場館
  s = s.replace(/[「」『』]/g, '').replace(/[（(][^）)]*[）)]/g, '')
  s = s.replace(PLACE_TAIL, '')
  // 城市在 key 裡是雜訊：「台北南港展覽館」跟「南港展覽館」是同一個地方
  for (const c of CITY_TOKENS) s = s.split(c).join('')
  s = s.replace(/\s+/g, '').replace(/[市區]$/, '')
  return ALIAS[s] || s
}

// 城市判斷一律走 derive.js。這裡只是轉個手，讓場館相關的程式不用同時
// import 兩支 util —— 但答案永遠只有一個來源。
export const cityOf = detectCity

// 同一個 key 底下可能有好幾種寫法，顯示時挑最完整的那個（沒有樓層尾巴、字最多）
export function bestName(names) {
  return [...names].sort((a, b) => {
    const fa = PLACE_TAIL.test(a) ? 1 : 0, fb = PLACE_TAIL.test(b) ? 1 : 0
    if (fa !== fb) return fa - fb
    return b.length - a.length
  })[0] || ''
}

// 依場館聚合。回傳陣列，場次多的在前。
export function venueIndex(events = []) {
  const map = new Map()
  for (const e of events) {
    const key = venueKey(e.venue)
    if (!key) continue
    if (!map.has(key)) map.set(key, { key, names: new Set(), events: [], city: '' })
    const v = map.get(key)
    v.names.add(String(e.venue).trim())
    v.events.push(e)
    if (!v.city) v.city = cityOf(e)
  }
  return [...map.values()]
    .map(v => ({
      ...v,
      name: bestName(v.names),
      events: v.events.slice().sort((a, b) => String(a.startDate).localeCompare(String(b.startDate))),
    }))
    .sort((a, b) => b.events.length - a.events.length || a.name.localeCompare(b.name))
}

export function findVenue(events, key) {
  const want = venueKey(decodeURIComponent(key || ''))
  return want ? venueIndex(events).find(v => v.key === want) || null : null
}

// 同一個場館在 Sheet 裡被寫成兩種寫法時，其中一種推得出城市，
// 另一種就跟著走 —— 這不是猜，是資料自己說的：那兩列指的是同一個地方。
// 例：「Clapper Studio」單看推不出城市，但它跟「三創生活園區 CLAPPER STUDIO」
// 是同一個 key，而後者推得出台北。
export function cityOfWithVenue(event, events = []) {
  const direct = cityOf(event)
  if (direct) return direct
  const key = venueKey(event?.venue)
  if (!key) return ''
  for (const other of events) {
    if (venueKey(other.venue) === key) {
      const c = cityOf(other)
      if (c) return c
    }
  }
  return ''
}

// 城市分布：統計頁用。沒有城市的歸到「未標記」，數字才誠實。
export function cityBreakdown(events = []) {
  const map = new Map()
  for (const e of events) {
    const c = cityOfWithVenue(e, events) || '未標記'
    map.set(c, (map.get(c) || 0) + 1)
  }
  return [...map].map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
}
