// 分享頁（/e/<id>、/p/<聲優>、/b/<樂團>）的 HTML。
//
// 為什麼需要這支：網站是 hash 路由（#/event/xxx），而 # 後面的東西永遠不會送到伺服器，
// 所以爬蟲抓不到個別場次的標題。這裡先回一頁帶正確 og:* 的 HTML 給爬蟲，
// 真人則被 location.replace 立刻送進 App。
//
// 只用 Web 標準 API（fetch / TextEncoder / btoa），所以在 Cloudflare Workers 跑得動。
// import attribute 是為了讓這支在「純 Node」也載得動（Vercel 的 runtime 需要）；
// Cloudflare 與 Vite 會自己打包，有沒有都行
import bundled from '../data/events.json' with { type: 'json' }
import { SHEET_CSV_URL } from '../config.js'
import { parseCsvToEvents } from '../utils/parseEvents.js'
import { bandKey, BAND_META } from '../utils/bands.js'

const BUNDLED_IDS = new Set(bundled.map(e => e.id))

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const rootGroupOf = (g) => String(g).split('／')[0].trim()

// 檔名安全的短碼；要跟 scripts/build-og.mjs 產檔名時用的算法一致
const slug = (name) => {
  const bytes = new TextEncoder().encode(String(name))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// 抓不到 Sheet 就回一頁只做轉址的極簡 HTML，不要讓分享連結整個壞掉
const redirectOnly = (hash) =>
  `<!doctype html><meta charset="UTF-8"><script>location.replace(${JSON.stringify(hash)})</script>`

const page = ({ title, desc, img, appUrl, hash, type }) => `<!doctype html><html lang="zh-Hant"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}｜邦邦來台圖鑑</title>
<meta name="description" content="${esc(desc)}"/>
<meta property="og:type" content="${type}"/>
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
<script>location.replace(${JSON.stringify(hash)})</script>
</head><body>前往 <a href="${esc(appUrl)}">${esc(title)}</a>…</body></html>`

async function fetchEvents() {
  if (!SHEET_CSV_URL) return bundled
  try {
    const r = await fetch(SHEET_CSV_URL)
    if (!r.ok) return bundled
    const parsed = parseCsvToEvents(await r.text())
    return parsed.length ? parsed : bundled
  } catch {
    return bundled
  }
}

// kind: 'event' | 'person' | 'band'
export async function renderSharePage({ kind, id = '', value = '', origin }) {
  const events = await fetchEvents()

  if (kind === 'person' || kind === 'band') {
    const hash = `/#/${kind}/${encodeURIComponent(value)}`
    const list = events.filter(e => kind === 'person'
      ? (e.people || []).includes(value)
      : (e.relatedGroups || []).some(g => rootGroupOf(g) === value))
    if (!list.length) return redirectOnly(hash)

    const years = list.map(e => e.year).filter(Boolean).sort((a, b) => a - b)
    return page({
      type: 'profile',
      hash,
      appUrl: `${origin}${hash.slice(1)}`,
      title: `${value}｜${kind === 'person' ? '聲優' : '樂團'}來台紀錄`,
      desc: `${list.length} 場來台紀錄${years.length ? ` · ${years[0]}–${years[years.length - 1]}` : ''}`,
      img: `${origin}/og/${kind === 'person' ? 'p' : 'b'}-${slug(value)}.png`,
    })
  }

  const hash = `/#/event/${id}`
  const event = events.find(e => e.id === id)
  if (!event) return redirectOnly(hash)

  const meta = BAND_META[bandKey((event.relatedGroups || [])[0] || '')] || BAND_META.other
  const dex = `#${String(event.number ?? 0).padStart(3, '0')}`
  const date = event.startDate === event.endDate ? event.startDate : `${event.startDate} → ${event.endDate}`
  return page({
    type: 'article',
    hash,
    appUrl: `${origin}${hash.slice(1)}`,
    title: `${dex} ${event.title || '未命名活動'}`,
    desc: [date, event.type, event.category === '擦邊' ? '個人來台' : meta.name, (event.people || []).join('、')]
      .filter(Boolean).join(' · '),
    // OG 圖是 build 時產的，只有內建那批有；Sheet 後來新增的場次退回預設圖
    img: BUNDLED_IDS.has(id) ? `${origin}/og/${id}.png` : `${origin}/og-default.png`,
  })
}
