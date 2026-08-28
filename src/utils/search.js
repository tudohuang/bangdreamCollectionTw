// 搜尋。
//
// 這站有一半的名字是日文，而使用者會用四種方式打同一個人：
//   漢字（相羽あいな）／片假名（アイバアイナ）／羅馬字（aiba）／中文暱稱
// 只做字串包含的話，四種裡只有一種找得到。
//
// 三層：
//   1. 正規化   片假名轉平假名、全形轉半形、去空白 —— 同一個字的不同打法對得起來
//   2. 羅馬字   假名自動轉（utils/kana.js），漢字查表（data/aliases.js）
//   3. 錯字容錯 完全沒有結果時才啟動，編輯距離 1。有結果時絕不干擾。
import { detectCity } from './derive.js'
import { toRomaji, kataToHira } from './kana.js'
import { ROMAJI, BAND_ALIASES } from '../data/aliases.js'

// 全形英數 → 半形；片假名 → 平假名；小寫；去空白與常見標點。
// 目的是讓「TICC」「ｔｉｃｃ」「t i c c」全部長成同一個樣子。
export function norm(s) {
  return kataToHira(String(s || ''))
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/[\s'’‘`·・．.,，、！!？?「」『』（）()【】\-–—_]/g, '')
}

// 一個字串的所有可搜尋型態：正規化過的原字 + 羅馬字
const forms = (s) => {
  const n = norm(s)
  const r = norm(toRomaji(s))
  return r && r !== n ? [n, r] : [n]
}

// 建立可搜尋字串。用空白串起來只是為了分隔，比對時看的是整串。
export function searchHay(e) {
  const parts = [
    e.title, e.type, e.venue, detectCity(e),
    ...(e.people || []),
    ...(e.relatedGroups || []),
  ]
  const out = []
  for (const p of parts) if (p) out.push(...forms(p))

  // 手維護的別名：漢字讀音推不出來，只能查表
  for (const p of (e.people || [])) {
    for (const a of ROMAJI[p] || []) out.push(norm(a))
  }
  for (const g of (e.relatedGroups || [])) {
    const root = String(g).split('／')[0].trim()
    for (const a of BAND_ALIASES[root] || []) out.push(norm(a))
  }
  return out.join(' ')
}

// 每個活動的 hay 算一次就好 —— CommandPalette 每個按鍵都會重跑一輪
const hayCache = new WeakMap()
const hayOf = (e) => {
  let h = hayCache.get(e)
  if (h === undefined) { h = searchHay(e); hayCache.set(e, h) }
  return h
}

export function matchSearch(e, query) {
  const q = norm(query)
  if (!q) return true
  const hay = hayOf(e)
  if (hay.includes(q)) return true
  // 使用者打羅馬字、資料是假名的情況已經被 hay 蓋掉了；
  // 反過來（使用者打假名、想比對到羅馬字寫的資料）在這裡補上
  const qr = norm(toRomaji(query))
  return qr !== q && hay.includes(qr)
}

// ---------------------------------------------------------------- 錯字容錯
//
// 只在「完全沒有結果」時啟動。有結果的時候放寬條件只會讓好結果被稀釋 ——
// 打「愛美」的人不想看到「愛実」也一起跑出來。

// 編輯距離，超過 max 就提早放棄（不需要算出精確值）
function within(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1])
      if (cur[j] < best) best = cur[j]
    }
    if (best > max) return false
    prev = cur
  }
  return prev[b.length] <= max
}

// 容錯的最短長度跟文字系統有關：
// 中日文兩個字就是一個完整的詞（愛美、台北），拉丁字母兩三個字還只是詞根，
// 對它放寬會讓「ras」命中一堆不相干的東西。
const minFuzzyLen = (q) => (/[一-龥ぁ-ヿ]/.test(q) ? 2 : 4)

// hay 裡有沒有一段跟 q 只差一個字
function fuzzyIncludes(hay, q, max) {
  const w = q.length
  if (w < minFuzzyLen(q)) return false
  for (let i = 0; i + w - max <= hay.length; i++) {
    for (let len = w - max; len <= w + max; len++) {
      if (within(hay.slice(i, i + len), q, max)) return true
    }
  }
  return false
}

export function fuzzyMatch(e, query) {
  const q = norm(query)
  if (q.length < minFuzzyLen(q)) return false
  return fuzzyIncludes(hayOf(e), q, 1)
}

// 先精準、沒有結果才放寬。回傳 { list, fuzzy } —— 畫面要知道自己看的是哪一種，
// 才講得出「找不到『愛実』，這些是接近的結果」。
export function searchEvents(events, query) {
  const q = norm(query)
  if (!q) return { list: events, fuzzy: false }
  const exact = events.filter(e => matchSearch(e, query))
  if (exact.length) return { list: exact, fuzzy: false }
  const near = events.filter(e => fuzzyMatch(e, query))
  return { list: near, fuzzy: near.length > 0 }
}
