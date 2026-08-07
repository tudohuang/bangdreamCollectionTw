// 把「我去過」的紀錄畫成一張季票（SEASON PASS）並下載。
// 主角是收藏軌：全站每一場排成一條，去過的亮起來 —— 一眼看到自己參與了多少。
// 走得越多，卡片本身也會升級（紙票 → 銀票 → 金票 → 黑卡），拿出來才有份量。
import { primaryMeta, bandMeta } from './bands.js'
import { sortChrono } from './context.js'
import { formatDateRangeCompact } from './share.js'
import {
  SANS, DISP, HAND, ensureFonts, wrap, roundRect, dotPattern,
  drawBarcode, downloadCanvas,
} from './canvas.js'

// 依「走過的比例」升級。門檻用比例不用場次數，站上場次變多也不會通膨。
const TIERS = [
  {
    key: 'paper', name: '紙票', en: 'PAPER',
    min: 0,
    desk: '#f4eff9', paper: '#fffdfb',
    ink: '#2a2442', sub: '#605882', faint: '#9c94be',
    dot: 'rgba(90,60,130,0.07)',
  },
  {
    key: 'silver', name: '銀票', en: 'SILVER',
    min: 0.15,
    desk: '#e9ecf2', paper: '#f6f7fa',
    ink: '#242833', sub: '#565d6e', faint: '#98a0b0',
    dot: 'rgba(60,70,90,0.08)',
    // 中段不能用純白 —— 壓在淺色紙上會整個消失
    foil: ['#7c879b', '#c3ccda', '#6d798d'],
  },
  {
    key: 'gold', name: '金票', en: 'GOLD',
    min: 0.35,
    desk: '#efe3c8', paper: '#fdf7e9',
    ink: '#3a2c10', sub: '#6b5626', faint: '#a89060',
    dot: 'rgba(120,90,20,0.09)',
    foil: ['#b8831a', '#f7e29b', '#c9971f'],
  },
  {
    key: 'black', name: '黑卡', en: 'BLACK',
    min: 0.6,
    desk: '#0b0a12', paper: '#16131f',
    ink: '#f3edff', sub: '#c0b8d8', faint: '#7d7597',
    dot: 'rgba(255,255,255,0.06)',
    foil: ['#c9971f', '#ffeaa8', '#b8831a'],
    glow: true,
  },
]

export function pickTier(percent) {
  const p = (percent || 0) / 100
  return [...TIERS].reverse().find(t => p >= t.min) || TIERS[0]
}

// 從去過的場次算出這張卡要印的東西
export function passStats(events, attendedIds) {
  const chrono = sortChrono(events)
  const mine = chrono.filter(e => attendedIds.has(e.id))
  const years = [...new Set(mine.map(e => e.year).filter(Boolean))].sort((a, b) => a - b)

  const perPerson = {}
  for (const e of mine) for (const p of (e.people || [])) perPerson[p] = (perPerson[p] || 0) + 1
  const topPerson = Object.entries(perPerson).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]

  const perBand = {}
  const perYear = {}
  for (const e of mine) {
    perBand[primaryMeta(e).name] = (perBand[primaryMeta(e).name] || 0) + 1
    if (e.year) perYear[e.year] = (perYear[e.year] || 0) + 1
  }
  const topBand = Object.entries(perBand).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  const bestYear = Object.entries(perYear).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]

  // 最長連續年數（中間斷一年就重算）
  let streak = 0, run = 0
  for (let i = 0; i < years.length; i++) {
    run = i > 0 && years[i] - years[i - 1] === 1 ? run + 1 : 1
    streak = Math.max(streak, run)
  }

  const percent = chrono.length ? Math.round((mine.length / chrono.length) * 100) : 0
  return {
    chrono,
    mine,
    total: mine.length,
    all: chrono.length,
    percent,
    tier: pickTier(percent),
    bandCount: Object.keys(perBand).length,
    bestYear: bestYear ? { year: Number(bestYear[0]), count: bestYear[1] } : null,
    streak,
    yearSpan: years.length ? (years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : `${years[0]}`) : '—',
    topPerson: topPerson ? { name: topPerson[0], count: topPerson[1] } : null,
    topBand: topBand ? { name: topBand[0], count: topBand[1] } : null,
    first: mine[0] || null,
    last: mine[mine.length - 1] || null,
  }
}

export async function downloadPassCard(events, attendedIds, options = {}) {
  const s = passStats(events, attendedIds)
  if (!s.total) return 0

  await ensureFonts()
  const W = 1200, H = 630
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')

  const T_ = s.tier
  const accent = s.topBand ? bandMeta(s.topBand.name) : { color: '#a855f7', glow: '167,139,250' }
  const T = { x: 28, y: 24, w: W - 56, h: H - 48, r: 26 }
  const PERF = 900
  const sx = PERF + 22, sw = T.x + T.w - PERF - 46

  // 高階卡的主色改用箔壓漸層，低階維持樂團色
  const foilFill = (x0, y0, x1, y1) => {
    if (!T_.foil) return accent.color
    const g = x.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, T_.foil[0]); g.addColorStop(0.5, T_.foil[1]); g.addColorStop(1, T_.foil[2])
    return g
  }

  // ---------- 桌面底色（打孔要挖回這個顏色，所以用純色） ----------
  const paintBackdrop = () => {
    x.fillStyle = T_.desk; x.fill()
    x.fillStyle = `rgba(${accent.glow},${T_.key === 'black' ? 0.16 : 0.1})`; x.fill()
  }
  x.beginPath(); x.rect(0, 0, W, H); paintBackdrop()

  // ---------- 卡片本體 ----------
  x.save()
  x.shadowColor = T_.key === 'black' ? 'rgba(0,0,0,0.6)' : 'rgba(70,45,110,0.28)'
  x.shadowBlur = 26; x.shadowOffsetY = 8
  roundRect(x, T.x, T.y, T.w, T.h, T.r)
  x.fillStyle = T_.paper; x.fill()
  x.restore()

  x.save()
  roundRect(x, T.x, T.y, T.w, T.h, T.r); x.clip()
  const wash = x.createLinearGradient(0, T.y, 0, T.y + 340)
  wash.addColorStop(0, `rgba(${accent.glow},${T_.key === 'black' ? 0.26 : 0.18})`)
  wash.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = wash; x.fillRect(T.x, T.y, T.w, 340)
  x.fillStyle = x.createPattern(dotPattern(T_.dot), 'repeat')
  x.fillRect(T.x, T.y, T.w, T.h)
  x.restore()

  // ---------- 抬頭 ----------
  const headY = T.y + 62
  x.save()
  if ('letterSpacing' in x) x.letterSpacing = '4px'
  x.fillStyle = T_.foil ? foilFill(T.x + 34, 0, PERF - 200, 0) : `rgba(${accent.glow},0.95)`
  x.font = `700 19px ${DISP}`
  x.fillText(options.header || 'SEASON PASS · TAIWAN BANG DREAM!', T.x + 34, headY)
  x.restore()

  // 等級章
  x.save()
  if ('letterSpacing' in x) x.letterSpacing = '3px'
  x.font = `800 15px ${DISP}`
  const tierLabel = `${T_.en} · ${T_.name}`
  const tw = x.measureText(tierLabel).width + 26
  roundRect(x, PERF - 26 - tw, headY - 19, tw, 27, 13)
  x.fillStyle = T_.foil ? foilFill(PERF - 26 - tw, 0, PERF - 26, 0) : accent.color
  x.fill()
  x.fillStyle = T_.key === 'paper' ? '#fff' : '#241a05'
  x.fillText(tierLabel, PERF - 26 - tw + 13, headY)
  x.restore()

  x.save()
  x.strokeStyle = T_.foil ? T_.foil[0] : `rgba(${accent.glow},0.35)`
  x.globalAlpha = 0.5
  x.lineWidth = 1.5
  x.setLineDash([7, 6])
  x.beginPath(); x.moveTo(T.x + 34, headY + 26); x.lineTo(T.x + T.w - 34, headY + 26); x.stroke()
  x.restore()

  // ---------- 撕票線 ----------
  const perfTop = headY + 44
  x.fillStyle = T_.key === 'black' ? 'rgba(255,255,255,0.28)' : 'rgba(120,90,160,0.30)'
  for (let py = perfTop; py <= T.y + T.h - 20; py += 17) {
    x.beginPath(); x.arc(PERF, py, 3.2, 0, Math.PI * 2); x.fill()
  }
  for (const ny of [T.y, T.y + T.h]) {
    x.save()
    x.beginPath(); x.arc(PERF, ny, 15, 0, Math.PI * 2); x.clip()
    x.beginPath(); x.rect(PERF - 16, ny - 16, 32, 32); paintBackdrop()
    x.restore()
  }

  // ---------- 左半 ----------
  const textX = T.x + 34, textW = PERF - textX - 46

  x.fillStyle = T_.ink
  x.font = `800 44px ${DISP}`
  x.fillText(options.title || '我的參戰紀錄', textX, perfTop + 46)

  const cells = [
    { v: `${s.total}`, unit: '場', label: '去過' },
    { v: s.yearSpan, label: '橫跨' },
    s.topPerson ? { v: s.topPerson.name, label: `見最多次 · ${s.topPerson.count} 場`, small: true } : null,
  ].filter(Boolean)

  const cellW = textW / cells.length
  cells.forEach((cell, i) => {
    const cx = textX + i * cellW
    // 字級自動縮到塞得下為止（「2018–2026」在 46px 會爆出去）
    let size = cell.small ? 30 : 46
    const room = cellW - (cell.unit ? 46 : 22)
    x.font = `800 ${size}px ${DISP}`
    while (size > 24 && x.measureText(cell.v).width > room) {
      size -= 2
      x.font = `800 ${size}px ${DISP}`
    }
    x.fillStyle = foilFill(cx, 0, cx + cellW, 0)
    const label = wrap(x, cell.v, room, 1)[0]
    x.fillText(label, cx, perfTop + 128)
    if (cell.unit) {
      const w = x.measureText(label).width
      x.fillStyle = T_.faint
      x.font = `600 20px ${SANS}`
      x.fillText(cell.unit, cx + w + 8, perfTop + 128)
    }
    x.fillStyle = T_.sub
    x.font = `500 17px ${SANS}`
    x.fillText(wrap(x, cell.label, cellW - 16, 1)[0], cx, perfTop + 158)
  })

  // ---------- 收藏軌 ----------
  const stripY = perfTop + 196
  const stripH = 44
  const n = s.chrono.length
  const gap = n > 40 ? 2 : 3
  const barW = Math.max(2, (textW - gap * (n - 1)) / n)

  x.fillStyle = T_.faint
  x.font = `600 14px ${SANS}`
  x.fillText('收藏軌', textX, stripY - 12)
  x.fillStyle = T_.sub
  x.font = `700 14px ${SANS}`
  x.fillText(`${s.total} / ${s.all}`, textX + 62, stripY - 12)

  s.chrono.forEach((e, i) => {
    const m = primaryMeta(e)
    const on = attendedIds.has(e.id)
    const bx = textX + i * (barW + gap)
    const bh = on ? stripH : stripH * 0.42
    x.save()
    if (on && T_.glow) { x.shadowColor = m.color; x.shadowBlur = 12 }
    x.fillStyle = on ? m.color : (T_.key === 'black' ? `rgba(${m.glow},0.22)` : `rgba(${m.glow},0.26)`)
    roundRect(x, bx, stripY + (stripH - bh), barW, bh, Math.min(2, barW / 2))
    x.fill()
    x.restore()
  })

  x.fillStyle = T_.faint
  x.font = `700 13px ${DISP}`
  let prevYear = null, lastLabelX = -Infinity
  s.chrono.forEach((e, i) => {
    if (!e.year || e.year === prevYear) return
    prevYear = e.year
    const lx = textX + i * (barW + gap)
    if (lx - lastLabelX < 46) return
    lastLabelX = lx
    x.fillText(String(e.year), lx, stripY + stripH + 22)
  })

  // ---------- 戰績徽章 ----------
  let ly = stripY + stripH + 62
  const badges = [
    `${s.bandCount} 個團`,
    s.bestYear && `單年最多 ${s.bestYear.count} 場`,
    s.streak > 1 && `連續 ${s.streak} 年`,
    `走過 ${s.percent}%`,
  ].filter(Boolean)

  let bx = textX
  x.font = `700 17px ${SANS}`
  for (const b of badges) {
    const w = x.measureText(b).width + 28
    if (bx + w > textX + textW) break
    roundRect(x, bx, ly - 20, w, 32, 16)
    x.fillStyle = T_.foil ? foilFill(bx, 0, bx + w, 0) : `rgba(${accent.glow},0.16)`
    x.fill()
    x.fillStyle = T_.foil ? '#241a05' : accent.color
    x.fillText(b, bx + 14, ly + 1)
    bx += w + 9
  }

  // ---------- 第一場 / 最近一場 ----------
  ly += 50
  const line = (label, e) => {
    if (!e) return
    x.fillStyle = T_.faint
    x.font = `500 14px ${SANS}`
    x.fillText(label, textX, ly)
    x.fillStyle = T_.foil ? T_.foil[0] : accent.color
    x.font = `700 22px ${HAND}`
    const d = formatDateRangeCompact(e.startDate, e.endDate)
    x.fillText(d, textX + 76, ly)
    const dw = x.measureText(d).width
    x.fillStyle = T_.sub
    x.font = `500 19px ${SANS}`
    x.fillText(wrap(x, e.title || '', textW - 76 - dw - 16, 1)[0], textX + 76 + dw + 16, ly)
    ly += 36
  }
  line('第一場', s.first)
  if (s.last && s.last.id !== s.first?.id) line('最近一場', s.last)

  // ---------- 右半：存根 ----------
  x.save()
  if ('letterSpacing' in x) x.letterSpacing = '4px'
  x.fillStyle = T_.faint
  x.font = `700 13px ${DISP}`
  x.fillText('STUB · 存根', sx, perfTop + 34)
  x.restore()

  x.font = `800 76px ${DISP}`
  x.fillStyle = foilFill(sx, 0, sx + sw, 0)
  x.fillText(String(s.total), sx, perfTop + 116)
  const nw = x.measureText(String(s.total)).width
  x.fillStyle = T_.faint
  x.font = `700 22px ${SANS}`
  x.fillText('場', sx + nw + 10, perfTop + 116)

  const barcodeY = T.y + T.h - 100
  let sy = perfTop + 168
  const stubLine = (label, value) => {
    if (!value || sy + 26 > barcodeY - 16) return
    x.fillStyle = T_.faint; x.font = `500 13px ${SANS}`
    x.fillText(label, sx, sy)
    x.fillStyle = T_.sub; x.font = `700 19px ${SANS}`
    x.fillText(wrap(x, value, sw, 1)[0], sx, sy + 25)
    sy += 50
  }
  stubLine('等級', `${T_.name} · ${s.percent}%`)
  if (s.topBand) stubLine('最常見到', `${s.topBand.name} · ${s.topBand.count} 場`)
  stubLine('橫跨年份', s.yearSpan)

  drawBarcode(x, sx, barcodeY, sw, 40, (s.total * 2654435761) ^ (s.all * 40503),
    T_.key === 'black' ? 'rgba(240,232,255,0.8)' : 'rgba(60,45,95,0.72)')
  x.save()
  if ('letterSpacing' in x) x.letterSpacing = '3px'
  x.fillStyle = T_.faint
  x.font = `600 12px ${DISP}`
  x.fillText('BANGDREAM.TW COLLECTION', sx, T.y + T.h - 40)
  x.restore()

  downloadCanvas(c, 'my-bangdream-pass.png')
  return s.total
}
