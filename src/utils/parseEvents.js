// CSV → 活動陣列（純函式，瀏覽器與 Node 共用）
// 前端即時抓 Google Sheet、以及 scripts/import-csv.mjs 都用這支。

// ---- 極簡 CSV 解析（支援雙引號、引號內逗號、"" 轉義） ----
export function parseCSV(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  const s = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(x => x.trim() !== ''))
}

// 只用全形頓號／逗號當清單分隔（半形逗號是「Hello, Happy World!」的一部分）
const splitList = (v) =>
  (v || '').split(/[、，]/).map(x => x.trim()).filter(x => x && x !== '—' && x !== '-')

// 照片欄：用換行 / 空白 / 直線 / 頓號分隔（檔名與網址都不含空白）
const splitMedia = (v) =>
  (v || '').split(/[\s,、|]+/).map(x => x.trim()).filter(Boolean)

// 樂團字串正規化：ASCII 斜線 → 全形「／」
const normGroup = (g) => g.trim().replace(/\s*\/\s*/g, '／')

// rows（含表頭）→ 活動陣列（不含手動欄位的合併，交給呼叫端）
export function parseCsvToEvents(text) {
  const rows = parseCSV(text)
  if (rows.length < 2) return []
  const header = rows[0].map(h => h.trim())
  const col = (name) => header.indexOf(name)
  const idx = {
    year: col('年份'), start: col('開始日期'), end: col('結束日期'), month: col('月份'),
    title: col('活動名稱'), type: col('類型'), people: col('人物'),
    groups: col('團體／關聯'), category: col('本體／擦邊'), full: col('全團'),
    count: col('人次'),
    venue: col('地點') >= 0 ? col('地點') : col('venue'),
    city: col('城市') >= 0 ? col('城市') : col('city'),
    photos: col('照片') >= 0 ? col('照片') : col('photos'),
    cover: col('封面') >= 0 ? col('封面') : col('cover'),
    ticketUrl: col('購票連結') >= 0 ? col('購票連結') : col('購票'),
    organizer: col('主辦') >= 0 ? col('主辦') : col('主辦單位'),
    description: col('簡介') >= 0 ? col('簡介') : col('description'),
    impression: col('心得') >= 0 ? col('心得') : col('impression'),
    sources: col('來源') >= 0 ? col('來源') : col('sources'),
  }

  return rows.slice(1).map((r, i) => {
    const number = i + 1
    const get = (k) => (idx[k] >= 0 ? (r[idx[k]] || '').trim() : '')
    return {
      id: `evt-${String(number).padStart(3, '0')}`,
      number,
      year: Number(get('year')) || null,
      startDate: get('start'),
      endDate: get('end') || get('start'),
      month: Number(get('month')) || null,
      title: get('title'),
      type: get('type'),
      people: splitList(get('people')),
      relatedGroups: splitList(get('groups')).map(normGroup),
      category: get('category') || '本體',
      isFullBand: get('full') === '是',
      attendanceCount: Number(get('count')) || 0,
      venue: get('venue'),
      city: get('city'),
      photos: splitMedia(get('photos')),
      cover: get('cover'),
      ticketUrl: get('ticketUrl'),
      organizer: get('organizer'),
      description: get('description'),
      impression: get('impression'),
      sources: splitMedia(get('sources')),
    }
  })
}

// 這些欄位「以 JSON / 手動為準」，即時抓 Sheet 時用內建資料補回來，避免被洗掉
const MANUAL_FIELDS = ['venue', 'city', 'description', 'impression', 'photos', 'sources', 'notes', 'cover', 'ticketUrl', 'organizer']

// 把 Sheet 解析結果與內建資料合併：核心欄位用 Sheet 的，手動欄位用內建的（Sheet 有填則優先）
export function mergeWithBundled(sheetEvents, bundled) {
  const byNumber = new Map(bundled.map(e => [e.number, e]))
  return sheetEvents.map(e => {
    const prev = byNumber.get(e.number)
    if (!prev) return e
    const merged = { ...e }
    for (const f of MANUAL_FIELDS) {
      const sheetVal = e[f]
      const hasSheetVal = Array.isArray(sheetVal) ? sheetVal.length > 0 : !!sheetVal
      if (!hasSheetVal && prev[f] != null) merged[f] = prev[f]
    }
    return merged
  })
}
