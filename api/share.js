// Vercel serverless function：/e/<id> 即時抓 Sheet → 回正確 OG 標題/描述 → 轉址回 App。
// （純附加；GitHub Pages 部署不會用到這支，改用建置時的靜態 stub。）
import { SHEET_CSV_URL } from '../src/config.js'
import { parseCsvToEvents } from '../src/utils/parseEvents.js'
import { bandKey, BAND_META } from '../src/utils/bands.js'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export default async function handler(req, res) {
  const id = String((req.query && req.query.id) || '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${req.headers.host}`
  const appUrl = `${origin}/#/event/${id}`

  let event = null
  try {
    if (SHEET_CSV_URL) {
      const r = await fetch(SHEET_CSV_URL)
      if (r.ok) event = parseCsvToEvents(await r.text()).find(e => e.id === id)
    }
  } catch { /* 抓失敗就走預設 */ }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')

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
  const img = `${origin}/og/${id}.png`

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
