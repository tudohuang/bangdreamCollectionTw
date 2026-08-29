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
import { setlistOf } from './archive.js'

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

// 所有歌的索引。每首附上唱過的場次（照時間排）與各種寫法。
export function songIndex(events = []) {
  const map = new Map()
  for (const e of events) {
    for (const s of setlistOf(e)) {
      const key = songKey(s.title)
      if (!key) continue
      if (!map.has(key)) map.set(key, { key, titles: new Set(), events: [], encores: 0 })
      const rec = map.get(key)
      rec.titles.add(s.title)
      if (s.encore) rec.encores++
      if (!rec.events.includes(e)) rec.events.push(e)
    }
  }
  return [...map.values()]
    .map(r => ({
      ...r,
      title: bestTitle(r.titles),
      count: r.events.length,
      events: r.events.slice().sort((a, b) =>
        String(a.startDate).localeCompare(String(b.startDate))),
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
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
