import { bandKey } from './bands.js'

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
// 寫法：一行一首。前面的編號可有可無。
//
//   1. STAR BEAT!〜ホシノコドウ
//   2. 天下トーイツ A to Z☆
//   MC
//   3. BLACK SHOUT／Roselia
//   安可
//   Returns
//
// 三件事可以標，都不標也完全沒問題：
//
//   ▍團名     整行只有團名 ＝ 區塊標頭，後面的歌都算那一團的。雙團場的官方
//              曲目本來就這樣分段，比一行一行標 24 次省事太多。
//   ／團名     單獨一首要指定誰唱的時候用。雙團場（DAY1 MyGO × Ave Mujica）每首其實只有
//              一團在唱，不標的話那條資訊整個掉了。單團場不用標（只有一個
//              答案，自動帶上）；兩團以上沒標就留空 —— 猜錯會變成顯示出來的假事實。
//   安可       單獨一行。後面的都算安可。可以有第二次（W安可 / EN2）。
//   MC、影片    不是歌，不該進「這首唱過幾次」的統計，但它們是現場的一部分，
//              所以留在曲目裡、只是標成非歌曲。
const NOT_A_SONG = /^(mc\d*|トーク|talk|影片|映像|vtr|video|樂器演奏|楽器|instrumental|開場|オープニング|opening|自我介紹|挨拶)$/i
const ENCORE_LINE = /^(w?安可\d*|encore\d*|アンコール\d*|en\d*|ｗ?アンコール)$/i

// 【Day 1】、Day 2、第二天 —— 一列涵蓋兩天的場次（8/01–8/02 那種）
// 兩份歌單只能塞進同一格，所以要認得日子的分界。編號每天重新算。
const DAY_LINE = /^[【\[（(]?\s*(?:day|d)\s*([0-9]+)\s*[】\]）)]?$/i
const DAY_LINE_ZH = /^[【\[（(]?\s*第\s*([一二三四五六日\d]+)\s*[天日場]\s*[】\]）)]?$/
const ZH_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }

// 「みか 部分」「めぐ パート」「合唱」——
// 分段標頭常常寫暱稱不寫全名，而暱稱跟名冊上的名字對不起來
// （「みか」對「小日向美香」沒有任何字面關係）。所以不猜，原樣留著當標籤：
// 那是曲目來源本來就這樣寫的，照實記比亂對更有用。
const PERFORMER_SECTION = /^(.+?)\s*(?:部分|パート|ソロ|solo|コーナー|の部)$/i
const SHARED_SECTION = /^(合唱|全員|二人|ふたり|デュエット|duet|共演)$/i

export function setlistOf(event, fallbackBand = '') {
  const raw = event?.setlist || event?.extras?.['曲目'] || event?.extras?.['setlist']
  const lines = splitLines(raw)
  if (!lines.length) return []

  const groups = [...new Set((event?.relatedGroups || [])
    .map(g => String(g).split('／')[0].trim()).filter(Boolean))]

  // 分段標頭也可能是「人名」不是團名。
  //
  // 音樂祭（リスアニ！LIVE、ANISAMA）的曲目是按出演者分段的：
  //   伊藤美來
  //   Shocking Blue
  //   …
  //   愛美
  //   カザニア
  // 只認樂團的話，「伊藤美來」會被當成一首歌 —— 而且會永遠留在
  // 「台灣唱過的歌」清單裡，看起來像真的。
  //
  // 認得的人名就是這一場的出演者，那份名單本來就在資料裡。
  const cast = new Set((event?.people || []).map(p => String(p).trim()).filter(Boolean))

  // 沒標團的算誰的？
  //
  // 單團場只有一個答案，直接用。但雙團場（DAY1 MyGO × Ave Mujica）猜不出來 ——
  // 硬歸給第一個團的話，「春日影是 Ave Mujica 唱的」這種錯會被當成事實顯示。
  // 所以兩團以上就留空，等人去標。這跟場館城市那條規矩一樣：不確定就不猜。
  const primary = fallbackBand || (groups.length === 1 ? groups[0] : '')

  const out = []
  let encore = 0
  let n = 0
  let day = 0               // 0 ＝ 沒有分天
  let section = ''          // 區塊標頭設定的演出者（團名或人名或暱稱）
  let sectionIsPerson = false // 是人／暱稱的話記在 performer 而不是 band
  for (const line of lines) {
    const bare = line.replace(/[:：]/g, '').trim()
    if (ENCORE_LINE.test(bare)) { encore++; continue }

    const head = bare.replace(/^[▍▎▏■□●○◆◇※#＃*＊\-–—\s]+/, '').trim()

    // 分天：一列涵蓋兩天的場次，兩份歌單塞在同一格。編號每天重來。
    const dm = head.match(DAY_LINE) || head.match(DAY_LINE_ZH)
    if (dm) {
      day = ZH_NUM[dm[1]] || Number(dm[1]) || day + 1
      n = 0
      encore = 0
      section = ''
      sectionIsPerson = false
      continue
    }

    // 區塊標頭。四種都認：
    //   樂團名（▍Ave Mujica）／出演名單上的人名／「みか 部分」這種暱稱／「合唱」
    if (head && head.length <= 24) {
      if (SHARED_SECTION.test(head)) {
        section = head; sectionIsPerson = true; continue
      }
      if (bandKey(head) !== 'other' || cast.has(head)) {
        section = head
        sectionIsPerson = cast.has(head) && bandKey(head) === 'other'
        continue
      }
      const pm = head.match(PERFORMER_SECTION)
      if (pm && pm[1].trim()) {
        section = pm[1].trim(); sectionIsPerson = true; continue
      }
    }

    // 開頭的「1.」「01」「1)」「M01.」是編號不是歌名
    let text = line.replace(/^\s*[Mm]?\s*\d{1,2}\s*[.)、．]?\s*/, '').trim()
    if (!text) continue

    // 結尾的括號是出處註記，不是歌名的一部分：
    //   ふわふわ時間（動畫《K-ON!輕音部》插入曲）
    // 留著當說明 —— 那是這份曲目裡最有資訊量的部分之一，
    // 但不能混進歌名，不然同一首歌換一種註記就變成兩首。
    let note = ''
    const nm = text.match(/^(.+?)\s*[（(]([^（()]*)[）)]\s*$/)
    if (nm && nm[1].trim()) { text = nm[1].trim(); note = nm[2].trim() }

    // 「歌名／團名」或「歌名 @團名」。
    //
    // 團名可能有空白（Ave Mujica、RAISE A SUILEN、Hello, Happy World!），
    // 所以不能用「最後一段沒有空白」來認。改成：後半段要真的是認得的樂團才拆 ——
    // 認不出來就當它是歌名的一部分，不要把歌名切斷。
    let band = ''
    const m = text.match(/^(.*?)\s*[／/@]\s*(.+)$/)
    if (m && m[1].trim() && bandKey(m[2].trim()) !== 'other') {
      text = m[1].trim()
      band = m[2].trim()
    }

    if (NOT_A_SONG.test(text)) {
      out.push({ n: null, title: text, note, day, section, encore: encore > 0, encoreRound: encore, isSong: false, band: '', performer: '' })
      continue
    }
    out.push({
      n: ++n,
      title: text,
      encore: encore > 0,
      encoreRound: encore,
      isSong: true,
      note,
      day,
      // 標頭原文。畫面照這個分段 —— band 是推導出來的，單團場每首都有 band
      // 但那不叫「分段」。只有真的寫了標頭才有 section。
      section,
      band: band || (sectionIsPerson ? '' : section) || primary,
      // 音樂祭是按出演者分段的，那個資訊該記成「誰唱的」不是「哪一團」
      performer: sectionIsPerson ? section : '',
      // 這一場的第一首歌。安可段落不算 —— 開場是正編的第一首。
      opener: n === 1 && encore === 0,
    })
  }

  // 收尾＝那一天的最後一首歌（有安可就是安可的最後一首）。
  // 分天的話每天各有一個收尾 —— 只標全場最後一首會漏掉 Day1 的。
  const songs = out.filter(s => s.isSong)
  for (const d of new Set(songs.map(s => s.day))) {
    const ofDay = songs.filter(s => s.day === d)
    if (ofDay.length) ofDay[ofDay.length - 1].closer = true
  }
  return out
}

// 只要歌，不要 MC 與影片。統計一律用這個。
export const songsOf = (event, fallbackBand) =>
  setlistOf(event, fallbackBand).filter(s => s.isSong)

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
