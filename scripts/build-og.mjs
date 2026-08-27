// build 後處理（postbuild）：為每場活動產生
//   1) dist/og/<id>.jpg  — 1200×630 的 SNS 分享預覽圖
//   2) dist/e/<id>.html  — 帶正確 og:title/description/image 的靜態分享頁，
//                          開啟後自動轉址回 SPA 的 #/event/<id>
// 並把預設 OG 圖注入 dist/index.html。
//
// 設定網域（讓 og:image / og:url 變絕對網址，分享才會顯示縮圖）：
//   SITE_URL=https://your-name.github.io/bangdream-tw  npm run build

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { BAND_META, bandKey } from '../src/utils/bands.js'
import { renderEntryPage, renderProfilePage } from '../src/server/entryPage.js'
import { personBandMap } from '../src/utils/derive.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
// 網址從哪來（依序）：
//   1. SITE_URL          自訂網域時手動設
//   2. VERCEL_PROJECT_PRODUCTION_URL   Vercel 免費給的 xxx.vercel.app，每次部署都一樣
//   3. CF_PAGES_URL      Cloudflare Pages 的部署網址
//
// 有第 2 項就不用手動設任何東西 —— 不買網域也能有 sitemap 與絕對路徑的 og:image。
// 用 PRODUCTION_URL 而不是 VERCEL_URL：後者每次部署都不一樣，
// 拿它當 canonical 會讓搜尋引擎每次都看到新網址。
const rawSiteUrl =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  process.env.CF_PAGES_URL ||
  // 最後才用 VERCEL_URL：它每次部署都不一樣，當 canonical 會讓搜尋引擎
  // 每次看到新網址。但有總比沒有好 —— 沒有的話連 sitemap 都不會產。
  (process.env.VERCEL_URL && 'https://' + process.env.VERCEL_URL) ||
  ''
const SITE_URL = rawSiteUrl.replace(new RegExp(String.fromCharCode(47) + '$'), '')

// 印出網址是從哪個變數來的 —— sitemap 沒產出來時，這一行就是第一個要看的地方
const urlFrom =
  process.env.SITE_URL ? 'SITE_URL' :
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'VERCEL_PROJECT_PRODUCTION_URL' :
  process.env.CF_PAGES_URL ? 'CF_PAGES_URL' :
  process.env.VERCEL_URL ? 'VERCEL_URL（每次部署都不同，建議改設 SITE_URL）' :
  '（沒有任何來源）'
console.log('網址來源：' + urlFrom + ' → ' + (SITE_URL || '(空)'))

if (!existsSync(DIST)) {
  console.log('（跳過 OG：尚未 build，找不到 dist/）')
  process.exit(0)
}

let sharp = null
try { ({ default: sharp } = await import('sharp')) } catch { /* 沒有就輸出 PNG */ }

let Resvg
try {
  ({ Resvg } = await import('@resvg/resvg-js'))
} catch {
  console.log('（跳過 OG 圖：未安裝 @resvg/resvg-js）')
}

const events = JSON.parse(readFileSync(join(ROOT, 'src/data/events.json'), 'utf8'))

const esc = (s = '') => String(s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// CJK 友善斷行（以「視覺寬度」估算，全形 2、半形 1）
// 標題換行。
//
// 原本是按字元數硬切，不管是不是在單詞中間 —— 所以
// 「DREAMS GO ON」會被切成「DRE / AMS GO ON」，看起來就是壞的。
// 中文可以在任何地方斷，英數不行，所以先切成「可斷的片段」再組。
function wrap(text, maxUnits, maxLines) {
  const width = (s) => [...s].reduce((n, ch) => n + (/[\x00-\xff]/.test(ch) ? 1 : 2), 0)

  // 切成片段：連續的英數視為一個不可拆的字，中文一字一片段
  const chunks = String(text).match(/[A-Za-z0-9][A-Za-z0-9'’.!?&:-]*|s+|[^s]/g) || []

  const lines = []
  let line = ''
  let overflow = false
  for (const chunk of chunks) {
    if (lines.length >= maxLines) { overflow = true; break }
    // 行首不留空白
    if (!line && /^s+$/.test(chunk)) continue
    const next = line + chunk
    if (width(next) <= maxUnits) { line = next; continue }
    // 單一個字就超過一行寬（超長英文）→ 只好硬切
    if (!line && width(chunk) > maxUnits) {
      let take = ''
      for (const ch of chunk) {
        if (width(take + ch) > maxUnits) break
        take += ch
      }
      lines.push(take)
      line = chunk.slice(take.length)
      continue
    }
    lines.push(line.trim())
    line = /^s+$/.test(chunk) ? '' : chunk
  }
  if (line.trim()) {
    if (lines.length < maxLines) lines.push(line.trim())
    else overflow = true
  }

  // 收尾標點不該落在行首（中文排版的禁則）。把它拉回上一行 ——
  // 「」）』】 掛在下一行開頭看起來就是排版壞掉。
  const CLOSERS = '」』）】〉》，、。：；!?'
  for (let k = 1; k < lines.length; k++) {
    while (lines[k] && CLOSERS.includes(lines[k][0])) {
      lines[k - 1] += lines[k][0]
      lines[k] = lines[k].slice(1)
    }
  }

  // 有字沒放進去 → 末行加省略號
  if (overflow && lines.length) {
    const last = lines[lines.length - 1]
    lines[lines.length - 1] = last.slice(0, Math.max(1, last.length - 1)) + '…'
  }
  return lines
}

const primaryMetaOf = (e) => BAND_META[bandKey((e.relatedGroups || [])[0] || '')] || BAND_META.other

function ogSvg(e, coverUri = null) {
  const m = primaryMetaOf(e)
  const dex = `#${String(e.number ?? 0).padStart(3, '0')}`
  const personal = e.category === '擦邊'
  const titleLines = wrap(e.title || '未命名活動', 30, 3)
  const date = e.startDate === e.endDate ? e.startDate : `${e.startDate} → ${e.endDate}`
  const meta = [date, e.type, personal ? '個人來台' : m.name].filter(Boolean).join('   ·   ')
  const people = (e.people || []).slice(0, 6).join('、')

  // 壓在花俏海報上要有陰影才讀得出來
  const titleSvg = titleLines.map((ln, i) =>
    `<text x="80" y="${300 + i * 74}" font-size="60" font-weight="800" fill="#ffffff" filter="url(#tsh)" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">${esc(ln)}</text>`
  ).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${m.color}"/>
      <stop offset="0.55" stop-color="#a855f7"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
    <!-- 由左而右的遮罩：文字都在左側，那邊要壓夠深才讀得出來；
         右側留亮，海報還是看得到。原本只有上下漸層，壓不住花俏的主視覺 -->
    <linearGradient id="scrimX" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0a0616" stop-opacity="0.94"/>
      <stop offset="0.42" stop-color="#0a0616" stop-opacity="0.86"/>
      <stop offset="0.70" stop-color="#0a0616" stop-opacity="0.46"/>
      <stop offset="1" stop-color="#0a0616" stop-opacity="0.20"/>
    </linearGradient>
    <linearGradient id="scrimY" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0616" stop-opacity="0.30"/>
      <stop offset="0.34" stop-color="#0a0616" stop-opacity="0.08"/>
      <stop offset="0.80" stop-color="#0a0616" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#0a0616" stop-opacity="0.66"/>
    </linearGradient>
    <!-- 頂帶：站名與編號那一列要有自己的底。
         少了它，原圖的上緣會從標題上方漏出來，看起來像貼歪的另一塊 -->
    <linearGradient id="topBar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0616" stop-opacity="0.88"/>
      <stop offset="0.72" stop-color="#0a0616" stop-opacity="0.80"/>
      <stop offset="1" stop-color="#0a0616" stop-opacity="0"/>
    </linearGradient>
    <filter id="tsh" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000000" flood-opacity="0.75"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${coverUri ? `
  <image href="${coverUri}" x="0" y="0" width="1200" height="630"
         preserveAspectRatio="xMidYMid slice"/>
  <rect width="1200" height="630" fill="url(#scrimX)"/>
  <rect width="1200" height="630" fill="url(#scrimY)"/>
  <rect width="1200" height="150" fill="url(#topBar)"/>
  <rect x="0" y="0" width="14" height="630" fill="${m.color}"/>` : `
  <rect width="1200" height="630" fill="#1a1233" opacity="0.18"/>
  <circle cx="1050" cy="120" r="220" fill="#ffffff" opacity="0.10"/>
  <circle cx="120" cy="560" r="180" fill="#ffffff" opacity="0.08"/>`}
  <text x="80" y="96" font-size="30" font-weight="700" fill="#ffffff" opacity="0.92" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">邦邦來台圖鑑 · Taiwan BanG Dream!</text>
  <text x="1120" y="110" text-anchor="end" font-size="58" font-weight="800" fill="#ffffff" font-family="sans-serif">${esc(dex)}</text>
  <rect x="80" y="150" width="${24 + (personal ? '個人來台' : m.name).length * 26}" height="56" rx="28" fill="#ffffff" opacity="0.22"/>
  <text x="104" y="188" font-size="30" font-weight="700" fill="#ffffff" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">${esc(personal ? '個人來台' : m.name)}</text>
  ${titleSvg}
  <text x="80" y="556" font-size="30" fill="#ffffff" opacity="0.95" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">${esc(meta)}</text>
  ${people ? `<text x="80" y="600" font-size="26" fill="#ffffff" opacity="0.80" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">🎤 ${esc(people)}</text>`.replace('🎤 ', '') : ''}
</svg>`
}

// JPEG 轉檔是非同步的，收集起來最後一起等
const pending = []

// OG 圖輸出。
//
// resvg 只吐 PNG，而 1200×630 疊上動漫海報的 PNG 會到 1 MB ——
// Twitter 的上限是 5 MB，但那麼大的圖抓取會慢、預覽常常來不及顯示。
// 所以一律轉成 JPEG，通常小一個數量級。
//
// 沒有 sharp 就整個跳過不產圖 —— 寧可沒有 og:image，
// 也不要輸出副檔名與內容對不上的檔案（有些平台會直接拒絕）。
function renderPng(svg, outPath) {
  if (!Resvg || !sharp) return false
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: true } })
  const png = r.render().asPng()
  pending.push(
    sharp(png).jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer()
      .then(buf => writeFileSync(outPath, buf))
      .catch(() => {}))
  return true
}



// ---- 封面照抓下來當 OG 底圖（resvg 不會自己抓遠端圖，得先轉成 data URI） ----
const COVER_TIMEOUT = 8000

async function fetchCoverDataUri(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), COVER_TIMEOUT)
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0' } })
    clearTimeout(t)
    if (!r.ok) return null
    const type = (r.headers.get('content-type') || '').split(';')[0]
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return null
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length < 1024 || buf.length > 6 * 1024 * 1024) return null   // 太小是錯誤頁、太大不值得
    // resvg 不支援 webp，只有 jpeg/png 能用
    if (type === 'image/webp') return null
    return `data:${type};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}


// 有 serverless 的平台（Cloudflare Pages）由 functions/e/[id].js 即時處理 /e/<id>，
// 不需要 build 時的靜態 stub；純靜態主機（GitHub Pages）才要
const ON_EDGE = !!(process.env.CF_PAGES || process.env.VERCEL)

// 角色對照與本地封面清單，靜態頁要用
const rosterMap = personBandMap(events)
let coversManifest = {}
try { coversManifest = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'covers.json'), 'utf8')) } catch {}

mkdirSync(join(DIST, 'og'), { recursive: true })
if (!ON_EDGE) mkdirSync(join(DIST, 'e'), { recursive: true })

// 封面照併發抓取（抓不到就退回樂團色底，不擋 build）
const COVER_CONCURRENCY = 6
const coverUris = new Map()
{
  const queue = events.filter(e => e.cover)
  let i = 0
  await Promise.all(Array.from({ length: COVER_CONCURRENCY }, async () => {
    while (i < queue.length) {
      const e = queue[i++]
      const uri = await fetchCoverDataUri(e.cover)
      if (uri) coverUris.set(e.id, uri)
    }
  }))
}

let pngCount = 0
for (const e of events) {
  if (renderPng(ogSvg(e, coverUris.get(e.id)), join(DIST, 'og', `${e.id}.jpg`))) pngCount++
  // 靜態主機：產出真的有內容的條目頁（Vercel / Cloudflare 由函式即時產同一份）
  if (!ON_EDGE) {
    writeFileSync(join(DIST, 'e', `${e.id}.html`), renderEntryPage({
      event: e, origin: SITE_URL,
      roleOf: (n) => rosterMap.get(n),
      hasLocalCover: !!coversManifest[String(e.stableId ?? e.number).padStart(3, '0')],
    }), 'utf8')
  }
}

// ---- 聲優／樂團的分享頁與 OG 圖 ----
const rootGroupOf = (g) => String(g).split('／')[0].trim()
const profiles = []
{
  const byPerson = new Map(), byBand = new Map()
  for (const e of events) {
    for (const p of (e.people || [])) {
      if (!byPerson.has(p)) byPerson.set(p, [])
      byPerson.get(p).push(e)
    }
    for (const g of new Set((e.relatedGroups || []).map(rootGroupOf).filter(Boolean))) {
      if (!byBand.has(g)) byBand.set(g, [])
      byBand.get(g).push(e)
    }
  }
  for (const [name, list] of byPerson) profiles.push({ kind: 'person', name, list })
  for (const [name, list] of byBand) profiles.push({ kind: 'band', name, list })
}

function profileSvg({ kind, name, list }) {
  const m = BAND_META[bandKey((list[0]?.relatedGroups || [])[0] || '')] || BAND_META.other
  const years = list.map(e => e.year).filter(Boolean).sort((a, b) => a - b)
  const span = years.length ? (years[0] === years[years.length - 1] ? `${years[0]}` : `${years[0]}–${years[years.length - 1]}`) : ''
  const nameLines = wrap(name, 22, 2)

  // 中間別留一大塊空白：人 → 常同台的樂團；團 → 登場過的聲優
  const rel = {}
  for (const e of list) {
    const src = kind === 'person'
      ? (e.relatedGroups || []).map(g => String(g).split('／')[0].trim())
      : (e.people || [])
    for (const x of new Set(src.filter(Boolean))) rel[x] = (rel[x] || 0) + 1
  }
  const relTop = Object.entries(rel).sort((a, b) => b[1] - a[1]).slice(0, kind === 'person' ? 3 : 5).map(([k]) => k)
  const relLine = relTop.length
    ? wrap(`${kind === 'person' ? '常見於' : '登場聲優'}   ${relTop.join('、')}`, 40, 1)[0]
    : ''
  const latest = [...list].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))[0]
  const latestLine = latest ? wrap(`最近   ${latest.startDate || ''}   ${latest.title || ''}`, 44, 1)[0] : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${m.color}"/>
      <stop offset="0.6" stop-color="#a855f7"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="#1a1233" opacity="0.2"/>
  <circle cx="1060" cy="110" r="230" fill="#ffffff" opacity="0.10"/>
  <text x="80" y="96" font-size="30" font-weight="700" fill="#ffffff" opacity="0.92" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">邦邦來台圖鑑 · Taiwan BanG Dream!</text>
  <text x="80" y="190" font-size="32" font-weight="700" fill="#ffffff" opacity="0.85" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">${kind === 'person' ? '聲優' : '樂團'}</text>
  ${nameLines.map((ln, i) => `<text x="80" y="${300 + i * 88}" font-size="76" font-weight="800" fill="#ffffff" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">${esc(ln)}</text>`).join('')}
  ${relLine ? `<text x="80" y="${300 + nameLines.length * 88 - 20}" font-size="30" fill="#ffffff" opacity="0.86" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">${esc(relLine)}</text>` : ''}
  ${latestLine ? `<text x="80" y="${300 + nameLines.length * 88 + 26}" font-size="26" fill="#ffffff" opacity="0.7" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">${esc(latestLine)}</text>` : ''}
  <rect x="80" y="500" width="${String(list.length).length * 30 + 240}" height="66" rx="33" fill="#ffffff" opacity="0.16"/>
  <text x="108" y="546" font-size="46" font-weight="800" fill="#ffffff" font-family="sans-serif">${list.length}</text>
  <text x="${108 + String(list.length).length * 28 + 10}" y="544" font-size="28" fill="#ffffff" opacity="0.95" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">場來台紀錄${span ? `   ·   ${span}` : ''}</text>
</svg>`
}


// 檔名安全的 slug（中文/日文檔名在部分主機會出事，用編碼過的短碼）
function slug(name) {
  return Buffer.from(name, 'utf8').toString('base64url')
}

// 名字裡有這些字元就沒辦法當檔名（Vercel 上由 api/share.js 即時處理，不受影響）
const UNSAFE_PATH = /[\\/:*?"<>|]/

let profilePng = 0
const skippedStubs = []
if (!ON_EDGE) { mkdirSync(join(DIST, 'p'), { recursive: true }); mkdirSync(join(DIST, 'b'), { recursive: true }) }
for (const pr of profiles) {
  const seg = pr.kind === 'person' ? 'p' : 'b'
  if (renderPng(profileSvg(pr), join(DIST, 'og', `${seg}-${slug(pr.name)}.jpg`))) profilePng++
  if (ON_EDGE) continue
  if (UNSAFE_PATH.test(pr.name)) { skippedStubs.push(pr.name); continue }
  // 檔名要用原字（UTF-8）。網址是 percent-encoded，靜態主機會先解碼再找檔，
  // 若把檔名也寫成 %E6%84%9B%E7%BE%8E.html 就永遠對不上。
  writeFileSync(join(DIST, seg, `${pr.name}.html`), renderProfilePage({
    kind: pr.kind, name: pr.name, events: pr.list, origin: SITE_URL,
    roleOf: (n) => rosterMap.get(n),
  }), 'utf8')
}
if (skippedStubs.length) {
  console.log(`⚠ ${skippedStubs.length} 個名字含有無法當檔名的字元，靜態分享頁已略過：${skippedStubs.join('、')}`)
  console.log('  （Vercel 上由 api/share.js 即時處理，不受影響。建議把 Sheet 的「人物」欄拆成兩個人。）')
}

// 預設 OG 圖 + 注入 index.html
const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ec4899"/><stop offset="1" stop-color="#7c3aed"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1040" cy="130" r="220" fill="#ffffff" opacity="0.12"/>
  <text x="600" y="300" text-anchor="middle" font-size="96" font-weight="800" fill="#ffffff" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">邦邦來台圖鑑</text>
  <text x="600" y="380" text-anchor="middle" font-size="40" fill="#ffffff" opacity="0.95" font-family="sans-serif">Taiwan BanG Dream! Event Collection</text>
  <text x="600" y="450" text-anchor="middle" font-size="30" fill="#ffffff" opacity="0.85" font-family="sans-serif">2018 — 2026</text>
</svg>`
renderPng(defaultSvg, join(DIST, 'og-default.jpg'))

const idxPath = join(DIST, 'index.html')
let idx = readFileSync(idxPath, 'utf8')
// 首頁的絕對網址標籤在這裡注入，不寫死在 index.html ——
// 寫死的話會蓋掉自動偵測，分享出去的縮圖指向不存在的網域。
if (SITE_URL) {
  const ogTags = [
    '<meta property="og:url" content="' + SITE_URL + '/"/>',
    '<meta property="og:image" content="' + SITE_URL + '/og-default.jpg"/>',
    '<meta property="og:image:width" content="1200"/>',
    '<meta property="og:image:height" content="630"/>',
    '<meta name="twitter:image" content="' + SITE_URL + '/og-default.jpg"/>',
  ].join(String.fromCharCode(10) + '    ')
  idx = idx.replace('</head>', '    ' + ogTags + String.fromCharCode(10) + '  </head>')
}
writeFileSync(idxPath, idx, 'utf8')

// JPEG 轉檔是非同步的，要等它們寫完才算 build 結束
await Promise.all(pending)

// ---------------------------------------------------------------- sitemap + robots
//
// sitemap 的 <loc> 一定要是絕對網址 —— 規格如此，相對路徑會讓整份被忽略。
// 沒設 SITE_URL 時乾脆不要產，不然是在騙自己「有 sitemap」。
const base = SITE_URL || ''
const NL = String.fromCharCode(10)
if (base) {
  // 人物與樂團頁也要進 sitemap：搜「某位聲優 台北」的人最該落地在那裡
  const ext = ON_EDGE ? '' : '.html'
  const urls = [
    { loc: base + '/', pr: '1.0' },
    ...events.map(e => ({ loc: base + '/e/' + e.id + ext, pr: '0.8' })),
    ...profiles.map(x => ({
      loc: base + '/' + (x.kind === 'person' ? 'p' : 'b') + '/' + encodeURIComponent(x.name) + ext,
      pr: '0.7',
    })),
  ]
  const body = urls
    .map(u => '  <url><loc>' + u.loc + '</loc><priority>' + u.pr + '</priority></url>')
    .join(NL)
  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>' + NL +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + NL +
    body + NL + '</urlset>' + NL
  writeFileSync(join(DIST, 'sitemap.xml'), sitemap, 'utf8')
  writeFileSync(join(DIST, 'robots.txt'),
    'User-agent: *' + NL + 'Allow: /' + NL + 'Sitemap: ' + base + '/sitemap.xml' + NL, 'utf8')
  console.log('✓ sitemap.xml（' + urls.length + ' 個絕對網址，含人物與樂團頁）+ robots.txt')
} else {
  writeFileSync(join(DIST, 'robots.txt'), 'User-agent: *' + NL + 'Allow: /' + NL, 'utf8')
  console.log('（本機沒有網址，跳過 sitemap；部署到 Vercel 會自動用 xxx.vercel.app）')
}

console.log(`✓ OG：${events.length} 個場次分享頁、${pngCount} 張預覽圖（其中 ${coverUris.size} 張用真的封面照）${SITE_URL ? `（網域 ${SITE_URL}）` : '（未設 SITE_URL，og:image 為相對路徑）'}`)
console.log(`✓ OG：${profiles.length} 個聲優／樂團分享頁、${profilePng} 張預覽圖`)
