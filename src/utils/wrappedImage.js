// 年度回顧卡（Wrapped）→ 直式分享圖，適合貼到脆 / IG
// 深色「夜間偶像」風，與網站／brag 影片同調：樂團色光暈 + 發光年份 + 排行比例條 + 色譜底線
import { yearSummary } from './review.js'

const F = '"Noto Sans TC", "Microsoft JhengHei", sans-serif'

// 樂團色光譜（與 brag 影片同一組），用在頂條與底線
const SPECTRUM = ['#ff5c8a', '#ec3d56', '#ff86bd', '#4d6bff', '#f5b400', '#56bcdd', '#19bd95', '#4f86d6', '#8a4ff0']

export async function downloadWrapped(events, year) {
  // 等字體就緒，否則 Noto Sans TC 還沒載入會 fallback 成系統字，產出的圖字體不一致
  try { await document.fonts?.ready } catch {}
  const c = renderWrappedCanvas(events, year)
  const a = document.createElement('a')
  a.href = c.toDataURL('image/png')
  a.download = `taiwan-bangdream-${yearSummary(events, year).year}-wrapped.png`
  a.click()
}

export function renderWrappedCanvas(events, year) {
  const s = yearSummary(events, year)
  const W = 1080, H = 1350
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')
  const accent = s.topBands[0]?.color || '#7c8cff'
  const accentGlow = s.topBands[0]?.glow || '124,140,255'
  const pad = 84

  // ---- 背景：深藍 + 兩團色光暈 ----
  x.fillStyle = '#0f172a'; x.fillRect(0, 0, W, H)
  radial(x, W * 0.82, 120, 560, `rgba(${accentGlow},0.30)`, 'rgba(15,23,42,0)')
  radial(x, W * 0.10, H * 0.96, 520, 'rgba(255,92,138,0.18)', 'rgba(15,23,42,0)')
  radial(x, W * 0.5, H * 0.42, 700, 'rgba(124,58,237,0.10)', 'rgba(15,23,42,0)')

  // 頂部樂團色光譜細條
  spectrumStrip(x, 0, 0, W, 12)

  // ---- 標頭 ----
  x.textBaseline = 'alphabetic'
  x.fillStyle = '#94a3b8'; x.font = `600 33px ${F}`
  x.fillText('邦邦來台圖鑑 · 年度回顧', pad, 112)

  // 發光年份
  x.save()
  x.shadowColor = `rgba(${accentGlow},0.55)`; x.shadowBlur = 56
  x.fillStyle = accent; x.font = `900 172px ${F}`
  x.fillText(String(s.year), pad - 4, 296)
  x.restore()
  x.fillStyle = '#e2e8f0'; x.font = `700 40px ${F}`
  x.fillText('台邦在台灣，這一年', pad, 356)

  // ---- 三個統計色塊 ----
  const tiles = [
    { big: String(s.total), unit: '場', label: '收錄活動' },
    s.attendance > 0
      ? { big: String(s.attendance), unit: '人', label: '累計人次' }
      : { big: String(s.core), unit: '場', label: '本體場次' },
    { big: String(s.cityCount || 1), unit: '個', label: '城市' },
  ]
  const gap = 22, tileW = (W - pad * 2 - gap * 2) / 3, tileH = 148, tileY = 404
  tiles.forEach((t, i) => {
    const tx = pad + i * (tileW + gap)
    x.fillStyle = `rgba(${accentGlow},0.10)`
    roundRect(x, tx, tileY, tileW, tileH, 22); x.fill()
    x.strokeStyle = `rgba(${accentGlow},0.28)`; x.lineWidth = 1.5
    roundRect(x, tx, tileY, tileW, tileH, 22); x.stroke()
    // 大數字 + 單位
    x.fillStyle = '#f8fafc'; x.font = `900 78px ${F}`
    x.fillText(t.big, tx + 26, tileY + 92)
    const bw = x.measureText(t.big).width
    x.fillStyle = '#94a3b8'; x.font = `600 28px ${F}`
    x.fillText(t.unit, tx + 26 + bw + 9, tileY + 92)
    x.fillStyle = `rgba(${accentGlow},0.95)`; x.font = `600 25px ${F}`
    x.fillText(t.label, tx + 26, tileY + 128)
  })

  let y = tileY + tileH + 74

  // ---- 排行：標題 + 比例條 ----
  const sectionTitle = (t) => {
    x.fillStyle = accent; roundRect(x, pad, y - 24, 8, 28, 4); x.fill()
    x.fillStyle = '#e2e8f0'; x.font = `800 33px ${F}`
    x.fillText(t, pad + 24, y)
    y += 50
  }
  const rankRow = (rank, name, n, maxN, color) => {
    const rowH = 62, barX = pad + 70, barW = W - pad - barX
    const dotColor = color || accent
    // 名次
    x.fillStyle = '#475569'; x.font = `900 34px ${F}`
    x.fillText(String(rank), pad, y + 6)
    // 色點
    x.fillStyle = dotColor
    x.beginPath(); x.arc(pad + 48, y - 5, 11, 0, Math.PI * 2); x.fill()
    // 比例條底 + 填色
    const by = y + 18
    x.fillStyle = 'rgba(255,255,255,0.06)'; roundRect(x, barX, by, barW, 11, 5.5); x.fill()
    const frac = maxN > 0 ? Math.max(0.12, n / maxN) : 0
    const grad = x.createLinearGradient(barX, 0, barX + barW * frac, 0)
    grad.addColorStop(0, `rgba(${hexToRgb(dotColor)},0.55)`); grad.addColorStop(1, dotColor)
    x.fillStyle = grad; roundRect(x, barX, by, barW * frac, 11, 5.5); x.fill()
    // 名稱（條上方）
    x.fillStyle = '#f1f5f9'; x.font = `600 36px ${F}`
    x.fillText(name, barX, y + 4)
    // 場次（右對齊）
    x.fillStyle = '#cbd5e1'; x.font = `700 31px ${F}`; x.textAlign = 'right'
    x.fillText(`${n}`, W - pad, y + 4); x.textAlign = 'left'
    y += rowH
  }

  if (s.topBands.length) {
    sectionTitle('最常出沒的樂團')
    const maxN = s.topBands[0].n
    s.topBands.forEach((b, i) => rankRow(i + 1, b.name, b.n, maxN, b.color))
    y += 18
  }
  if (s.topPeople.length) {
    sectionTitle('看最多次的聲優')
    const maxN = s.topPeople[0].n
    s.topPeople.forEach((p, i) => rankRow(i + 1, p.name, p.n, maxN, '#a78bfa'))
    y += 10
  }

  // ---- 摘要 chips ----
  const chips = [
    s.topCity && `主場 ${s.topCity}`,
    s.fullBand > 0 && `全團 ${s.fullBand} 場`,
    s.busiestMonth && `${s.busiestMonth.month} 月最熱`,
  ].filter(Boolean)
  x.font = `600 29px ${F}`
  let cx = pad
  const cy = y + 44
  for (const t of chips) {
    const w = x.measureText(t).width + 46
    if (cx + w > W - pad) break
    x.fillStyle = `rgba(${accentGlow},0.14)`; roundRect(x, cx, cy - 40, w, 56, 28); x.fill()
    x.strokeStyle = `rgba(${accentGlow},0.30)`; x.lineWidth = 1.5; roundRect(x, cx, cy - 40, w, 56, 28); x.stroke()
    x.fillStyle = '#e2e8f0'; x.fillText(t, cx + 23, cy)
    cx += w + 14
  }

  // ---- 底部：色譜線 + 置中頁尾 ----
  spectrumStrip(x, pad, H - 104, W - pad * 2, 8, 4)
  x.textAlign = 'center'
  x.fillStyle = '#8595ad'; x.font = `500 27px ${F}`
  x.fillText('邦邦來台圖鑑 · bangdream-collection-tw.vercel.app', W / 2, H - 56)
  x.textAlign = 'left'

  return c
}

// ---- 小工具 ----
function radial(x, cx, cy, r, c0, c1) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, c0); g.addColorStop(1, c1)
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1350)
}

function spectrumStrip(x, px, py, w, h, r = 0) {
  const g = x.createLinearGradient(px, 0, px + w, 0)
  SPECTRUM.forEach((c, i) => g.addColorStop(i / (SPECTRUM.length - 1), c))
  x.fillStyle = g
  if (r) { roundRect(x, px, py, w, h, r); x.fill() } else x.fillRect(px, py, w, h)
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '124,140,255'
}

function roundRect(x, px, py, w, h, r) {
  x.beginPath()
  x.moveTo(px + r, py)
  x.arcTo(px + w, py, px + w, py + h, r)
  x.arcTo(px + w, py + h, px, py + h, r)
  x.arcTo(px, py + h, px, py, r)
  x.arcTo(px, py, px + w, py, r)
  x.closePath()
}
