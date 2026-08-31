// 「歌曲」分頁的解析。
//
// 歌單本身放在活動表裡（那是「這場唱了什麼」），這一張是「這首歌是什麼」——
// 原唱團、收錄專輯、發行日、詞曲、官方連結。兩張表靠歌名對位，用的是
// songs.js 的 songKey，所以〜副標〜、（TV size）、全形半形這些寫法差異
// 不用在 Sheet 上手動統一。
//
// 沒有建這個分頁，或分頁是空的，整站行為跟以前一模一樣 ——
// 歌曲頁只是少掉上半部那塊，台灣履歷照常。
//
// 關於歌詞：這裡只收「歌詞頁的網址」，不收歌詞本文。
// 邦邦的曲子版權在 Bushiroad 與 JASRAC 底下，轉貼全文是最容易出事的一種
// 內容，而且對一個史料庫沒有加分 —— 歌詞哪裡都查得到，「在台灣唱過幾次」
// 只有這裡查得到。連出去就好。
import { parseCSV } from './parseEvents.js'
import { songKey } from './songs.js'
import { normalizeDate } from './parsePulse.js'

// Sheet 上「歌曲」分頁的表頭，順序就是產生空白表時的欄序。
//
// 匯出而不是各寫一份：npm run template 產的表頭如果跟解析器認得的欄名對不上，
// 貼進 Sheet 之後每一欄都會靜靜讀不到 —— 畫面正常、沒有錯誤、就是沒資料。
export const SONG_COLUMNS = [
  '歌名', '樂團', '專輯', '發行', '作詞', '作曲', '編曲', '連結', '封面', '別名', '備註',
]

const cell = (row, i) => (i >= 0 ? (row[i] || '').trim() : '')

// 一個欄位可能有好幾種寫法，依序找第一個對得上的
const finder = (head) => (...names) => {
  for (const n of names) {
    const i = head.indexOf(n)
    if (i >= 0) return i
  }
  return -1
}

// 連結欄：空白、逗號、頓號、直線、換行都當分隔。跟名冊的「連結」同一套規則。
const urls = (raw) =>
  String(raw || '').split(/[\s,、|]+/).filter(u => /^https?:\/\//.test(u))

export function parseSongsCsv(text) {
  const rows = parseCSV(text)
  if (rows.length < 2) return []
  const head = rows[0].map(x => x.trim())
  const col = finder(head)

  const idx = {
    title: col('歌名', '曲名', 'title'),
    band: col('樂團', '演唱', 'band'),
    album: col('專輯', '收錄', 'album'),
    released: col('發行', '發行日', 'released'),
    lyricist: col('作詞', 'lyricist'),
    composer: col('作曲', 'composer'),
    arranger: col('編曲', 'arranger'),
    links: col('連結', '官方連結', 'links'),
    cover: col('封面', 'cover'),
    aliases: col('別名', '別稱', 'aliases'),
    note: col('備註', 'note'),
  }

  // 歌名那欄找不到就整張放棄。沒有歌名的話每一列都對不到任何一首，
  // 硬解只會產出一堆空殼，比什麼都不做更難查。
  if (idx.title < 0) return []

  const out = []
  const seen = new Set()
  for (const r of rows.slice(1)) {
    const title = cell(r, idx.title)
    const key = songKey(title)
    if (!key || seen.has(key)) continue   // 同一首重複填，用第一列
    seen.add(key)
    out.push({
      key,
      title,
      band: cell(r, idx.band),
      album: cell(r, idx.album),
      released: normalizeDate(cell(r, idx.released)) || cell(r, idx.released),
      lyricist: cell(r, idx.lyricist),
      composer: cell(r, idx.composer),
      arranger: cell(r, idx.arranger),
      links: urls(cell(r, idx.links)),
      // 封面只收單一網址，而且必須是網址 —— 手打的「有」「待補」不要
      // 變成一個破掉的 <img>
      cover: /^https?:\/\//.test(cell(r, idx.cover)) ? cell(r, idx.cover) : '',
      aliases: cell(r, idx.aliases).split(/[,、|]+/).map(s => s.trim()).filter(Boolean),
      note: cell(r, idx.note),
    })
  }
  return out
}

// key → 資料。歌曲頁用它一次查完。
// 別名也一起建索引，Sheet 上填了「春日影 / 春日影（MyGO ver.）」就兩個都查得到。
export function songMetaIndex(list = []) {
  const m = new Map()
  for (const s of list) {
    m.set(s.key, s)
    for (const a of s.aliases) {
      const k = songKey(a)
      if (k && !m.has(k)) m.set(k, s)
    }
  }
  return m
}

// 這首歌有沒有任何一項填了東西。
// 全空的列（只填了歌名）不該讓歌曲頁多長出一塊空白的區域。
export const hasSongMeta = (s) =>
  !!(s && (s.band || s.album || s.released || s.lyricist || s.composer ||
    s.arranger || s.links.length || s.cover || s.note))
