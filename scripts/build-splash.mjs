// npm run splash —— 產生 iOS 加到主畫面後的啟動畫面。
//
// 為什麼需要：Android 會拿 manifest 的 background_color + 圖示自己合成，
// iOS 不會 —— 沒有 apple-touch-startup-image 的話，從主畫面點開會先閃
// 一整片白，然後才跳出網站。那一下白畫面看起來就像「這不是個 App」。
//
// iOS 要求每個裝置尺寸都有一張對得上的圖，對不上就整個不用。
// 下面這份清單涵蓋 2019 之後還在服役的機型（含直向與橫向）。
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { faMusic } from '@fortawesome/free-solid-svg-icons'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'splash')
mkdirSync(OUT, { recursive: true })

const [glyphW, glyphH, , , glyphPath] = faMusic.icon

// [寬, 高, 裝置像素比]。同一組尺寸要出直向與橫向兩張。
const DEVICES = [
  [430, 932, 3], // iPhone 15/16 Pro Max
  [393, 852, 3], // iPhone 15/16
  [428, 926, 3], // iPhone 12/13/14 Pro Max
  [390, 844, 3], // iPhone 12/13/14
  [375, 812, 3], // iPhone X/XS/11 Pro/mini
  [414, 896, 2], // iPhone XR/11
  [375, 667, 2], // iPhone SE
  [820, 1180, 2], // iPad Air
  [768, 1024, 2], // iPad
]

// 啟動畫面刻意做得跟站上的第一屏一樣：同一組漸層、同一顆音符。
// 目的是「點開的瞬間看起來已經在站上了」，不是放一張 logo。
const svg = (w, h, dark) => {
  const bg = dark ? '#07071a' : '#fdfaff'
  const size = Math.min(w, h) * 0.22
  const scale = size / Math.max(glyphW, glyphH)
  const dx = (w - glyphW * scale) / 2
  const dy = (h - glyphH * scale) / 2
  const r = size * 0.28
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ec4899"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="${bg}"/>
  <rect x="${(w - size) / 2}" y="${(h - size) / 2}" width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  <path transform="translate(${dx} ${dy}) scale(${scale})" d="${glyphPath}" fill="#fff" opacity="0.96"/>
</svg>`
}

const png = (source, width) =>
  new Resvg(source, { fitTo: { mode: 'width', value: width } }).render().asPng()

const links = []
let n = 0
for (const [w, h, dpr] of DEVICES) {
  for (const [orient, ow, oh] of [['portrait', w, h], ['landscape', h, w]]) {
    for (const dark of [false, true]) {
      const name = `splash-${ow}x${oh}@${dpr}x${dark ? '-dark' : ''}.png`
      writeFileSync(join(OUT, name), png(svg(ow * dpr, oh * dpr, dark), ow * dpr))
      links.push(
        `<link rel="apple-touch-startup-image" href="/splash/${name}"` +
        ` media="(device-width: ${w}px) and (device-height: ${h}px)` +
        ` and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${orient})` +
        (dark ? ' and (prefers-color-scheme: dark)' : ' and (prefers-color-scheme: light)') + '"/>')
      n++
    }
  }
}

// index.html 的 <link> 太多條，手貼會漏。寫成一份讓 build 注入。
writeFileSync(join(ROOT, 'src', 'data', 'splashLinks.html'), links.join('\n') + '\n', 'utf8')
console.log(`✓ ${n} 張啟動畫面 → public/splash/`)
console.log('✓ link 標籤 → src/data/splashLinks.html（由 build-og.mjs 注入 index.html）')
