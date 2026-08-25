import { useCallback, useEffect, useRef } from 'react'

// 橫向捲動列的邊緣淡出。
//
// 只做一件事：把「現在有沒有捲到頭／捲到尾」寫成 data-start / data-end，
// 淡出的視覺交給 CSS（.hscroll）。這樣元件裡看不到任何樣式細節。
//
// 用法：<div ref={useEdgeFade()} className="hscroll …">
export function useEdgeFade() {
  const ref = useRef(null)

  const sync = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    // 沒有可捲空間時兩邊都當成「到底」，就不會有多餘的淡出
    const scrollable = max > 2
    el.dataset.start = String(!scrollable || el.scrollLeft <= 1)
    el.dataset.end = String(!scrollable || el.scrollLeft >= max - 1)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    // 內容或容器寬度變了（篩選數量改變、轉向）也要重算
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    for (const child of el.children) ro.observe(child)
    return () => { el.removeEventListener('scroll', sync); ro.disconnect() }
  }, [sync])

  return ref
}
