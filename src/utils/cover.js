// 封面的多尺寸來源。
//
// 原本封面是直接外連別人的圖床，量測結果：58 張實際 27.3 MB、平均 537 KB、
// 最大一張 4.5 MB，而且已經死了 6 張。npm run covers 把它們抓下來、縮成兩種
// 尺寸、輸出三種格式，這支負責把那些檔案接回畫面。
//
// 兩種尺寸的用途不一樣：
//   sm（420w）清單卡片 —— 手機一屏放不下兩張，420 夠用，AVIF 平均 12 KB
//   lg（960w）詳情頁的頭圖
//
// 沒有本地檔案的（新加的活動還沒跑過 covers）自動退回原本的外連網址，
// 所以這支永遠有東西可回，不會因為漏跑腳本就整片破圖。
import manifest from '../data/covers.json' with { type: 'json' }
import { coverOf } from './media.js'

const BASE = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '')
const keyOf = (event) => String(event?.stableId ?? event?.number ?? '').padStart(3, '0')

// 這場活動有沒有已經接管好的本地封面
export const hasLocalCover = (event) => !!manifest[keyOf(event)]

// 原始比例。畫面靠它先把位置留出來，圖載入時才不會把版面往下推。
export function coverRatio(event) {
  const m = manifest[keyOf(event)]
  return m?.ratio || null
}

// 回傳 <picture> 需要的三組來源；沒有本地檔就回 null
export function coverSources(event, size = 'sm') {
  const id = keyOf(event)
  if (!manifest[id]) return null
  const path = (ext) => `${BASE}/covers/${id}-${size}.${ext}`
  return {
    avif: path('avif'),
    webp: path('webp'),
    jpg: path('jpg'),
    ...manifest[id],
  }
}

// 最終要放進 <img src> 的網址：本地優先，沒有才用原本的外連
export function coverSrc(event, size = 'sm') {
  const s = coverSources(event, size)
  return s ? s.jpg : coverOf(event)
}
