// 系列：跨年度重複舉辦的同一個活動。
//
// Bushiroad EXPO 辦過 6 次、BanG Dream! Special LIVE 3 次、
// LisAni! 與 ANISAMA 各 2 次 —— 但在資料裡它們只是 59 個各自獨立的標題。
// 「這個活動來過幾次、每次帶誰來」現在只能自己在列表裡認。
//
// 用明確的對照表而不是靠正則猜：活動名稱的寫法太自由
// （「リスアニ！LIVE TAIPEI 2025」與「LisAni！LIVE TAIWAN 2018」是同一個系列，
// 沒有任何規則推得出來）。Sheet 的「系列」欄一律優先，這裡只是沒填時的預設。

export const SERIES = [
  {
    key: 'bushiroad-expo',
    name: 'Bushiroad EXPO',
    lead: '武士道每年的合同大型活動，台灣場從 2023 年開始。',
    match: /bushiroad\s*expo/i,
  },
  {
    key: 'bandream-special-live',
    name: 'BanG Dream! Special LIVE',
    lead: '2026 年在台北的雙日公演，含限定快閃店。',
    match: /bang\s*dream!?\s*special\s*live/i,
  },
  {
    key: 'lisani',
    name: 'LisAni! LIVE',
    lead: '動畫歌曲的大型音樂祭，台灣場用過 TAIWAN 與 TAIPEI 兩種名稱。',
    match: /lisani|リスアニ/i,
  },
  {
    key: 'anisama',
    name: 'Animelo Summer Live 海外場',
    lead: '日本最大的動畫歌曲音樂祭，台灣場辦在桃園與台北。',
    match: /anisama/i,
  },
  {
    key: 'atc-special-stage',
    name: 'ATC Special Stage',
    lead: '同一檔期裡的一系列聲優見面會。',
    match: /atc\s*special\s*stage/i,
  },
  {
    key: 'garupa-anniversary',
    name: '少女樂團派對 週年活動',
    lead: '手遊每年的週年紀念，通常帶一組聲優來台。',
    match: /少女樂團派對.*(週年|周年)/,
  },
  {
    key: 'ave-mujica-exitus',
    name: 'Ave Mujica LIVE TOUR 2026「Exitus」',
    lead: '同一趟巡演在台灣的公演與快閃店。',
    match: /ave\s*mujica\s*live\s*tour\s*2026/i,
  },
]

const byKey = new Map(SERIES.map(s => [s.key, s]))

// Sheet 的「系列」欄可以直接寫 key，也可以寫系列名稱
function fromSheet(raw) {
  const v = String(raw || '').trim()
  if (!v) return null
  return byKey.get(v) || SERIES.find(s => s.name === v) || null
}

export function seriesOf(event) {
  const given = fromSheet(event?.series || event?.extras?.['系列'])
  if (given) return given
  const title = String(event?.title || '')
  return SERIES.find(s => s.match.test(title)) || null
}

// 只回真的是「系列」的 —— 只辦過一次的，系列頁跟活動頁會是同一份內容，
// 那種頁面既沒有用、對搜尋引擎也是薄內容。
export function seriesIndex(events = [], min = 2) {
  const map = new Map()
  for (const e of events) {
    const s = seriesOf(e)
    if (!s) continue
    if (!map.has(s.key)) map.set(s.key, { ...s, events: [] })
    map.get(s.key).events.push(e)
  }
  return [...map.values()]
    .filter(s => s.events.length >= min)
    .map(s => ({
      ...s,
      events: s.events.slice().sort((a, b) =>
        String(a.startDate).localeCompare(String(b.startDate))),
    }))
    .sort((a, b) => b.events.length - a.events.length || a.name.localeCompare(b.name))
}

export function findSeries(events, key) {
  const want = decodeURIComponent(key || '')
  return seriesIndex(events).find(s => s.key === want || s.name === want) || null
}

// 這一場在它的系列裡是第幾次。詳情頁用 ——「Bushiroad EXPO 的第 4 次」
// 是這站才查得到的東西。
export function seriesPosition(event, events) {
  const s = seriesOf(event)
  if (!s) return null
  const list = seriesIndex(events, 1).find(x => x.key === s.key)
  if (!list || list.events.length < 2) return null
  const i = list.events.findIndex(e => e.id === event.id)
  return i < 0 ? null : { series: s, nth: i + 1, total: list.events.length }
}
