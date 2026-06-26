import { useEffect, useRef, useState } from 'react'

// 進視窗才淡入上浮（只觸發一次）。尊重 prefers-reduced-motion 由 CSS 處理。
export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div', ...rest }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect() }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag ref={ref} {...rest}
      style={{ transitionDelay: seen && delay ? `${delay}ms` : undefined }}
      className={`reveal ${seen ? 'reveal-in' : ''} ${className}`}>
      {children}
    </Tag>
  )
}
