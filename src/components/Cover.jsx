import { useState } from 'react'
import { coverSources, coverSrc, coverRatio } from '../utils/cover.js'
import { primaryMeta, isPersonal } from '../utils/bands.js'
import Icon from './Icon.jsx'

// 活動封面。
//
// 做三件 <img> 不會自己做的事：
//   1. 依螢幕挑格式與尺寸（AVIF → WebP → JPEG），手機不用載桌機尺寸的圖
//   2. 先用原始比例把位置佔住，圖載入時不會把下面的內容推走
//   3. 載不出來時給一張設計過的替代封面，不是灰色破洞
//
// 第三點是有原因的：封面有六張已經失效（Instagram 擋外站引用），
// 而外連圖床隨時可能再死幾張。破洞會讓整頁看起來像壞掉，
// 樂團色的替代封面至少還是有意的畫面。

export default function Cover({ event, size = 'sm', className = '', sizes, priority = false }) {
  const [failed, setFailed] = useState(false)
  const meta = primaryMeta(event)
  const src = coverSrc(event, size)
  const sources = coverSources(event, size)

  if (!src || failed) return <CoverFallback event={event} className={className} />

  return (
    <picture className={className}>
      {sources && <source type="image/avif" srcSet={sources.avif} sizes={sizes} />}
      {sources && <source type="image/webp" srcSet={sources.webp} sizes={sizes} />}
      <img
        src={src}
        alt=""
        // 第一屏的封面要早點載；其餘等捲到再說
        loading={priority ? 'eager' : 'lazy'}
        fetchpriority={priority ? 'high' : 'auto'}
        decoding="async"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
        style={{ background: `rgba(${meta.glow},0.10)` }}
      />
    </picture>
  )
}

// 設計過的替代封面：樂團色底 + 大圖示 + 活動編號。
// 看得出是「這場沒有圖」，而不是「網站壞了」。
export function CoverFallback({ event, className = '' }) {
  const meta = primaryMeta(event)
  const dex = String(event?.number ?? 0).padStart(3, '0')
  return (
    <span aria-hidden
      className={`relative grid place-items-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(150deg, rgba(${meta.glow},0.30), rgba(${meta.glow},0.10))` }}>
      <Icon n={isPersonal(event) ? 'user' : meta.icon}
        className="text-[34px] opacity-70" style={{ color: meta.color }} />
      <span className="absolute bottom-1.5 right-2 font-round font-bold text-[11px] opacity-45"
        style={{ color: meta.color }}>
        #{dex}
      </span>
    </span>
  )
}

// 依原始比例預留位置的外框。ratio 未知時退回呼叫端給的預設值。
export function CoverFrame({ event, ratio, className = '', children }) {
  const r = coverRatio(event) || ratio || 3 / 2
  return (
    <span className={`relative block w-full overflow-hidden ${className}`} style={{ aspectRatio: r }}>
      {children}
    </span>
  )
}
