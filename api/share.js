// Vercel serverless function：/e/<id> 即時抓 Sheet → 回正確 OG 標題/描述 → 轉址回 App。
// （純附加；GitHub Pages 部署不會用到這支，改用建置時的靜態 stub。）
import { readFileSync } from 'node:fs'
import { SHEET_CSV_URL } from '../src/config.js'
import { parseCsvToEvents } from '../src/utils/parseEvents.js'
import { bandKey, BAND_META } from '../src/utils/bands.js'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// 只有「內建」活動在 build 時產過 /og/<id>.png；Sheet 之後新增的場次沒有對應圖檔，
// 退回品牌預設圖，避免 og:image 指到 404。
let BUNDLED_IDS = new Set()
try {
  BUNDLED_IDS = new Set(
    JSON.parse(readFileSync(new URL('../src/data/events.json', import.meta.url), 'utf8')).map(e => e.id))
} catch { /* 讀不到就一律走預設圖 */ }

const rootGroupOf = (g) => String(g).split('／')[0].trim()
const slug = (name) => Buffer.from(String(name), 'utf8').toString('base64url')

export default async function handler(req, res) {
  const q = req.query || {}
  const kind = String(q.kind || 'event')         // event | person | band
  const id = String(q.id || '')
  const value = String(q.value || '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${req.headers.host}`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')

  // ---- 聲優／樂團 ----
  if (kind === 'person' || kind === 'band') {
    const appUrl = `${origin}/#/${kind}/${encodeURIComponent(value)}`
    let list = []
    try {
      if (SHEET_CSV_URL) {
        const r = await fetch(SHEET_CSV_URL)
        if (r.ok) {
          const all = parseCsvToEvents(await r.text())
          list = all.filter(e => kind === 'person'
            ? (e.people || []).includes(value)
            : (e.relatedGroups || []).some(g => rootGroupOf(g) === value))
        }
      }
    } catch { /* 抓失敗就走預設 */ }

    if (!list.length) {
      return res.status(200).send(
        `<!doctype html><meta charset="UTF-8"><script>location.replace(${JSON.stringify(`/#/${kind}/${encodeURIComponent(value)}`)})</script>`)
    }
    const years = list.map(e => e.year).filter(Boolean).sort((a, b) => a - b)
    const title = `${value}｜${kind === 'person' ? '聲優' : '樂團'}來台紀錄`
    const desc = `${list.length} 場來台紀錄${years.length ? ` · ${years[0]}–${years[years.length - 1]}` : ''}`
    const img = `${origin}/og/${kind === 'person' ? 'p' : 'b'}-${slug(value)}.png`
    return res.status(200).send(`<!doctype html><html lang="zh-Hant"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}｜邦邦來台圖鑑</title>
<meta name="description" content="${esc(desc)}"/>
<meta property="og:type" content="profile"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(img)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="${esc(appUrl)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(img)}"/>
<link rel="canonical" href="${esc(appUrl)}"/>
<script>location.replace(${JSON.stringify(`/#/${kind}/${encodeURIComponent(value)}`)})</script>
</head><body>前往 <a href="${esc(appUrl)}">${esc(title)}</a>…</body></html>`)
  }

  // ---- 單一場次 ----
  const appUrl = `${origin}/#/event/${id}`

  let event = null
  try {
    if (SHEET_CSV_URL) {
      const r = await fetch(SHEET_CSV_URL)
      if (r.ok) event = parseCsvToEvents(await r.text()).find(e => e.id === id)
    }
  } catch { /* 抓失敗就走預設 */ }

  if (!event) {
    return res.status(200).send(
      `<!doctype html><meta charset="UTF-8"><script>location.replace(${JSON.stringify('/#/event/' + id)})</script>`)
  }

  const meta = BAND_META[bandKey((event.relatedGroups || [])[0] || '')] || BAND_META.other
  const dex = `#${String(event.number ?? 0).padStart(3, '0')}`
  const title = `${dex} ${event.title || '未命名活動'}`
  const date = event.startDate === event.endDate ? event.startDate : `${event.startDate} → ${event.endDate}`
  const desc = [date, event.type, event.category === '擦邊' ? '個人來台' : meta.name, (event.people || []).join('、')]
    .filter(Boolean).join(' · ')
  const img = BUNDLED_IDS.has(id) ? `${origin}/og/${id}.png` : `${origin}/og-default.png`

  res.status(200).send(`<!doctype html><html lang="zh-Hant"><head>
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
<meta property="og:url" content="${esc(appUrl)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${esc(img)}"/>
<link rel="canonical" href="${esc(appUrl)}"/>
<script>location.replace(${JSON.stringify('/#/event/' + id)})</script>
</head><body>前往 <a href="${esc(appUrl)}">${esc(title)}</a>…</body></html>`)
}
