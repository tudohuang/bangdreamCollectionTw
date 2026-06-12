// build 後處理（postbuild）：為每場活動產生
//   1) dist/og/<id>.png  — 1200×630 樂團色 OG 分享預覽圖
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

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '')

if (!existsSync(DIST)) {
  console.log('（跳過 OG：尚未 build，找不到 dist/）')
  process.exit(0)
}

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
function wrap(text, maxUnits, maxLines) {
  const lines = []
  let line = '', units = 0
  for (const ch of text) {
    const w = /[\x00-\xff]/.test(ch) ? 1 : 2
    if (units + w > maxUnits) {
      lines.push(line); line = ''; units = 0
      if (lines.length >= maxLines) break
    }
    line += ch; units += w
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines) {
    // 還有剩 → 末行加省略號
    const consumed = lines.join('').length
    if (consumed < [...text].length) lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…')
  }
  return lines
}

const primaryMetaOf = (e) => BAND_META[bandKey((e.relatedGroups || [])[0] || '')] || BAND_META.other

function ogSvg(e) {
  const m = primaryMetaOf(e)
  const dex = `#${String(e.number ?? 0).padStart(3, '0')}`
  const personal = e.category === '擦邊'
  const titleLines = wrap(e.title || '未命名活動', 34, 3)
  const date = e.startDate === e.endDate ? e.startDate : `${e.startDate} → ${e.endDate}`
  const meta = [date, e.type, personal ? '個人來台' : m.name].filter(Boolean).join('   ·   ')
  const people = (e.people || []).slice(0, 6).join('、')

  const titleSvg = titleLines.map((ln, i) =>
    `<text x="80" y="${292 + i * 78}" font-size="64" font-weight="800" fill="#ffffff" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">${esc(ln)}</text>`
  ).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${m.color}"/>
      <stop offset="0.55" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="#1a1233" opacity="0.18"/>
  <circle cx="1050" cy="120" r="220" fill="#ffffff" opacity="0.10"/>
  <circle cx="120" cy="560" r="180" fill="#ffffff" opacity="0.08"/>
  <text x="80" y="96" font-size="30" font-weight="700" fill="#ffffff" opacity="0.92" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">邦邦來台圖鑑 · Taiwan BanG Dream!</text>
  <text x="1120" y="110" text-anchor="end" font-size="58" font-weight="800" fill="#ffffff" font-family="sans-serif">${esc(dex)}</text>
  <rect x="80" y="150" width="${24 + (personal ? '個人來台' : m.name).length * 26}" height="56" rx="28" fill="#ffffff" opacity="0.22"/>
  <text x="104" y="188" font-size="30" font-weight="700" fill="#ffffff" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">${esc(personal ? '個人來台' : m.name)}</text>
  ${titleSvg}
  <text x="80" y="556" font-size="30" fill="#ffffff" opacity="0.95" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">${esc(meta)}</text>
  ${people ? `<text x="80" y="600" font-size="26" fill="#ffffff" opacity="0.80" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">🎤 ${esc(people)}</text>`.replace('🎤 ', '') : ''}
</svg>`
}

function renderPng(svg, outPath) {
  if (!Resvg) return false
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: true } })
  writeFileSync(outPath, r.render().asPng())
  return true
}

// 分享頁 stub
function stubHtml(e) {
  const m = primaryMetaOf(e)
  const dex = `#${String(e.number ?? 0).padStart(3, '0')}`
  const title = `${dex} ${e.title || '未命名活動'}`
  const date = e.startDate === e.endDate ? e.startDate : `${e.startDate} → ${e.endDate}`
  const desc = [date, e.type, e.category === '擦邊' ? '個人來台' : m.name, (e.people || []).join('、')]
    .filter(Boolean).join(' · ')
  const img = `${SITE_URL}/og/${e.id}.png`
  const url = `${SITE_URL}/#/event/${e.id}`
  return `<!doctype html><html lang="zh-Hant"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}｜邦邦來台圖鑑</title>
<meta name="description" content="${esc(desc)}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(img)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
${SITE_URL ? `<meta property="og:url" content="${esc(url)}"/>` : ''}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(img)}"/>
<link rel="canonical" href="${esc(url || `../#/event/${e.id}`)}"/>
<script>location.replace('../#/event/${e.id}');</script>
</head><body>前往 <a href="../#/event/${e.id}">${esc(title)}</a>…</body></html>`
}

// Vercel 上由 api/share.js 即時處理 /e/<id>，不需靜態 stub
const ON_VERCEL = !!process.env.VERCEL

mkdirSync(join(DIST, 'og'), { recursive: true })
if (!ON_VERCEL) mkdirSync(join(DIST, 'e'), { recursive: true })

let pngCount = 0
for (const e of events) {
  if (renderPng(ogSvg(e), join(DIST, 'og', `${e.id}.png`))) pngCount++
  if (!ON_VERCEL) writeFileSync(join(DIST, 'e', `${e.id}.html`), stubHtml(e), 'utf8')
}

// 預設 OG 圖 + 注入 index.html
const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#818cf8"/><stop offset="1" stop-color="#4f46e5"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1040" cy="130" r="220" fill="#ffffff" opacity="0.12"/>
  <text x="600" y="300" text-anchor="middle" font-size="96" font-weight="800" fill="#ffffff" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">邦邦來台圖鑑</text>
  <text x="600" y="380" text-anchor="middle" font-size="40" fill="#ffffff" opacity="0.95" font-family="sans-serif">Taiwan BanG Dream! Event Collection</text>
  <text x="600" y="450" text-anchor="middle" font-size="30" fill="#ffffff" opacity="0.85" font-family="sans-serif">2018 — 2026</text>
</svg>`
renderPng(defaultSvg, join(DIST, 'og-default.png'))

const idxPath = join(DIST, 'index.html')
let idx = readFileSync(idxPath, 'utf8')
const ogTags = [
  `<meta property="og:image" content="${SITE_URL}/og-default.png"/>`,
  `<meta property="og:image:width" content="1200"/>`,
  `<meta property="og:image:height" content="630"/>`,
  `<meta name="twitter:card" content="summary_large_image"/>`,
  `<meta name="twitter:image" content="${SITE_URL}/og-default.png"/>`,
].join('\n    ')
if (!idx.includes('og:image')) idx = idx.replace('</head>', `    ${ogTags}\n  </head>`)
writeFileSync(idxPath, idx, 'utf8')

// sitemap.xml + robots.txt（#20）
const base = SITE_URL || ''
const urls = [`${base}/`, ...events.map(e => `${base}/e/${e.id}${ON_VERCEL ? '' : '.html'}`)]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`
writeFileSync(join(DIST, 'sitemap.xml'), sitemap, 'utf8')
writeFileSync(join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}`, 'utf8')

console.log(`✓ OG：${events.length} 個分享頁、${pngCount} 張預覽圖${SITE_URL ? `（網域 ${SITE_URL}）` : '（未設 SITE_URL，og:image 為相對路徑）'}`)
console.log(`✓ sitemap.xml（${urls.length} 連結）+ robots.txt`)
