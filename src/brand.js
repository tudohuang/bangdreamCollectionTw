// 站徽：粉紫漸層方塊 ＋ 一張白色票根（左右兩個打孔缺口），中間挖空一顆星。
// 票根＝一場一場收起來的紀錄，星星＝邦邦。
//
// 頁首／頁尾（Logo.jsx）、分頁 favicon、加到主畫面的 App 圖示、iOS 啟動畫面
// 全部從這支產生 —— 改這裡，跑 npm run icons 與 npm run splash，全站就一起換。
// 純資料與字串，不碰 DOM，Node 腳本也能直接 import。

export const BRAND_GRADIENT = ['#ec4899', '#8b5cf6']

// 以下都在 64×64 的座標系裡
export const TICKET = { x: 9, y: 18, w: 46, h: 28, r: 4.5 }
export const NOTCHES = [{ cx: 9, cy: 32, r: 5.5 }, { cx: 55, cy: 32, r: 5.5 }]
export const STAR_PATH = starPath(32, 32.6, 9.6, 4)

function starPath(cx, cy, R, r) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rad = i % 2 ? r : R
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(2)} ${(cy + Math.sin(a) * rad).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

// 完整站徽的 SVG 字串。
//   size：輸出邊長  radius：背景圓角（64 座標系；0 = 方形，maskable 圖示用）
//   scale：票根佔比（maskable 要縮進安全區）  id：同一頁放多個時避免 id 撞名
export function logoSvg({ size = 64, radius = 14, scale = 1, id = 'bdtw' } = {}) {
  const [a, b] = BRAND_GRADIENT
  const t = TICKET
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
<defs>
<linearGradient id="${id}-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<mask id="${id}-m"><rect width="64" height="64" fill="#fff"/>${NOTCHES.map(n => `<circle cx="${n.cx}" cy="${n.cy}" r="${n.r}" fill="#000"/>`).join('')}<path d="${STAR_PATH}" fill="#000"/></mask>
</defs>
<rect width="64" height="64" rx="${radius}" fill="url(#${id}-g)"/>
<g transform="translate(32 32) scale(${scale}) translate(-32 -32)"><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="${t.r}" fill="#fff" mask="url(#${id}-m)"/></g>
</svg>`
}

// 給 <link rel="icon"> 用的 data URI
export const faviconDataUri = () =>
  'data:image/svg+xml,' + encodeURIComponent(logoSvg({ size: 32, radius: 14 }).replace(/\n/g, ''))
