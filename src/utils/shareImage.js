// 在前端用 canvas 把單一活動畫成分享圖並下載（#21）
import { formatDateRange } from './share.js'
import { coverOf } from './media.js'

function wrap(ctx, text, maxWidth, maxLines) {
  const lines = []
  let line = ''
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth) {
      lines.push(line); line = ch
      if (lines.length >= maxLines) break
    } else line += ch
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines && lines.join('').length < [...text].length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…')
  }
  return lines
}

// 載入封面（要求 CORS，沒權限就視為失敗 → 退回純文字版，畫布不會被污染）
function loadCover(url) {
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
function drawCover(x, img, px, py, pw, ph) {
  const scale = Math.max(pw / img.width, ph / img.height)
  const dw = img.width * scale, dh = img.height * scale
  x.save()
  x.beginPath(); x.rect(px, py, pw, ph); x.clip()
  x.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh)
  x.restore()
}

export async function downloadShareImage(event, meta, personal) {
  const W = 1200, H = 630
  const cover = await loadCover(coverOf(event))
  const cw = cover ? 460 : 0          // 右側封面欄寬
  const contentW = W - cw             // 左側文字區寬
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')
  const F = '"Noto Sans TC", "Microsoft JhengHei", sans-serif'

  x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H)
  x.fillStyle = meta.color; x.fillRect(0, 0, contentW, 14)

  if (cover) {
    drawCover(x, cover, contentW, 0, cw, H)
    // 封面左緣壓一道淺漸層，與白底自然銜接
    const g = x.createLinearGradient(contentW, 0, contentW + 60, 0)
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g; x.fillRect(contentW, 0, 60, H)
    x.fillStyle = meta.color; x.fillRect(contentW - 3, 0, 3, H)  // 樂團色分隔線
  }

  const pad = 64
  const textW = contentW - pad * 2

  x.fillStyle = '#94a3b8'; x.font = `600 26px ${F}`
  x.fillText('邦邦來台圖鑑 · Taiwan BanG Dream!', pad, 84)

  x.fillStyle = meta.color; x.font = `800 54px ${F}`
  x.textAlign = 'right'
  x.fillText(`#${String(event.number ?? 0).padStart(3, '0')}`, contentW - pad, 92)
  x.textAlign = 'left'

  x.fillStyle = meta.color; x.font = `700 30px ${F}`
  x.fillText(personal ? '個人來台' : meta.name, pad, 156)

  x.fillStyle = '#1e293b'; x.font = `800 56px ${F}`
  const lines = wrap(x, event.title || '未命名活動', textW, 3)
  lines.forEach((ln, i) => x.fillText(ln, pad, 250 + i * 70))

  const date = formatDateRange(event.startDate, event.endDate)
  x.fillStyle = '#475569'; x.font = `500 28px ${F}`
  x.fillText(wrap(x, [date, event.type, event.category === '擦邊' ? '個人' : '本體'].filter(Boolean).join('   ·   '), textW, 1)[0] || '', pad, 540)

  const people = (event.people || []).join('、')
  if (people) {
    x.fillStyle = '#94a3b8'; x.font = `500 26px ${F}`
    x.fillText(wrap(x, people, textW, 1)[0], pad, 586)
  }

  const a = document.createElement('a')
  a.href = c.toDataURL('image/png')
  a.download = `${event.id}.png`
  a.click()
}
