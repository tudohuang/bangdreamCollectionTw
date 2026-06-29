import { useState } from 'react'

// 圖片載入前顯示骨架微光，載好淡入；錯誤往上拋給呼叫端決定 fallback。
// 父層需是 relative 且有高度（骨架用 absolute inset-0 填滿）。
export default function Img({ src, alt = '', className = '', onError }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  // 載入失敗：收掉骨架（不然會永遠閃光），畫一塊中性底，並通知呼叫端
  if (errored) {
    return <span aria-hidden className={`${className} block bg-dream-line/40`} />
  }
  return (
    <>
      {!loaded && <span aria-hidden className="absolute inset-0 skeleton" />}
      <img src={src} alt={alt} loading="lazy" decoding="async"
        onLoad={() => setLoaded(true)}
        onError={(e) => { setErrored(true); onError?.(e) }}
        className={`${className} transition-[opacity,transform] duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`} />
    </>
  )
}
