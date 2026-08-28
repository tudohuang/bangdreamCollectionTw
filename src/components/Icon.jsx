// 圖示：直接畫 inline SVG，不經過任何 runtime。
//
// 以前是 @fortawesome/react-fontawesome，打包後 96 KB（gzip 30 KB）——
// 但其中圖示路徑只佔 17 KB，剩下的全是那層 runtime 在做我們用不到的事
// （動態註冊、圖層、遮罩、CSS 注入…）。這站只要「把一段 path 畫出來」。
//
// 路徑資料由 npm run icons:data 從原套件抽出來（src/components/iconPaths.js），
// 所以圖案跟以前一模一樣，只是少了中間那層。
//
// 用法不變：<Icon n="music" />
import { ICONS } from './iconPaths.js'

export default function Icon({ n, className = '', style, fixedWidth, ...rest }) {
  const icon = ICONS[n] || ICONS.star
  if (import.meta.env?.DEV && n && !ICONS[n]) {
    console.warn(`[Icon] 未知圖示名「${n}」，已 fallback 成 star`)
  }
  const [w, h, d] = icon

  return (
    <svg
      // aria-hidden：圖示一律是裝飾。需要名稱的地方由外層的 aria-label 負責，
      // 兩邊都念會變成「音樂 音樂」。
      aria-hidden="true"
      focusable="false"
      role="img"
      viewBox={`0 0 ${w} ${h}`}
      // 跟著字級走 —— 全站是用 text-[13px] 這種 class 在控制圖示大小的，
      // 換成固定 px 會讓幾百個地方要一起改。
      // 1em 高、寬度依原始比例算，fixedWidth 時強制 1.25em（跟 FA 一樣）。
      style={{
        height: '1em',
        width: fixedWidth ? '1.25em' : `${(w / h).toFixed(4)}em`,
        display: 'inline-block',
        verticalAlign: '-0.125em',
        ...style,
      }}
      className={className}
      {...rest}
    >
      <path fill="currentColor" d={d} />
    </svg>
  )
}
