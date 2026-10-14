import { useId } from 'react'
import { BRAND_GRADIENT, TICKET, NOTCHES, STAR_PATH } from '../brand.js'

// 站徽（頁首、頁尾）。圖形定義在 brand.js，跟 favicon、App 圖示是同一份。
export default function Logo({ size = 32, className = '' }) {
  const id = useId().replace(/:/g, '')
  const [a, b] = BRAND_GRADIENT
  const t = TICKET
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <mask id={`${id}m`}>
          <rect width="64" height="64" fill="#fff" />
          {NOTCHES.map((n, i) => <circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill="#000" />)}
          <path d={STAR_PATH} fill="#000" />
        </mask>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${id}g)`} />
      <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={t.r} fill="#fff" mask={`url(#${id}m)`} />
    </svg>
  )
}
