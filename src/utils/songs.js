// 歌曲：正規化、在台灣的演出史。
//
// 為什麼需要正規化：場館名有 28 種寫法就已經會把同一個地方拆成兩個，
// 歌名會有好幾百個，而且是日文、有副標、有全形半形、有人打全名有人打簡稱。
//   「STAR BEAT!〜ホシノコドウ〜」 vs 「STAR BEAT!」
//   「キズナミュージック♪」 vs 「キズナミュージック」
//   「Y.O.L.O！！！！！」 vs 「Y.O.L.O!!!!!」
// 不收斂的話，整個功能會碎成一堆「只唱過一次」——
// 而「這首在台灣唱過幾次」正是這個功能唯一的價值。
//
// 收斂的原則是「同一首歌的不同寫法」，不是「看起來像的歌」。
// 不做前綴比對 —— 那會把不同的歌併在一起，比拆開更糟。
import { songsOf } from './archive.js'

const halfWidth = (s) =>
  s.replace(/[Ａ-Ｚａ-ｚ０-９！？＃＆＊（）［］]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0))

export function songKey(raw) {
  let s = String(raw || '').trim()
  if (!s) return ''
  s = halfWidth(s).toLowerCase()
  // 〜副標〜 與 （版本說明）是同一首歌的補充，不是另一首
  s = s.replace(/[〜~][^〜~]*[〜~]?\s*$/, '')
  s = s.replace(/[（(][^）)]*[）)]\s*$/, '')
  // 引號、音符記號、標點、空白：打法差異，不影響是哪一首
  s = s.replace(/[「」『』"'’‘]/g, '')
  s = s.replace(/[♪♡★☆・･]/g, '')
  s = s.replace(/[\s.,、。!?！？\-‐–—_]/g, '')
  return s
}

// 顯示用：同一個 key 底下挑最完整的寫法（最長的，通常帶副標）
export function bestTitle(titles) {
  return [...titles].sort((a, b) => b.length - a.length)[0] || ''
}

// 所有歌的索引。
//
// 除了「唱過幾場」，還記三件從曲目本身就算得出來、不用多打字的事：
//   開場幾次 / 收尾幾次 / 安可幾次 —— 「STAR BEAT! 三次都是開場」
//   是哪幾團唱的 —— 雙團場才分得出來
export function songIndex(events = []) {
  const map = new Map()
  for (const e of events) {
    for (const s of songsOf(e)) {
      const key = songKey(s.title)
      if (!key) continue
      if (!map.has(key)) {
        map.set(key, { key, titles: new Set(), events: [], bands: new Map(),
          encores: 0, openers: 0, closers: 0 })
      }
      const rec = map.get(key)
      rec.titles.add(s.title)
      if (s.encore) rec.encores++
      if (s.opener) rec.openers++
      if (s.closer) rec.closers++
      if (s.band) rec.bands.set(s.band, (rec.bands.get(s.band) || 0) + 1)
      if (!rec.events.includes(e)) rec.events.push(e)
    }
  }
  return [...map.values()]
    .map(r => ({
      ...r,
      title: bestTitle(r.titles),
      count: r.events.length,
      bandList: [...r.bands].sort((a, b) => b[1] - a[1]),
      events: r.events.slice().sort((a, b) =>
        String(a.startDate).localeCompare(String(b.startDate))),
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
}

// 這一場的曲目，附上「這首是不是台灣首唱」。
//
// 首唱完全算得出來 —— 全站所有曲目裡，這首最早出現在哪一場。
// 這是曲目資料一填就自動長出來的東西，不用任何額外欄位。
export function setlistWithFirsts(event, allEvents = []) {
  const idx = new Map(songIndex(allEvents).map(s => [s.key, s]))

  // 只有一場有曲目的時候，每一首當然都是「台灣首唱」——
  // 那樣標會變成整份曲目每一行都掛一個徽章，等於沒標。
  // 有別場可以比才有意義。
  const others = allEvents.filter(e => e.id !== event.id && (e.setlist || '').trim()).length
  const seen = new Set()

  return songsOf(event).map(s => {
    const key = songKey(s.title)
    const rec = idx.get(key)
    // 同一場（含兩天）重複唱的，只有第一次算首唱
    const firstHere = !seen.has(key)
    seen.add(key)
    return {
      ...s,
      countInTw: rec?.count ?? 1,
      firstInTw: others > 0 && firstHere && (rec ? rec.events[0]?.id === event.id : true),
    }
  })
}

// 每一場的曲目長度與組成。統計頁用。
export function setlistStats(events = []) {
  const rows = events
    .map(e => ({ event: e, songs: songsOf(e) }))
    .filter(r => r.songs.length)
    .sort((a, b) => String(a.event.startDate).localeCompare(String(b.event.startDate)))
  if (!rows.length) return null

  const counts = rows.map(r => r.songs.length)
  const openers = new Map()
  const closers = new Map()
  for (const r of rows) {
    for (const s of r.songs) {
      if (s.opener) openers.set(s.title, (openers.get(s.title) || 0) + 1)
      if (s.closer) closers.set(s.title, (closers.get(s.title) || 0) + 1)
    }
  }
  const top = (m) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 5)
  return {
    shows: rows.length,
    rows,
    avg: Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10,
    min: Math.min(...counts),
    max: Math.max(...counts),
    openers: top(openers),
    closers: top(closers),
  }
}

// 兩場的曲目重疊度。「DAY1 與 DAY2 重複了三首」是雙日公演才問得出來的問題。
export function overlap(a, b) {
  const ka = new Set(songsOf(a).map(s => songKey(s.title)))
  const kb = new Set(songsOf(b).map(s => songKey(s.title)))
  if (!ka.size || !kb.size) return null
  const shared = [...ka].filter(k => kb.has(k))
  return {
    shared: shared.length,
    onlyA: ka.size - shared.length,
    onlyB: kb.size - shared.length,
    ratio: Math.round((shared.length / Math.min(ka.size, kb.size)) * 100),
  }
}

export function findSong(events, key) {
  const want = songKey(decodeURIComponent(key || ''))
  return want ? songIndex(events).find(s => s.key === want) || null : null
}

// 一首歌在台灣的履歷：第一次、最近一次、誰唱過、安可幾次。
export function songProfile(events, key) {
  const s = findSong(events, key)
  if (!s) return null
  const people = [...s.events.reduce((m, e) => {
    for (const p of e.people || []) m.set(p, (m.get(p) || 0) + 1)
    return m
  }, new Map())].sort((a, b) => b[1] - a[1])
  return {
    ...s,
    first: s.events[0],
    last: s.events[s.events.length - 1],
    people,
    // 同一首歌被寫成好幾種：講出來，不要偷偷合併
    aliases: [...s.titles].filter(t => t !== s.title),
  }
}

// 填表台的自動完成用：已經出現過的歌名，照用過的次數排。
//
// 這是這支存在的另一半理由 —— 與其事後正規化，不如一開始就讓人挑到
// 同一個寫法。已經打過的歌名擺在眼前，比任何規則都有效。
export function knownTitles(events = []) {
  return songIndex(events).map(s => ({ title: s.title, count: s.count }))
}
