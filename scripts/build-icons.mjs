// 產生「加到主畫面」用的 App 圖示：npm run icons
//
// 圖示是靜態的（跟資料無關），所以產完就進 public/ 跟著 repo 走，
// 不需要每次 build 都重跑。用 resvg 把同一份 SVG 轉成各尺寸 PNG，
// 圖案來源是 src/brand.js —— 跟頁首 logo、頁籤上的 favicon 同一份。
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { logoSvg } from '../src/brand.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'icons')
mkdirSync(OUT, { recursive: true })

// maskable 圖示會被系統裁成圓形，票根得縮進中間的安全區，不然兩側打孔會被切掉。
// iOS 會自己幫圖示加圓角，所以 apple-touch-icon 給方形滿版。
const svg = ({ radius, scale }) => logoSvg({ size: 512, radius, scale })

const png = (source, width) =>
  new Resvg(source, { fitTo: { mode: 'width', value: width } }).render().asPng()

const jobs = [
  ['icon-192.png', svg({ radius: 14, scale: 1 }), 192],
  ['icon-512.png', svg({ radius: 14, scale: 1 }), 512],
  ['icon-maskable-512.png', svg({ radius: 0, scale: 0.72 }), 512],
  ['apple-touch-icon.png', svg({ radius: 0, scale: 0.92 }), 180],
]

for (const [name, source, width] of jobs) {
  writeFileSync(join(OUT, name), png(source, width))
  console.log(`✓ ${name} (${width}px)`)
}
