import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { prepareShareImage, renderShareImage, shareImageName } from '../utils/shareImage.js'
import { panCrop, defaultCrop, downloadCanvas } from '../utils/canvas.js'
import Icon from './Icon.jsx'

// 存成圖片之前的預覽：照片可以拖曳換位置、拉滑桿放大，確定了才下載。
//
// 自動裁切怎麼猜都會猜錯 —— 票根上的照片框是扁長條，直式海報塞進去只剩中間一段，
// 臉在哪只有看的人知道。調過的位置記在這台裝置，下次存同一場會沿用。
const KEY = 'bdtw-share-crop'
const readSaved = (id) => { try { return JSON.parse(localStorage.getItem(KEY) || '{}')[id] || null } catch { return null } }
const save = (id, crop) => {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    all[id] = crop
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* 存不了就算了，不擋下載 */ }
}

export default function ShareImageEditor({ event, meta, personal, extra, onClose }) {
  const [cover, setCover] = useState(undefined)        // undefined = 載入中，null = 沒有封面
  const [crop, setCrop] = useState(null)
  const canvasRef = useRef(null)
  const photoRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    let alive = true
    prepareShareImage(event).then(({ cover }) => {
      if (!alive) return
      setCover(cover)
      setCrop(readSaved(event.id) || defaultCrop(cover))
    })
    return () => { alive = false }
  }, [event])

  // 每次位置一變就整張重畫一次（跟下載的是同一支函式，看到什麼就存到什麼）
  useEffect(() => {
    if (cover === undefined || !canvasRef.current) return
    const { canvas, photo } = renderShareImage(event, meta, personal, extra, cover, crop)
    const view = canvasRef.current
    view.width = canvas.width; view.height = canvas.height
    view.getContext('2d').drawImage(canvas, 0, 0)
    photoRef.current = photo
  }, [cover, crop, event, meta, personal, extra])

  // 浮層開著時，Esc 只關這層；左右鍵不要切到別場（詳情頁的鍵盤是掛在 window 上的）
  useEffect(() => {
    const onKey = (e) => {
      if (!['Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      e.stopImmediatePropagation()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  // 整張預覽都能拖（手機上手指比照片框大）；畫面上移動多少，換算成圖上的像素
  const onDown = (e) => {
    if (!cover || !photoRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY }
  }
  const onMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const k = canvasRef.current.width / canvasRef.current.getBoundingClientRect().width
    const dx = (e.clientX - d.x) * k, dy = (e.clientY - d.y) * k
    dragRef.current = { x: e.clientX, y: e.clientY }
    const P = photoRef.current
    setCrop(c => panCrop(cover, P.w, P.h, c, dx, dy))
  }
  const onUp = () => { dragRef.current = null }

  const download = () => {
    const { canvas } = renderShareImage(event, meta, personal, extra, cover, crop)
    if (cover) save(event.id, crop)
    downloadCanvas(canvas, shareImageName(event))
    onClose()
  }

  const loading = cover === undefined

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl border border-dream-line dark:border-white/15"
        style={{ background: 'var(--modal-bg)', paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="存成圖片">
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-4 border-b border-dream-line dark:border-white/10">
          <h3 className="font-display font-bold text-[16px] text-dream-ink flex items-center gap-2">
            <Icon n="star" className="text-bloom-indigo text-[13px]" /> 存成圖片
          </h3>
          <button className="icon-btn" onClick={onClose} aria-label="關閉"><Icon n="xmark" /></button>
        </div>

        <div className="px-5 sm:px-6 pt-5">
          <div className="relative rounded-xl overflow-hidden bg-dream-line/50 dark:bg-white/5" style={{ aspectRatio: '1200 / 630' }}>
            {loading && (
              <div className="absolute inset-0 grid place-items-center text-[14px] text-dream-faint">載入封面中…</div>
            )}
            <canvas ref={canvasRef}
              className={`w-full h-full block ${cover ? 'cursor-grab active:cursor-grabbing' : ''}`}
              style={{ touchAction: cover ? 'none' : 'auto', visibility: loading ? 'hidden' : 'visible' }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          {cover ? (
            <>
              <span className="text-[14px] text-dream-sub inline-flex items-center gap-1.5">
                <Icon n="hand" className="text-[12px] text-bloom-indigo" /> 拖曳照片換位置
              </span>
              <label className="flex items-center gap-2.5 text-[14px] text-dream-sub">
                放大
                <input type="range" min="1" max="3" step="0.01" value={crop?.zoom ?? 1}
                  onChange={(e) => setCrop(c => ({ ...c, zoom: Number(e.target.value) }))}
                  className="w-28 sm:w-36 accent-bloom-violet" aria-label="照片放大" />
              </label>
              <button className="text-[14px] text-dream-faint hover:text-bloom-rose" onClick={() => setCrop(defaultCrop(cover))}>
                重設
              </button>
            </>
          ) : !loading && (
            <span className="text-[14px] text-dream-faint">這場沒有可用的封面，會用樂團色代替</span>
          )}
          <button className="btn-primary !h-11 sm:!h-10 ml-auto" onClick={download} disabled={loading}>
            <Icon n="download" /> 下載
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
