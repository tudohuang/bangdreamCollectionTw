// 每一場活動的靜態條目頁（/e/<id>）。
//
// 為什麼要重寫：原本這一頁只有 1448 bytes，body 裡一個連結，
// 然後立刻 location.replace 跳走。搜尋引擎看到的是「沒有內容的轉址頁」，
// 所以 59 場活動等於全部沒被收錄 —— 有人搜「愛美 台北 見面會」找不到這個站。
//
// 現在改成真的有內容：日期、會場、陣容、簡介、來源全部是靜態 HTML，
// 不需要 JavaScript 就讀得完。使用者點分享連結進來立刻看到東西（不用等 400KB 的 JS），
// 想看完整脈絡再點進圖鑑。
//
// 樣式內嵌而不是連外部 CSS：這一頁要能單獨、極快地開起來，
// 而且建置產物的 CSS 檔名帶雜湊，靜態頁引用不到穩定的路徑。
import { bandKey, BAND_META, rootGroup } from '../utils/bands.js'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const pad = (n) => String(n ?? 0).padStart(3, '0')
const dot = (d) => String(d || '').replace(/-/g, '.')

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

// 這一頁的樣式。刻意寫得少 —— 它的工作是把內容講清楚，不是重現整個 App。
const STYLE = `
:root{color-scheme:light dark;--ink:#2a2442;--sub:#5b5478;--faint:#918ab0;--line:#ece7f4;--bg:#fdfaff;--card:#fff}
@media(prefers-color-scheme:dark){:root{--ink:#eeeafe;--sub:#a8a2c8;--faint:#726c9a;--line:#2a2550;--bg:#0b0a1e;--card:#151230}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);line-height:1.75;
 font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;
 -webkit-font-smoothing:antialiased}
.wrap{max-width:720px;margin:0 auto;padding:22px 18px 64px}
a{color:inherit}
.top{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--faint);margin-bottom:20px}
.top a{color:var(--faint);text-decoration:none}
.top a:hover{color:var(--ink)}
.cover{display:block;width:100%;border-radius:14px;overflow:hidden;margin-bottom:18px;background:var(--line)}
.cover img{display:block;width:100%;height:auto}
.no{font-weight:800;font-size:13px;letter-spacing:.12em;margin-bottom:6px}
h1{font-size:clamp(21px,4.6vw,29px);font-weight:800;line-height:1.3;margin:0 0 14px;text-wrap:balance}
dl{margin:0 0 22px;border-top:1px solid var(--line)}
.row{display:grid;grid-template-columns:58px minmax(0,1fr);gap:0 12px;padding:9px 0;border-bottom:1px solid var(--line)}
dt{font-size:11px;font-weight:700;letter-spacing:.16em;color:var(--faint);padding-top:4px}
dd{margin:0;font-size:15px;font-weight:600}
dd .sub{display:block;font-size:12.5px;font-weight:400;color:var(--faint);margin-top:2px}
h2{font-size:15px;font-weight:700;margin:26px 0 8px}
ul.cast{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
ul.cast li{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-size:14.5px}
ul.cast .role{color:var(--faint);font-size:13px;font-weight:400;text-align:right}
p{font-size:14.5px;color:var(--sub);margin:0 0 12px}
ul.src{list-style:none;margin:0;padding:0;font-size:13.5px}
ul.src li{padding:4px 0}
ul.src a{color:var(--sub)}
.cta{display:inline-flex;align-items:center;gap:8px;margin-top:26px;padding:12px 20px;border-radius:999px;
 background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;font-weight:700;font-size:15px;text-decoration:none}
.foot{margin-top:34px;padding-top:16px;border-top:1px solid var(--line);font-size:12.5px;color:var(--faint)}
.foot a{color:var(--faint)}
`.replace(/\n\s*/g, '')

// 陣容。角色資訊由呼叫端給（以名冊為準），沒有就只列名字。
function castHtml(event, roleOf) {
  const people = event.people || []
  if (!people.length) return ''
  const rows = people.map(name => {
    const info = roleOf?.(name)
    const role = info?.char ? `飾 ${info.char}` : ''
    const band = info?.band ? rootGroup(info.band) : ''
    const right = [role, band].filter(Boolean).join(' · ')
    return `<li><a href="../p/${encodeURIComponent(name)}">${esc(name)}</a>` +
      (right ? `<span class="role">${esc(right)}</span>` : '') + '</li>'
  }).join('')
  return `<h2>陣容 ${people.length} 人</h2><ul class="cast">${rows}</ul>`
}

export function renderEntryPage({ event, origin = '', roleOf, hasLocalCover = false }) {
  const dex = `#${pad(event.number)}`
  const title = `${dex} ${event.title || '未命名活動'}`
  const date = event.startDate === event.endDate
    ? dot(event.startDate)
    : `${dot(event.startDate)} → ${dot(event.endDate)}`
  const meta = BAND_META[bandKey((event.relatedGroups || [])[0] || '')] || BAND_META.other
  const personal = event.category === '擦邊'
  const bands = [...new Set((event.relatedGroups || []).map(rootGroup).filter(Boolean))]

  const desc = [date, event.venue, event.type, personal ? '個人來台' : meta.name,
    (event.people || []).slice(0, 6).join('、')].filter(Boolean).join(' · ')

  const appUrl = `${origin}/#/event/${event.id}`
  const selfUrl = `${origin}/e/${event.id}`
  const ogImage = `${origin}/og/${event.id}.jpg`

  // 本地封面才放進頁面 —— 外連的那些有六張已經失效，破圖比沒圖糟
  const id = pad(event.stableId ?? event.number)
  const cover = hasLocalCover ? `
<span class="cover"><picture>
<source type="image/avif" srcset="${origin}/covers/${id}-lg.avif">
<source type="image/webp" srcset="${origin}/covers/${id}-lg.webp">
<img src="${origin}/covers/${id}-lg.jpg" alt="${esc(event.title || '')}" loading="eager">
</picture></span>` : ''

  const rows = [
    ['日期', esc(date), event.year ? `${event.year} 年` : ''],
    event.venue && ['會場', esc(event.venue), ''],
    ['性質', esc([personal ? '個人來台' : '本體', event.type].filter(Boolean).join(' · ')),
      bands.length ? esc(bands.join('、')) : ''],
    event.organizer && ['主辦', esc(event.organizer), ''],
  ].filter(Boolean).map(([k, v, sub]) =>
    `<div class="row"><dt>${k}</dt><dd>${v}${sub ? `<span class="sub">${sub}</span>` : ''}</dd></div>`).join('')

  const sources = (event.sources || []).length
    ? `<h2>來源</h2><ul class="src">${event.sources.map(s =>
        `<li><a href="${esc(s)}" rel="nofollow noopener" target="_blank">${esc(hostOf(s))}</a></li>`).join('')}</ul>`
    : ''

  // JSON-LD：讓搜尋結果可能顯示成活動卡片，而不只是一條藍字
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(event.startDate) ? event.startDate : undefined,
    endDate: /^\d{4}-\d{2}-\d{2}$/.test(event.endDate) ? event.endDate : undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: event.venue
      ? { '@type': 'Place', name: event.venue, address: { '@type': 'PostalAddress', addressCountry: 'TW' } }
      : undefined,
    image: origin ? [ogImage] : undefined,
    performer: (event.people || []).map(p => ({ '@type': 'Person', name: p })),
    organizer: event.organizer ? { '@type': 'Organization', name: event.organizer } : undefined,
    url: origin ? selfUrl : undefined,
    description: desc,
  })

  return `<!doctype html><html lang="zh-Hant"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}｜邦邦來台圖鑑</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${esc(selfUrl || `/e/${event.id}`)}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(ogImage)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
${origin ? `<meta property="og:url" content="${esc(selfUrl)}"/>` : ''}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(ogImage)}"/>
<style>${STYLE}</style>
<script type="application/ld+json">${jsonLd}</script>
</head><body>
<div class="wrap">
<nav class="top"><a href="../">邦邦來台圖鑑</a> <span>/</span> <span>活動</span></nav>
${cover}
<div class="no" style="color:${meta.color}">${dex}</div>
<h1>${esc(event.title || '未命名活動')}</h1>
<dl>${rows}</dl>
${castHtml(event, roleOf)}
${event.description ? `<h2>活動簡介</h2><p>${esc(event.description)}</p>` : ''}
${event.oneLine ? `<h2>站長一句話</h2><p>${esc(event.oneLine)}</p>` : ''}
${sources}
<a class="cta" href="../#/event/${event.id}">在圖鑑裡開啟 →</a>
<p class="foot">
邦邦來台圖鑑 —— BanG Dream! 相關聲優與樂團的來台活動紀錄，粉絲整理，非官方。
<a href="../">回到圖鑑</a>
</p>
</div>
</body></html>`
}


// 人物／樂團頁（/p/<名字>、/b/<團名>）。
//
// 這是搜「愛美 台北」的人最該落地的地方 —— 她來過幾次、什麼時候、在哪裡。
// 原本這一頁也是立刻跳走的空頁，等於 53 個條目全部沒被收錄。
export function renderProfilePage({ kind, name, events, origin = '', roleOf }) {
  const isPerson = kind === 'person'
  const seg = isPerson ? 'p' : 'b'
  const label = isPerson ? '聲優' : '樂團'

  const list = [...events].sort((a, b) =>
    String(b.startDate || '').localeCompare(String(a.startDate || '')))
  const years = list.map(e => e.year).filter(Boolean)
  const span = years.length
    ? (Math.min(...years) === Math.max(...years)
        ? `${Math.min(...years)}`
        : `${Math.min(...years)}–${Math.max(...years)}`)
    : ''

  const info = isPerson ? roleOf?.(name) : null
  const selfUrl = `${origin}/${seg}/${encodeURIComponent(name)}`
  const ogImage = `${origin}/og/${seg}-${Buffer.from(name, 'utf8').toString('base64url')}.jpg`

  const desc = [`${label} ${name}`, `來台 ${list.length} 場`, span,
    info?.char ? `飾 ${info.char}` : '',
    list.slice(0, 3).map(e => e.title).join('、')].filter(Boolean).join(' · ')

  const rows = list.map(e => {
    const personal = e.category === '擦邊'
    return `<li><a href="../e/${e.id}"><span class="d">${dot(e.startDate) || '日期未定'}</span>` +
      `<span class="t">${esc(e.title || '')}</span></a>` +
      `<span class="role">${esc([e.venue, personal ? '個人' : '本體'].filter(Boolean).join(' · '))}</span></li>`
  }).join('')

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': isPerson ? 'Person' : 'MusicGroup',
    name,
    url: origin ? selfUrl : undefined,
    description: desc,
    ...(isPerson && info?.band ? { memberOf: { '@type': 'MusicGroup', name: rootGroup(info.band) } } : {}),
  })

  return `<!doctype html><html lang="zh-Hant"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(name)}｜${label}來台紀錄｜邦邦來台圖鑑</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${esc(selfUrl || `/${seg}/${name}`)}"/>
<meta property="og:type" content="profile"/>
<meta property="og:title" content="${esc(name)}｜${label}來台紀錄"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(ogImage)}"/>
${origin ? `<meta property="og:url" content="${esc(selfUrl)}"/>` : ''}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(name)}｜${label}來台紀錄"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(ogImage)}"/>
<style>${STYLE}ul.cast li{align-items:baseline}ul.cast .d{display:inline-block;min-width:82px;color:var(--faint);font-size:13px;font-variant-numeric:tabular-nums}ul.cast a{text-decoration:none;display:flex;gap:10px;min-width:0}ul.cast .t{min-width:0}</style>
<script type="application/ld+json">${jsonLd}</script>
</head><body>
<div class="wrap">
<nav class="top"><a href="../">邦邦來台圖鑑</a> <span>/</span> <span>${label}</span></nav>
<div class="no">${label}</div>
<h1>${esc(name)}</h1>
<dl>
<div class="row"><dt>來台</dt><dd>${list.length} 場${span ? `<span class="sub">${span}</span>` : ''}</dd></div>
${info?.char ? `<div class="row"><dt>角色</dt><dd>飾 ${esc(info.char)}${info.band ? `<span class="sub">${esc(rootGroup(info.band))}</span>` : ''}</dd></div>` : ''}
</dl>
<h2>全部場次</h2>
<ul class="cast">${rows}</ul>
<a class="cta" href="../#/${kind}/${encodeURIComponent(name)}">在圖鑑裡開啟 →</a>
<p class="foot">
邦邦來台圖鑑 —— BanG Dream! 相關聲優與樂團的來台活動紀錄，粉絲整理，非官方。
<a href="../">回到圖鑑</a>
</p>
</div>
</body></html>`
}
