// 年度回顧卡（Wrapped）→ 直式分享圖，適合貼到脆 / IG
import { yearSummary } from './review.js'

const F = '"Noto Sans TC", "Microsoft JhengHei", sans-serif'

export function downloadWrapped(events, year) {
  const s = yearSummary(events, year)
  const W = 1080, H = 1350
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')
  const accent = s.topBands[0]?.color || '#4f46e5'

  // 背景
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H)
  x.fillStyle = accent; x.fillRect(0, 0, W, 20)

  const pad = 88
  // 標頭
  x.fillStyle = '#94a3b8'; x.font = `600 34px ${F}`
  x.fillText('邦邦來台圖鑑 · 年度回顧', pad, 150)
  x.fillStyle = accent; x.font = `900 200px ${F}`
  x.fillText(String(s.year), pad, 360)
  x.fillStyle = '#1e293b'; x.font = `700 44px ${F}`
  x.fillText('台邦在台灣，這一年', pad, 430)

  // 大數字：場次
  x.fillStyle = '#0f172a'; x.font = `900 130px ${F}`
  x.fillText(String(s.total), pad, 600)
  x.fillStyle = '#475569'; x.font = `600 40px ${F}`
  const totalW = x.measureText(String(s.total)).width
  x.fillText('場活動', pad + totalW + 24, 600)

  let y = 720
  const sectionTitle = (t) => { x.fillStyle = accent; x.font = `800 32px ${F}`; x.fillText(t, pad, y); y += 56 }
  const rankRow = (rank, name, n, color) => {
    x.fillStyle = '#cbd5e1'; x.font = `800 34px ${F}`; x.fillText(`${rank}`, pad, y)
    if (color) { x.fillStyle = color; x.beginPath(); x.arc(pad + 58, y - 11, 13, 0, Math.PI * 2); x.fill() }
    x.fillStyle = '#1e293b'; x.font = `600 38px ${F}`; x.fillText(name, pad + (color ? 92 : 56), y)
    x.fillStyle = '#94a3b8'; x.font = `600 32px ${F}`; x.textAlign = 'right'
    x.fillText(`${n} 場`, W - pad, y); x.textAlign = 'left'
    y += 64
  }

  if (s.topBands.length) {
    sectionTitle('最常出沒的樂團')
    s.topBands.forEach((b, i) => rankRow(i + 1, b.name, b.n, b.color))
    y += 24
  }
  if (s.topPeople.length) {
    sectionTitle('看最多次的聲優')
    s.topPeople.forEach((p, i) => rankRow(i + 1, p.name, p.n, null))
    y += 24
  }

  // 摘要列
  const chips = [
    s.topCity && `主場 ${s.topCity}`,
    s.cityCount > 0 && `${s.cityCount} 個城市`,
    s.fullBand > 0 && `全團 ${s.fullBand} 場`,
    s.attendance > 0 && `累計 ${s.attendance} 人次`,
    s.busiestMonth && `${s.busiestMonth.month} 月最熱`,
  ].filter(Boolean)
  x.font = `600 30px ${F}`
  let cx = pad
  const cy = Math.min(y + 10, H - 130)
  for (const t of chips) {
    const w = x.measureText(t).width + 44
    if (cx + w > W - pad) break
    x.fillStyle = `${accent}1a`; roundRect(x, cx, cy - 38, w, 56, 28); x.fill()
    x.fillStyle = accent; x.fillText(t, cx + 22, cy)
    cx += w + 16
  }

  // 頁尾
  x.fillStyle = '#94a3b8'; x.font = `500 28px ${F}`
  x.fillText('Taiwan BanG Dream! Event Collection', pad, H - 60)

  const a = document.createElement('a')
  a.href = c.toDataURL('image/png')
  a.download = `taiwan-bangdream-${s.year}-wrapped.png`
  a.click()
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
