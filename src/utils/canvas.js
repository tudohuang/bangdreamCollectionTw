// 產圖用的共用零件：字體、斷行、圓角、印刷網點、條碼、封面載入。
// shareImage（單場票根）與 passImage（個人季票）共用同一套，視覺才會是同一個世界。

export const SANS = '"Noto Sans TC", "Microsoft JhengHei", sans-serif'
export const DISP = 'Outfit, "Noto Sans TC", "Microsoft JhengHei", sans-serif'
export const HAND = '"LXGW WenKai TC", "Noto Sans TC", cursive'

// 等字體就緒，否則還沒載入會 fallback 成系統字，產出的圖字體不一致
export async function ensureFonts() {
  try {
    await document.fonts?.ready
    await Promise.all([
      document.fonts?.load(`800 48px ${DISP}`),
      document.fonts?.load(`700 30px ${HAND}`),
    ])
  } catch { /* 載不到就用退回字體，不擋產圖 */ }
}

// 中文逐字斷行，但英數單字不從中間切開（會退回上一個空白）
export function wrap(ctx, text, maxWidth, maxLines) {
  const chars = [...String(text ?? '')]
  const isWordChar = (ch) => !!ch && /[A-Za-z0-9'’.\-]/.test(ch)
  const lines = []
  let line = ''
  let i = 0
  while (i < chars.length && lines.length < maxLines) {
    const ch = chars[i]
    if (line && ctx.measureText(line + ch).width > maxWidth) {
      let head = line, carry = ''
      if (isWordChar(ch) && isWordChar(line[line.length - 1])) {
        const sp = line.lastIndexOf(' ')
        if (sp > 0) { head = line.slice(0, sp); carry = line.slice(sp + 1) }
      }
      lines.push(head)
      line = carry
      continue                       // 這個字還沒放進去，下一圈再處理
    }
    line += ch
    i++
  }
  if (line && lines.length < maxLines) { lines.push(line); line = '' }
  if ((i < chars.length || line) && lines.length) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/.$/, '…')
  }
  return lines
}

export function roundRect(x, px, py, pw, ph, r) {
  x.beginPath()
  x.moveTo(px + r, py)
  x.arcTo(px + pw, py, px + pw, py + ph, r)
  x.arcTo(px + pw, py + ph, px, py + ph, r)
  x.arcTo(px, py + ph, px, py, r)
  x.arcTo(px, py, px + pw, py, r)
  x.closePath()
}

// 印刷網點：4px 一格的小點，疊在紙上當底紋
export function dotPattern(rgba) {
  const t = document.createElement('canvas')
  t.width = 4; t.height = 4
  const tx = t.getContext('2d')
  tx.fillStyle = rgba
  tx.fillRect(0, 0, 1, 1)
  return t
}

// 條碼：用編號當種子，同一份資料每次產出都一樣
export function drawBarcode(x, bx, by, bw, bh, seed, color) {
  let s = (seed >>> 0) || 7
  let px = bx
  x.fillStyle = color
  while (px < bx + bw) {
    s = (s * 1664525 + 1013904223) >>> 0
    const w = 2 + (s % 4)
    const gap = 2 + ((s >> 9) % 3)
    if (px + w > bx + bw) break
    x.fillRect(px, by, w, bh)
    px += w + gap
  }
}

// 載入封面（要求 CORS，沒權限就視為失敗 → 退回無圖版，畫布不會被污染）
export function loadCover(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// object-cover：把圖鋪滿一塊矩形，超出的裁掉
export function drawCover(x, img, px, py, pw, ph) {
  const scale = Math.max(pw / img.width, ph / img.height)
  const dw = img.width * scale, dh = img.height * scale
  x.save()
  x.beginPath(); x.rect(px, py, pw, ph); x.clip()
  x.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh)
  x.restore()
}

// 蓋在圖上的橡皮章
export function drawStamp(x, cx, cy, r, text = '我去過') {
  x.save()
  x.translate(cx, cy)
  x.rotate(-11 * Math.PI / 180)
  x.fillStyle = 'rgba(18,8,38,0.30)'
  x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill()
  x.strokeStyle = '#ffffff'
  x.lineWidth = 3.5
  x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.stroke()
  x.lineWidth = 1.5
  x.beginPath(); x.arc(0, 0, r - 7, 0, Math.PI * 2); x.stroke()
  x.fillStyle = '#ffffff'
  x.textAlign = 'center'
  x.font = `700 ${Math.round(r * 0.52)}px ${HAND}`
  x.fillText(text, 0, r * 0.04)
  x.font = `700 ${Math.round(r * 0.2)}px ${DISP}`
  x.fillText('ATTENDED', 0, r * 0.42)
  x.textAlign = 'left'
  x.restore()
}

export function downloadCanvas(canvas, filename) {
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = filename
  a.click()
}
