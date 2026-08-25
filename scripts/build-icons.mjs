// 產生「加到主畫面」用的 App 圖示：npm run icons
//
// 圖示是靜態的（跟資料無關），所以產完就進 public/ 跟著 repo 走，
// 不需要每次 build 都重跑。用 resvg 把同一份 SVG 轉成各尺寸 PNG，
// 圖案來源跟頁籤上的 favicon 一致。
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { faMusic } from '@fortawesome/free-solid-svg-icons'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'icons')
mkdirSync(OUT, { recursive: true })

// 音符直接取自頁首 logo 用的那顆 FontAwesome 圖示，圖示跟站上長得一模一樣。
const [glyphW, glyphH, , , glyphPath] = faMusic.icon

// pad：圖案佔畫布的比例。maskable 圖示會被系統裁成圓形，
// 圖案得縮在中間 80% 的安全區內，不然音符會被切掉。
const svg = ({ radius, pad }) => {
  const s = 512
  // 等比縮到 pad 指定的大小，再置中
  const scale = (s * pad) / Math.max(glyphW, glyphH)
  const dx = (s - glyphW * scale) / 2
  const dy = (s - glyphH * scale) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ec4899"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${radius}" fill="url(#g)"/>
  <path transform="translate(${dx} ${dy}) scale(${scale})" d="${glyphPath}" fill="#fff"/>
</svg>`
}

const png = (source, width) =>
  new Resvg(source, { fitTo: { mode: 'width', value: width } }).render().asPng()

// 一般圖示：圓角方形，圖案佔滿。maskable：滿版底色 + 縮小的圖案。
const jobs = [
  ['icon-192.png', svg({ radius: 112, pad: 0.74 }), 192],
  ['icon-512.png', svg({ radius: 112, pad: 0.74 }), 512],
  ['icon-maskable-512.png', svg({ radius: 0, pad: 0.52 }), 512],
  ['apple-touch-icon.png', svg({ radius: 0, pad: 0.72 }), 180],
]

for (const [name, source, width] of jobs) {
  writeFileSync(join(OUT, name), png(source, width))
  console.log(`✓ ${name} (${width}px)`)
}
