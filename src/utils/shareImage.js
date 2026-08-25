// 在前端用 canvas 把單一活動畫成一張票根並下載（#21）
// 版型與站上的詳情浮層同一套語言：紙、印刷網點、撕票打孔、存根、條碼、蓋章。
import { formatDateRangeCompact } from './share.js'
import { coverOf } from './media.js'
import { weekday } from './datetime.js'
import {
  SANS, DISP, HAND, ensureFonts, wrap, roundRect, dotPattern,
  drawBarcode, loadCover, drawCover, drawStamp, downloadCanvas,
} from './canvas.js'

// extra: { attended, bandNth, bandTotal, index, total } — 有就印在存根上，沒有也能跑
export async function downloadShareImage(event, meta, personal, extra = {}) {
  const W = 1200, H = 630
  await ensureFonts()

  const cover = await loadCover(coverOf(event))
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')

  const dex = `#${String(event.number ?? 0).padStart(3, '0')}`
  const T = { x: 28, y: 24, w: W - 56, h: H - 48, r: 26 }
  const PERF = 886                       // 撕線位置
  const STUB = { x: PERF + 20, w: T.x + T.w - PERF - 44 }

  // ---------- 桌面底色（打孔要挖回這個顏色，所以用純色不用漸層） ----------
  const paintBackdrop = () => {
    x.fillStyle = '#f4eff9'; x.fill()
    x.fillStyle = `rgba(${meta.glow},0.10)`; x.fill()
  }
  x.beginPath(); x.rect(0, 0, W, H); paintBackdrop()

  // ---------- 票券本體：暖白紙 + 印刷網點 + 頂部樂團色暈 ----------
  x.save()
  x.shadowColor = 'rgba(70,45,110,0.28)'
  x.shadowBlur = 26; x.shadowOffsetY = 8
  roundRect(x, T.x, T.y, T.w, T.h, T.r)
  x.fillStyle = '#fffdfb'; x.fill()
  x.restore()

  x.save()
  roundRect(x, T.x, T.y, T.w, T.h, T.r); x.clip()
  const wash = x.createLinearGradient(0, T.y, 0, T.y + 320)
  wash.addColorStop(0, `rgba(${meta.glow},0.16)`)
  wash.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = wash; x.fillRect(T.x, T.y, T.w, 320)
  x.fillStyle = x.createPattern(dotPattern('rgba(90,60,130,0.07)'), 'repeat')
  x.fillRect(T.x, T.y, T.w, T.h)
  x.restore()

  // ---------- 抬頭：ADMIT ONE ----------
  const headY = T.y + 62
  x.save()
  if ('letterSpacing' in x) x.letterSpacing = '5px'
  x.fillStyle = `rgba(${meta.glow},0.95)`
  x.font = `700 19px ${DISP}`
  x.fillText('ADMIT ONE · TAIWAN BANG DREAM! COLLECTION', T.x + 34, headY)
  x.restore()

  x.fillStyle = meta.color
  x.font = `800 26px ${DISP}`
  x.textAlign = 'right'
  x.fillText(dex, PERF - 26, headY + 1)
  x.textAlign = 'left'

  // 抬頭下的虛線
  x.save()
  x.strokeStyle = `rgba(${meta.glow},0.35)`
  x.lineWidth = 1.5
  x.setLineDash([7, 6])
  x.beginPath(); x.moveTo(T.x + 34, headY + 26); x.lineTo(T.x + T.w - 34, headY + 26); x.stroke()
  x.restore()

  // ---------- 撕票線：一排打孔 + 兩端咬口 ----------
  const perfTop = headY + 44, perfBottom = T.y + T.h - 20
  x.fillStyle = 'rgba(120,90,160,0.30)'
  for (let py = perfTop; py <= perfBottom; py += 17) {
    x.beginPath(); x.arc(PERF, py, 3.2, 0, Math.PI * 2); x.fill()
  }
  for (const ny of [T.y, T.y + T.h]) {
    x.save()
    x.beginPath(); x.arc(PERF, ny, 15, 0, Math.PI * 2); x.clip()
    x.beginPath(); x.rect(PERF - 16, ny - 16, 32, 32); paintBackdrop()
    x.restore()
  }

  // ---------- 左半：樂團 → 標題 → 日期地點 → 照片 ----------
  // 照片吃文字排完後剩下的高度，所以標題折幾行都不會爆版。
  const textX = T.x + 34, textW = PERF - textX - 46
  const dateStr = formatDateRangeCompact(event.startDate, event.endDate)
  const wd = weekday(event.startDate)
  const people = (event.people || []).join('、')
  const bottomLimit = T.y + T.h - 22
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

  const drawText = (topY) => {
    const put = (text, tx, ty) => { if (text) x.fillText(text, tx, ty) }

    x.fillStyle = meta.color
    x.font = `700 22px ${SANS}`
    put(wrap(x, personal ? `個人來台 · ${meta.name}` : meta.name, textW, 1)[0], textX, topY + 30)

    const titleSize = (event.title || '').length > 24 ? 38 : 44
    const step = titleSize + 12
    x.fillStyle = '#2a2442'
    x.font = `800 ${titleSize}px ${DISP}`
    const lines = wrap(x, event.title || '未命名活動', textW, 2)
    let cur = topY + 76 + titleSize / 2
    lines.forEach((ln, i) => put(ln, textX, cur + i * step))
    cur += (lines.length - 1) * step

    cur += 48
    x.fillStyle = meta.color
    x.font = `700 30px ${HAND}`
    const dateLabel = `${dateStr}${wd ? `（${wd.replace('週', '')}）` : ''}`
    put(dateLabel, textX, cur)
    const dateW = x.measureText(dateLabel).width
    if (event.venue) {
      x.fillStyle = '#605882'
      x.font = `400 25px ${HAND}`
      put(wrap(x, `· ${event.venue}`, textW - dateW - 16, 1)[0], textX + dateW + 16, cur)
    }

    if (people) {
      cur += 34
      x.fillStyle = '#9c94be'
      x.font = `500 21px ${SANS}`
      put(wrap(x, people, textW, 1)[0], textX, cur)
    }
    return cur
  }

  // 白框 + 照片（沒封面就畫樂團色底），順便蓋「我去過」的章
  const drawFrame = (fy, fh) => {
    const F = { x: T.x + 30, w: PERF - T.x - 74, y: fy, h: fh }
    x.save()
    x.shadowColor = 'rgba(60,40,90,0.30)'
    x.shadowBlur = 14; x.shadowOffsetY = 5
    roundRect(x, F.x, F.y, F.w, F.h, 10)
    x.fillStyle = '#ffffff'; x.fill()
    x.restore()

    const P = { x: F.x + 9, y: F.y + 9, w: F.w - 18, h: F.h - 18 }
    x.save()
    roundRect(x, P.x, P.y, P.w, P.h, 5); x.clip()
    if (cover) {
      drawCover(x, cover, P.x, P.y, P.w, P.h)
    } else {
      const g = x.createLinearGradient(P.x, P.y, P.x + P.w, P.y + P.h)
      g.addColorStop(0, meta.color)
      g.addColorStop(1, `rgba(${meta.glow},0.55)`)
      x.fillStyle = g; x.fillRect(P.x, P.y, P.w, P.h)
      x.fillStyle = 'rgba(255,255,255,0.24)'
      x.font = `800 56px ${DISP}`
      x.textAlign = 'center'
      x.fillText(personal ? '個人來台' : meta.name, P.x + P.w / 2, P.y + P.h / 2 + 20)
      x.textAlign = 'left'
    }
    // 照片下緣一條樂團色（畫在裁切內，才不會壓到圓角外）
    x.fillStyle = meta.color
    x.fillRect(P.x, P.y + P.h - 4, P.w, 4)
    x.restore()

    if (extra.attended) drawStamp(x, P.x + P.w - 76, P.y + P.h - 68, 52)
  }

  const textEnd = drawText(perfTop)
  const coverY = textEnd + 24
  drawFrame(coverY, clamp(bottomLimit - coverY, 150, 300))

  // ---------- 右半：存根 ----------
  const sx = STUB.x, sw = STUB.w
  x.save()
  if ('letterSpacing' in x) x.letterSpacing = '4px'
  x.fillStyle = '#9c94be'
  x.font = `700 13px ${DISP}`
  x.fillText('STUB · 存根', sx, perfTop + 34)
  x.restore()

  x.fillStyle = meta.color
  x.font = `800 68px ${DISP}`
  x.fillText(dex, sx, perfTop + 108)

  x.fillStyle = '#2a2442'
  x.font = `700 22px ${SANS}`
  x.fillText(wrap(x, personal ? `個人 · ${meta.name}` : meta.name, sw, 1)[0], sx, perfTop + 150)

  const barcodeY = T.y + T.h - 100
  let sy = perfTop + 180
  const stubLine = (label, value) => {
    if (!value || sy + 26 > barcodeY - 16) return   // 擠不下就不畫，別壓到條碼
    x.fillStyle = '#9c94be'; x.font = `500 13px ${SANS}`
    x.fillText(label, sx, sy)
    x.fillStyle = '#605882'; x.font = `700 19px ${SANS}`
    x.fillText(wrap(x, value, sw, 1)[0], sx, sy + 25)
    sy += 50
  }
  stubLine('日期', dateStr)
  if (extra.bandNth) stubLine(personal ? '同團相關場次' : '來台次數', `第 ${extra.bandNth} 次 / 共 ${extra.bandTotal} 場`)
  if (extra.index != null) stubLine('收藏序位', `${extra.index + 1} / ${extra.total}`)
  if (event.type) stubLine('性質', event.type)

  drawBarcode(x, sx, barcodeY, sw, 40, (event.number ?? 1) * 2654435761, 'rgba(60,45,95,0.72)')
  x.save()
  if ('letterSpacing' in x) x.letterSpacing = '3px'
  x.fillStyle = '#9c94be'
  x.font = `600 12px ${DISP}`
  x.fillText('BANGDREAM.TW COLLECTION', sx, T.y + T.h - 40)
  x.restore()

  downloadCanvas(c, `${event.id}.png`)
}
