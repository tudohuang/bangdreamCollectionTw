// 看盤的資料來源：抓公開頁面、解析成統一的事件物件。
//
// 只碰公開頁面：FC 會員限定的內容在登入後面，自動登入抓取違反使用條款，不做。
// 大型售票站（e+、ぴあ）的搜尋結果是 JS 渲染的，伺服器端拿不到；
// 但 eventernote 本來就是那些站的聚合層，抓它一個等於抓一整排。
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) bangdream-collection-watch/1.0 (personal fan-site monitor)'

export const TW_RE = /台北|臺北|台灣|臺灣|台湾|高雄|台中|臺中|TAIPEI|TAIWAN|KAOHSIUNG/i

// 禮貌節流：同一個站不要連發
let lastFetch = 0
const GAP_MS = 1500
async function polite(url) {
  const wait = Math.max(0, lastFetch + GAP_MS - Date.now())
  if (wait) await new Promise(r => setTimeout(r, wait))
  lastFetch = Date.now()
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja,en;q=0.8' } })
  if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

const decode = (s = '') => s
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim()

// ---- eventernote：一個演者（或團體）的活動列表 ----
// 版面結構：<li class="clearfix"> 裡有 .date / .event h4 a / .place a / .actor ul / .note_count
export function parseEventernote(html) {
  const out = []
  const blocks = html.split('<li class="clearfix').slice(1)
  for (const b of blocks) {
    const date = /<p class="day\d?"[^>]*>\s*(\d{4}-\d{2}-\d{2})/.exec(b)?.[1]
    const ev = /<h4[^>]*>\s*<a href="\/events\/(\d+)"[^>]*>([\s\S]*?)<\/a>/.exec(b)
    if (!date || !ev) continue
    const venue = /会場:\s*<a href="\/places\/\d+"[^>]*>([^<]+)<\/a>/.exec(b)?.[1]
    const time = /<span class="s">([^<]+)/.exec(b)?.[1]
    const actors = [...b.matchAll(/<a href="\/actors\/[^"]+\/\d+"[^>]*>([^<]+)<\/a>/g)]
      .map(m => decode(m[1]))
    const note = /<div class="note_count">[\s\S]*?<p[^>]*>(\d+)/.exec(b)?.[1]
    out.push({
      id: `en-${ev[1]}`,
      date,
      title: decode(ev[2]),
      venue: decode(venue || ''),
      time: decode(time || ''),
      actors: [...new Set(actors)],
      note: note ? Number(note) : 0,
      url: `https://www.eventernote.com/events/${ev[1]}`,
      source: 'eventernote',
    })
  }
  return out
}

export async function fetchActor(actorId, name) {
  const html = await polite(`https://www.eventernote.com/actors/${encodeURIComponent(name || 'x')}/${actorId}`)
  return parseEventernote(html)
}

// 名字 → eventernote 的 actor id。
// 只認「名字完全相同」的那一筆：搜尋「愛美」回來的第一名是「ラミーラビリンス」，
// 取第一個命中會盯錯人，對不到就標成待確認。
export async function searchActor(keyword) {
  const html = await polite(`https://www.eventernote.com/actors/search?keyword=${encodeURIComponent(keyword)}`)
  const hits = [...html.matchAll(/href="\/actors\/([^"\/]+)\/(\d+)"[^>]*>([^<]+)</g)]
    .map(m => ({ slug: m[1], id: Number(m[2]), name: decode(m[3]) }))
  return { exact: hits.find(h => h.name === keyword) || null, candidates: hits.slice(0, 5) }
}

// ---- e+（イープラス）----
// 搜尋頁是 JS 渲染的拿不到，但藝人頁 /sf/word/<id> 是伺服器端輸出，
// 而且帶「抽選／先行／一般発売」的售票狀態 —— 看盤真正要盯的就是這個。
export function parseEplusArtist(html) {
  const out = []
  for (const b of html.split('<a class="ticket-item').slice(1)) {
    const href = /href="(\/sf\/detail\/[^"]+)"/.exec(b)?.[1]
    const yyyy = /ticket-item__yyyy">\s*([0-9]{4})/.exec(b)?.[1]
    const mmdd = /ticket-item__mmdd">\s*(\d{1,2})\/(\d{1,2})/.exec(b)
    const rawTitle = /ticket-item__title">([\s\S]*?)<\/h3>/.exec(b)?.[1] || ''
    const label = /class="label-ticket[^"]*">([^<]+)</.exec(rawTitle)?.[1] || ''
    // 售票狀態是包在標題裡的一個 span，先整段拆掉再取字，不然標題會變成「抽選Ave Mujica…」
    const title = decode(rawTitle.replace(/<span class="label-ticket[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, ''))
    const venue = decode(/ticket-item__venue">\s*<p>([^<]+)/.exec(b)?.[1] || '')
    if (!href || !title) continue
    const date = yyyy && mmdd
      ? `${yyyy}-${String(mmdd[1]).padStart(2, '0')}-${String(mmdd[2]).padStart(2, '0')}`
      : ''
    out.push({
      id: `ep-${href.split('/').pop()}`,
      date, title, venue,
      status: decode(label),          // 抽選 / 先行 / 一般発売…
      url: 'https://eplus.jp' + href,
      source: 'eplus',
    })
  }
  return out
}

export async function fetchEplusArtist(wordId) {
  return parseEplusArtist(await polite(`https://eplus.jp/sf/word/${wordId}`))
}

// 名字 → e+ 的藝人頁 id（只認完全同名，「愛美」會搜出右手愛美、宮林愛美…）
export async function searchEplusWord(name) {
  const html = await polite(`https://eplus.jp/sf/search?keyword=${encodeURIComponent(name)}`)
  const hits = [...html.matchAll(/href="\/sf\/word\/(\d+)"[^>]*>([^<]{1,60})/g)]
    .map(m => ({ id: m[1], name: decode(m[2]) }))
  // e+ 用的是 ’ 這種全形撇號（Poppin’Party），比對前先統一
  const norm = (s) => s.replace(/[’'`]/g, "'").replace(/\s+/g, '').toLowerCase()
  return {
    exact: hits.find(h => norm(h.name) === norm(name)) || null,
    candidates: hits.slice(0, 5),
  }
}

// ---- チケットぴあ ----
// 搜尋結果本身是 JS 渲染的，但 rlsInfo.do 這個區塊是伺服器端輸出。
// 關鍵字比對很鬆（搜「愛美」會回鈴木愛美、搜「Ave Mujica」會回 EVANESCENCE），
// 所以一律再用標題做一次嚴格過濾，寧可漏也不要餵假消息。
export function parsePia(html) {
  const out = []
  for (const b of html.split('<li class="clearfix">').slice(1)) {
    const status = /status_icon_text[^>]*>([^<]+)</.exec(b)?.[1]
    const title = /<span class="list_01">\s*([^<]+)/.exec(b)?.[1]
    const dateRaw = /<span class="list_03">\s*([^<]+)/.exec(b)?.[1]
    const venue = /<span class="list_04">\s*([^<]+)/.exec(b)?.[1]
    const cd = /class="eventCd" value="(\d+)"/.exec(b)?.[1]
    if (!title) continue
    const d = /(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(dateRaw || '')
    out.push({
      id: `pia-${cd || decode(title).slice(0, 20)}`,
      date: d ? `${d[1]}-${d[2].padStart(2, '0')}-${d[3].padStart(2, '0')}` : '',
      title: decode(title),
      venue: decode(venue || ''),
      status: decode(status || ''),
      url: cd ? `https://t.pia.jp/pia/event/event.do?eventCd=${cd}` : 'https://t.pia.jp/',
      source: 'pia',
    })
  }
  return out
}

// 全形英數 → 半形，ぴあ 的標題常常是全形（ＥＶＡＮＥＳＣＥＮＣＥ）
const toHalf = (s = '') => s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
  .replace(/[　\s]+/g, '').toLowerCase()

export async function fetchPia(keyword) {
  const html = await polite(`https://t.pia.jp/pia/rlsInfo.do?kw=${encodeURIComponent(keyword)}`)
  const k = toHalf(keyword)
  // 標題或會場真的含這個關鍵字才算 —— 沒有就是它搜歪了
  return parsePia(html).filter(e => toHalf(e.title).includes(k) || toHalf(e.venue).includes(k))
}

// ---- 官方 news：只看標題有沒有新的 ----
export async function fetchNews(url, re = /<h3[^>]*>([^<]{6,})</g) {
  const html = await polite(url)
  return [...html.matchAll(re)].slice(0, 12).map((m, i) => ({
    id: `news-${url}-${decode(m[1]).slice(0, 40)}`,
    date: '',
    title: decode(m[1]),
    venue: '',
    actors: [],
    url,
    source: 'news',
    order: i,
  }))
}

// 從標題猜活動類型，貼進「動態」分頁時省一次手動分類（猜不到就留空自己填）
export function guessType(title = '') {
  const t = title.toLowerCase()
  if (/朗読劇|朗讀劇/.test(title)) return '朗讀劇'
  if (/公開録音|公録|生放送|ラジオ/.test(title)) return '公錄'
  if (/上映|舞台挨拶/.test(title)) return '上映會／Talk'
  if (/フェス|fes|サマソニ|summer sonic|anisama/i.test(t)) return '音樂祭'
  if (/リリース|発売記念|発売イベント/.test(title)) return 'LIVE／發售活動'
  if (/ミーティング|meeting|お渡し|特典会|サイン会/i.test(t)) return 'FMT'
  if (/live|ライブ|ツアー|tour|公演/i.test(t)) return 'LIVE'
  return ''
}

// ---- 關鍵字新聞搜尋 ----
// 一般新聞站不能整站盯，會被無關的東西洗版；改成用關鍵字搜尋，
// 而且搜回來的標題必須真的含那個關鍵字才算（華視搜「邦邦」會回「硬邦邦」「德邦長」）。
export function parseNewsSearch(html) {
  const out = []
  for (const block of html.split('<a ').slice(1)) {
    const href = /href="(https?:\/\/[^"]+)"/.exec(block)?.[1]
    if (!href) continue
    // 標題取這個連結底下的第一個標題元素；抓不到就跳過，寧可漏也不要抓到導覽列
    const title = /<h[1-4][^>]*>([^<]{6,})</.exec(block.slice(0, 1200))?.[1]
    if (!title) continue
    const date = /datetime="(\d{4}-\d{2}-\d{2})/.exec(block.slice(0, 1200))?.[1] || ''
    out.push({ id: 'news-' + href, url: href, title: decode(title), date })
  }
  return out
}

// keywords 的每一項可以是字串，或 { kw, require: [...] }。
// require 是給「聲優」這種很廣的字用的：標題還要再命中其中一個詞才算，
// 否則會連「柯南小蘭聲優病逝」「花澤香菜離婚」都一起收進來。
export async function fetchNewsSearch(feed) {
  const flat = (s) => s.replace(/\s+/g, '').toLowerCase()
  const seen = new Set()
  const out = []

  for (const entry of (feed.keywords || [])) {
    const kw = typeof entry === 'string' ? entry : entry.kw
    const require = (typeof entry === 'string' ? [] : entry.require || []).map(flat)
    let items = []
    try {
      items = parseNewsSearch(await polite(feed.search.replace('{kw}', encodeURIComponent(kw))))
    } catch { continue }

    for (const item of items) {
      const title = flat(item.title)
      if (!title.includes(flat(kw))) continue                       // 搜尋很鬆，標題要真的含關鍵字
      if (require.length && !require.some(r => title.includes(r))) continue
      if (seen.has(item.id)) continue
      seen.add(item.id)
      out.push({ ...item, keyword: kw })
    }
  }
  return out
}
