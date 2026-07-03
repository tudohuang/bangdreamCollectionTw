// 無縫橫向跑馬燈：同一段內容排兩份、位移 -50% 循環。
// 內容視為裝飾（第二份 aria-hidden）；hover 暫停、reduced-motion 直接靜止（見 index.css）。
export default function Marquee({ children, duration = 48, className = '' }) {
  const mask = 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)'
  return (
    <div className={`marquee overflow-hidden ${className}`} style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <div className="marquee-track" style={{ '--marquee-dur': `${duration}s` }}>
        <div className="flex items-stretch shrink-0">{children}</div>
        <div className="flex items-stretch shrink-0" aria-hidden="true">{children}</div>
      </div>
    </div>
  )
}
