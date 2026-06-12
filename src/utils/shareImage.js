// 在前端用 canvas 把單一活動畫成分享圖並下載（#21）
import { formatDateRange } from './share.js'

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

export function downloadShareImage(event, meta, personal) {
  const W = 1200, H = 630
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')
  const F = '"Noto Sans TC", "Microsoft JhengHei", sans-serif'

  x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H)
  x.fillStyle = meta.color; x.fillRect(0, 0, W, 14)

  x.fillStyle = '#94a3b8'; x.font = `600 28px ${F}`
  x.fillText('邦邦來台圖鑑 · Taiwan BanG Dream!', 64, 84)

  x.fillStyle = meta.color; x.font = `800 54px ${F}`
  x.textAlign = 'right'
  x.fillText(`#${String(event.number ?? 0).padStart(3, '0')}`, W - 64, 92)
  x.textAlign = 'left'

  x.fillStyle = meta.color; x.font = `700 30px ${F}`
  x.fillText(personal ? '個人來台' : meta.name, 64, 156)

  x.fillStyle = '#1e293b'; x.font = `800 60px ${F}`
  const lines = wrap(x, event.title || '未命名活動', W - 128, 3)
  lines.forEach((ln, i) => x.fillText(ln, 64, 250 + i * 74))

  const date = formatDateRange(event.startDate, event.endDate)
  x.fillStyle = '#475569'; x.font = `500 30px ${F}`
  x.fillText([date, event.type, event.category === '擦邊' ? '個人' : '本體'].filter(Boolean).join('   ·   '), 64, 540)

  const people = (event.people || []).slice(0, 6).join('、')
  if (people) { x.fillStyle = '#94a3b8'; x.font = `500 26px ${F}`; x.fillText(people, 64, 586) }

  const a = document.createElement('a')
  a.href = c.toDataURL('image/png')
  a.download = `${event.id}.png`
  a.click()
}
