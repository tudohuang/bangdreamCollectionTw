import { useEffect, useRef, useState } from 'react'
import { copyText } from '../utils/share.js'
import Icon from './Icon.jsx'

// 訂閱行事曆的入口。
//
// 「匯出」是一次性的，訂閱才是活的：行事曆 App 每半天回來拉一次
// /api/calendar，之後新公布的場次、開賣日會自動出現在使用者手機裡，
// 連提醒一起 —— 這站做不了推播，這就是最接近推播的東西。
//
// 按下去不直接跳走，先開一個小選單：訂閱這件事每個平台的路不一樣
// （Google 走網頁、iPhone 走 webcal://、其他貼網址），直接猜平台
// 猜錯的話使用者只會看到一頁看不懂的英文設定頁。
export default function SubscribeCalendar({ compact = false }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  if (typeof location === 'undefined') return null
  const feed = `${location.origin}/api/calendar`
  // localhost 訂不了（Google 的伺服器抓不到你的電腦），但按鈕照樣能看
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed)}`
  const webcal = feed.replace(/^https?:/, 'webcal:')

  const copy = async () => {
    setCopied(await copyText(feed))
    setTimeout(() => { setCopied(false); setOpen(false) }, 1400)
  }

  return (
    <span ref={boxRef} className="relative inline-flex">
      {compact ? (
        <button onClick={() => setOpen(o => !o)}
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-bloom-indigo hover:underline">
          <Icon n="calendar-days" className="text-[11px]" /> 訂閱行事曆
        </button>
      ) : (
        <button onClick={() => setOpen(o => !o)} className="pill" title="訂閱之後，新場次自動出現在你的行事曆">
          <Icon n="calendar-days" className="text-[11px]" /> 訂閱行事曆
        </button>
      )}

      {open && (
        <div className="absolute top-full left-0 z-30 mt-2 w-64 rounded-2xl border border-dream-line dark:border-white/15 bg-white dark:bg-[#221e30] shadow-glassHover p-3">
          <p className="px-1 pb-2 text-[14px] text-dream-sub leading-relaxed">
            訂閱一次，之後的新場次和開賣日<span className="font-bold text-dream-ink">自動出現</span>在你的行事曆，前一週和前一天會提醒。
          </p>
          <div className="flex flex-col">
            <a href={google} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] font-medium text-dream-ink hover:bg-dream-line/50 dark:hover:bg-white/10 transition-colors">
              <Icon n="calendar" className="text-[13px] text-bloom-indigo" /> Google 日曆
            </a>
            <a href={webcal} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] font-medium text-dream-ink hover:bg-dream-line/50 dark:hover:bg-white/10 transition-colors">
              <Icon n="calendar" className="text-[13px] text-bloom-rose" /> iPhone / Mac 行事曆
            </a>
            <button onClick={copy}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] font-medium text-dream-ink hover:bg-dream-line/50 dark:hover:bg-white/10 transition-colors text-left">
              <Icon n="link" className="text-[13px] text-dream-faint" />
              {copied ? '已複製，貼進行事曆的「訂閱」' : '複製網址（Outlook 等）'}
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
