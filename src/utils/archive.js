// 史料層：曲目、票價、周邊、主視覺。
//
// 這四樣是這個站真正別的地方查不到的東西。Setlist.fm 沒有台灣的邦邦場次，
// 票價與場販周邊沒有任何地方在整理，主視覺的繪師更是只有當年的公告才寫。
//
// 現在資料是空的 —— 這裡先把形狀定好、畫面接好，Sheet 一填就會長出來。
// 沒有資料的區塊完全不出現，不留空殼。

const splitLines = (v) =>
  String(v || '')
    .split(/[\n;；]+/)
    .map(s => s.trim())
    .filter(s => s && s !== '—' && s !== '-')

// ------------------------------------------------------------------ 曲目
//
// 寫法：一行一首。前面的編號可有可無，安可用「encore」或「安可」起一段。
//   1. STAR BEAT!〜ホシノコドウ
//   2. 天下トーイツ A to Z☆
//   安可
//   Returns
export function setlistOf(event) {
  const raw = event?.setlist || event?.extras?.['曲目'] || event?.extras?.['setlist']
  const lines = splitLines(raw)
  if (!lines.length) return []

  const out = []
  let encore = false
  let n = 0
  for (const line of lines) {
    if (/^(安可|encore|アンコール)/i.test(line.replace(/[:：\s]/g, ''))) { encore = true; continue }
    // 開頭的「1.」「01」「1)」是編號不是歌名
    const title = line.replace(/^\s*\d{1,2}\s*[.)、．]?\s*/, '').trim()
    if (!title) continue
    out.push({ n: ++n, title, encore })
  }
  return out
}

// 一首歌在台灣被唱過幾次、哪幾場。Setlist 有資料之後這是全站最有價值的查詢。
export function songIndex(events = []) {
  const map = new Map()
  for (const e of events) {
    for (const s of setlistOf(e)) {
      const key = s.title
      if (!map.has(key)) map.set(key, { title: key, events: [] })
      const rec = map.get(key)
      if (!rec.events.includes(e)) rec.events.push(e)
    }
  }
  return [...map.values()]
    .map(r => ({ ...r, count: r.events.length }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
}

// ------------------------------------------------------------------ 票價
//
// 寫法：分區用「/」隔開，可以帶區名。
//   1800 / 2800 / 3800
//   搖滾區 3800 / 座位區 2800
export function pricesOf(event) {
  const raw = String(event?.price || event?.extras?.['票價'] || '').trim()
  if (!raw) return null

  const tiers = raw.split(/[/｜|]/).map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/(\d[\d,]*)/)
    const amount = m ? Number(m[1].replace(/,/g, '')) : null
    const label = m ? s.replace(m[0], '').replace(/[元NT$\s]/gi, '').trim() : s
    return { label, amount, text: s }
  })
  const amounts = tiers.map(t => t.amount).filter(n => Number.isFinite(n))
  return {
    raw,
    tiers,
    low: amounts.length ? Math.min(...amounts) : null,
    high: amounts.length ? Math.max(...amounts) : null,
  }
}

// 票價隨年份的變化。只收有票價的場次 —— 沒資料就回空陣列，畫面自己不出現。
export function priceHistory(events = []) {
  return events
    .map(e => ({ event: e, price: pricesOf(e) }))
    .filter(x => x.price?.high != null && x.event.year)
    .sort((a, b) => String(a.event.startDate).localeCompare(String(b.event.startDate)))
}

// ------------------------------------------------------------------ 周邊
//
// 寫法：一行一項，價格接在後面（可省略）。
//   場刊 400
//   毛巾 1200
//   台版限定壓克力立牌 800
export function goodsOf(event) {
  const raw = event?.goods || event?.extras?.['周邊'] || event?.extras?.['場販']
  return splitLines(raw).map(line => {
    const m = line.match(/\s(\d[\d,]*)\s*$/)
    return {
      name: m ? line.slice(0, m.index).trim() : line,
      price: m ? Number(m[1].replace(/,/g, '')) : null,
      // 台版限定是收藏圈真正在找的東西，值得單獨標出來
      taiwanOnly: /台版|台灣限定|台限|限定/.test(line),
    }
  })
}

// ------------------------------------------------------------------ 主視覺
//
// 寫法：繪師名，後面可以接來源網址。
//   はいむらきよたか https://x.com/...
export function keyVisualOf(event) {
  const raw = String(event?.keyVisual || event?.extras?.['主視覺'] || event?.extras?.['繪師'] || '').trim()
  if (!raw) return null
  const m = raw.match(/(https?:\/\/\S+)/)
  return { artist: (m ? raw.replace(m[1], '') : raw).trim().replace(/[·・\-–—]\s*$/, ''), url: m ? m[1] : '' }
}

// ------------------------------------------------------------------ 售票狀況
//
// 寫法：自由文字。「完售」「開賣 3 分鐘完售」「當日仍有餘票」
//
// 為什麼要記：完售與否是台灣邦邦熱度唯一的客觀指標，而且事後完全查不到 ——
// 售票頁會下架，社群貼文會被洗掉。當下不記，之後就沒有了。
export function salesOf(event) {
  const raw = String(event?.soldOut || event?.extras?.['售票狀況'] || event?.extras?.['完售'] || '').trim()
  if (!raw) return null
  // 「完售」兩個字出現在任何地方就算完售，前面的修飾語（開賣 3 分鐘）留著當說明
  const sold = /完售|售罄|sold\s*out/i.test(raw)
  return { raw, sold }
}

// ------------------------------------------------------------------ 場刊
//
// 寫法：一行一項，就是場刊的目次。
//   聲優訪談 愛美 × 伊藤彩沙
//   設定資料集
//   台北公演特別寫真
export function programmeOf(event) {
  return splitLines(event?.programme || event?.extras?.['場刊'] || event?.extras?.['目次'])
}

// 這一場有沒有任何史料層的資料。用來決定整個區塊要不要出現。
export function hasArchive(event) {
  return setlistOf(event).length > 0 || !!pricesOf(event) ||
         goodsOf(event).length > 0 || !!keyVisualOf(event) ||
         !!salesOf(event) || programmeOf(event).length > 0
}
