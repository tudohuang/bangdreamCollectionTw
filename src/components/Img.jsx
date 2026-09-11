import { useState } from 'react'
import { coverSources, coverSrcSet } from '../utils/cover.js'

// 圖片載入前顯示骨架微光，載好淡入；錯誤往上拋給呼叫端決定 fallback。
// 父層需是 relative 且有高度（骨架用 absolute inset-0 填滿）。
//
// 傳 event 進來的話，會照 Cover.jsx 那套多包一層 <picture>（AVIF → WebP → JPEG）。
// 之前精選牆、今日回顧、相關場次這些地方只丟 jpg 網址，avif 明明產好了卻沒人吃，
// Lighthouse 抓出來首頁多載了 118 KB。
export default function Img({ src, alt = '', className = '', onError, event, sizes }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  // 載入失敗：收掉骨架（否則會一直閃），畫中性底色並通知呼叫端
  if (errored) {
    return <span aria-hidden className={`${className} block bg-dream-line/40`} />
  }
  const local = event ? coverSources(event, 'sm') : null
  const img = (
    <img src={src} alt={alt} loading="lazy" decoding="async"
      srcSet={local ? coverSrcSet(event, 'jpg') : undefined}
      sizes={local ? sizes : undefined}
      onLoad={() => setLoaded(true)}
      onError={(e) => { setErrored(true); onError?.(e) }}
      className={`${className} transition-[opacity,transform] duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`} />
  )
  return (
    <>
      {!loaded && <span aria-hidden className="absolute inset-0 skeleton" />}
      {local
        ? <picture className="contents">
            <source type="image/avif" srcSet={coverSrcSet(event, 'avif')} sizes={sizes} />
            <source type="image/webp" srcSet={coverSrcSet(event, 'webp')} sizes={sizes} />
            {img}
          </picture>
        : img}
    </>
  )
}
