import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { tap, done } from '../utils/haptics.js'
import { isStandalone, isIOSSafari } from '../utils/platform.js'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

// 頁面外框的小零件：捲動進度條、右下浮動按鈕、換頁時的佔位。

export function PageFallback({ h = 320 }) {
  return <div aria-hidden className="w-full rounded-2xl skeleton" style={{ height: h }} />
}

export function ScrollProgress() {
  const [percent, setPercent] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const max = el.scrollHeight - el.clientHeight
      setPercent(max > 0 ? (el.scrollTop / max) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-[3px] pointer-events-none">
      <div className="scroll-progress h-full bg-gradient-to-r from-bloom-sky via-bloom-indigo to-bloom-rose transition-[width] duration-100"
        style={{ width: `${percent}%` }} />
    </div>
  )
}

// 「加到主畫面」的邀請。
//
// 瀏覽器只有在它自己認為這站夠格安裝時才會丟出 beforeinstallprompt，
// 所以這條不會亂跳。關掉之後就記住，不再煩人。
// 已經是獨立視窗（裝過了）就完全不出現。
const INSTALL_KEY = 'bdtw-install-dismissed'

export function InstallHint() {
  const [prompt, setPrompt] = useState(null)

  // iOS 沒有 beforeinstallprompt —— 這個事件在 Safari 根本不存在，
  // 所以 iPhone 使用者永遠不會看到任何邀請，只能自己知道要去分享選單找。
  // 那邊改成顯示教學。
  const [ios, setIOS] = useState(false)

  useEffect(() => {
    let dismissed = false
    try { dismissed = localStorage.getItem(INSTALL_KEY) === '1' } catch {}
    if (isStandalone() || dismissed) return

    if (isIOSSafari()) {
      // 剛進站就跳一張教學卡太吵，等使用者真的看了一下再說
      const timer = setTimeout(() => setIOS(true), 12000)
      return () => clearTimeout(timer)
    }

    const onPrompt = (e) => { e.preventDefault(); setPrompt(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => setPrompt(null))
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const close = () => {
    try { localStorage.setItem(INSTALL_KEY, '1') } catch {}
    setPrompt(null)
    setIOS(false)
  }

  if (ios) return <IOSInstallCard onClose={close} />
  if (prompt) return <PromptInstallCard prompt={prompt} onClose={close} />
  return null
}

// 兩張卡的共用外框：貼在底部導覽列上方，讓開安全區
const CardShell = ({ children }) => (
  <div className="sm:hidden fixed inset-x-3 bottom-[68px] z-40 rounded-2xl border border-dream-line bg-white/95 backdrop-blur-md px-4 py-3 shadow-lg shadow-bloom-indigo/15 dark:bg-[#14112b]/95 dark:border-white/15"
    style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
    {children}
  </div>
)

const CardIcon = () => (
  <span className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-bloom-rose to-bloom-indigo text-white">
    <Icon n="music" className="text-[13px]" />
  </span>
)

const CloseX = ({ onClose }) => (
  <button onClick={onClose} aria-label="不用了" className="icon-btn shrink-0 !w-8 !h-8">
    <Icon n="xmark" className="text-[12px]" />
  </button>
)

// Android / 桌面 Chrome：瀏覽器願意代勞，給一顆按鈕就好
export function PromptInstallCard({ prompt, onClose }) {
  return (
    <CardShell>
      <div className="flex items-center gap-3">
        <CardIcon />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold text-dream-ink">裝到手機上</span>
          <span className="block text-[12px] text-dream-faint">開起來沒有網址列，離線也看得到</span>
        </span>
        <button onClick={async () => { prompt.prompt(); await prompt.userChoice; onClose() }}
          className="btn-primary shrink-0 !h-9 !px-3.5 !text-[13px]">安裝</button>
        <CloseX onClose={onClose} />
      </div>
    </CardShell>
  )
}

// iOS Safari：沒有可以代按的 API，只能教。
// 分享鈕在 Safari 底部工具列，所以箭頭朝下、卡片底下有個指向那裡的小尖角。
export function IOSInstallCard({ onClose }) {
  return (
    <CardShell>
      <div className="flex items-start gap-3">
        <CardIcon />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-dream-ink">裝到主畫面</div>
          <div className="text-[12.5px] text-dream-sub mt-1 leading-relaxed">
            按下面的
            <span className="inline-flex items-center justify-center align-middle mx-1 w-5 h-5 rounded border border-dream-line text-bloom-indigo dark:border-white/20">
              <Icon n="arrow-up" className="text-[9px]" />
            </span>
            分享鈕，選「加入主畫面」
          </div>
        </div>
        <CloseX onClose={onClose} />
      </div>
      <span aria-hidden className="absolute left-1/2 -bottom-[7px] -translate-x-1/2 w-3.5 h-3.5 rotate-45 border-b border-r border-dream-line bg-white dark:bg-[#14112b] dark:border-white/15" />
    </CardShell>
  )
}

// 下拉重新整理。
//
// 這站的資料是即時抓 Google Sheet 的，「有沒有新公布」永遠是使用者最想知道的事，
// 但網頁沒有 App 那種下拉手勢，只能重新整理整頁。這裡補上。
//
// 只在捲到最頂端而且是往下拉的時候才接管；其餘情況完全不干擾正常捲動。
// 觸發門檻 72px，跟系統的手感接近。
export function PullToRefresh({ onRefresh }) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef(null)

  const THRESHOLD = 72
  const MAX = 110

  useEffect(() => {
    const canPull = () => window.scrollY <= 0 && !document.body.style.overflow

    const onStart = (e) => {
      start.current = canPull() && e.touches.length === 1 ? e.touches[0].clientY : null
    }

    const onMove = (e) => {
      if (start.current === null || busy) return
      const delta = e.touches[0].clientY - start.current
      if (delta <= 0) { start.current = null; setPull(0); return }
      if (!canPull()) { start.current = null; setPull(0); return }
      // 阻止瀏覽器自己的橡皮筋/重新整理，換成我們的
      if (e.cancelable) e.preventDefault()
      // 開根號讓越拉越沉，手感比線性好
      setPull(Math.min(MAX, Math.sqrt(delta) * 7))
    }

    const onEnd = async () => {
      if (start.current === null) return
      start.current = null
      if (pull < THRESHOLD) return setPull(0)
      setBusy(true)
      setPull(THRESHOLD)
      tap()
      try { await onRefresh?.(); done() } finally {
        setBusy(false)
        setPull(0)
      }
    }

    // touchmove 必須是非被動的，才能 preventDefault
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [pull, busy, onRefresh])

  const ready = pull >= THRESHOLD
  if (!pull && !busy) return null

  return (
    <div aria-hidden className="sm:hidden fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${pull - 44}px)`, transition: pull ? 'none' : 'transform .25s ease' }}>
      <span className={`grid place-items-center w-9 h-9 rounded-full bg-white shadow-lg shadow-bloom-indigo/20 text-bloom-indigo dark:bg-[#171436] ${busy ? 'animate-spin' : ''}`}
        style={{ transform: busy ? undefined : `rotate(${pull * 3}deg)` }}>
        <Icon n={busy ? 'compact-disc' : ready ? 'arrow-rotate-left' : 'arrow-up'} className="text-[13px]" />
      </span>
    </div>
  )
}

// 手機頂部的 App Bar。
//
// 桌機那條頁首（logo ＋ 站名 ＋ 分頁列）在手機上等於白佔 56px：
// 分頁已經搬到底部，站名每一頁都一樣。原生 App 的頂部只做三件事 ——
// 回上一頁、告訴你現在在哪、放兩顆常用動作。
//
// 標題平常不顯示（頁面自己的大標就是標題，跟 iOS 的 large title 一樣），
// 捲過去之後才淡入到中間，這樣捲到一半也知道自己在哪一頁。
export function MobileAppBar({ title, onBack, onSearch, onToggleDark, dark }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="sm:hidden h-11 flex items-center gap-1 px-1">
      {onBack ? (
        <button onClick={onBack} aria-label="回上一頁"
          className="shrink-0 inline-flex items-center gap-0.5 h-11 pl-1 pr-2 text-bloom-indigo">
          <Icon n="chevron-left" className="text-[15px]" />
          <span className="text-[15px]">返回</span>
        </button>
      ) : (
        <span className="shrink-0 grid place-items-center w-9 h-9 ml-1.5 rounded-lg bg-gradient-to-br from-bloom-rose to-bloom-indigo text-white text-[13px]">
          <Icon n="music" />
        </span>
      )}

      <span aria-hidden={!scrolled}
        className={`min-w-0 flex-1 text-center font-display font-bold text-[15px] text-dream-ink truncate transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
        {title}
      </span>

      <button onClick={onSearch} aria-label="快速搜尋" className="shrink-0 grid place-items-center w-11 h-11 text-dream-sub">
        <Icon n="magnifying-glass" className="text-[15px]" />
      </button>
      <button onClick={onToggleDark} aria-label="切換夜場模式" className="shrink-0 grid place-items-center w-11 h-11 text-dream-sub">
        <Icon n={dark ? 'sun' : 'moon'} className="text-[15px]" />
      </button>
    </div>
  )
}

// 手機底部導覽列。
//
// 六個分頁在 372px 的螢幕上塞不進頁首 —— 實測只看得到「首頁」「活動」，
// 另外四個被切在可捲動容器外，而且沒有任何看得出來可以滑的暗示。
// 手機改用底部列：全部六個都在，拇指也搆得到。
export function BottomNav({ tabs, page, onGo }) {
  return (
    <nav aria-label="主導覽"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-dream-line bg-white/92 backdrop-blur-md dark:bg-[#0b0a24]/92 dark:border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <ul className="grid grid-cols-6">
        {tabs.map(([key, label, icon]) => {
          const on = page === key
          return (
            <li key={key}>
              <button onClick={() => { tap(); onGo(key) }} aria-current={on ? 'page' : undefined}
                className={`relative w-full h-14 flex flex-col items-center justify-center gap-1 transition-colors ${
                  on ? 'text-bloom-indigo' : 'text-dream-faint'}`}>
                {on && (
                  <span aria-hidden className="absolute top-0 w-8 h-[2.5px] rounded-b-full bg-bloom-indigo" />
                )}
                <Icon n={icon} className="text-[15px]" />
                <span className="text-[10.5px] font-medium leading-none">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// 兩顆浮動鈕收在同一個容器，間距只定義一次，也一起讓開手機底部的安全區
export function FloatingDock({ onRandom }) {
  const [showTop, setShowTop] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="fixed right-4 sm:right-6 bottom-[72px] sm:bottom-6 z-40 flex flex-col items-center gap-2.5"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="回到頂部"
          className="grid place-items-center w-11 h-11 rounded-full text-white bg-bloom-indigo hover:bg-bloom-violet transition-colors shadow-lg shadow-bloom-indigo/30 animate-pop"
        >
          <Icon n="arrow-up" />
        </button>
      )}
      <button
        onClick={onRandom}
        aria-label="隨機抽一場"
        title="隨機抽一場"
        className="group grid place-items-center w-11 h-11 rounded-full bg-white border border-dream-line text-bloom-indigo shadow-lg shadow-bloom-indigo/15 hover:text-white hover:bg-bloom-indigo hover:border-bloom-indigo transition-colors dark:bg-white/10 dark:border-white/15"
      >
        <Icon n="wand-magic-sparkles" className="transition-transform group-hover:rotate-12 group-active:scale-90" />
      </button>
    </div>
  )
}

// 流量與效能量測。
//
// 兩個都是 Vercel 自家的，不放 cookie、不做跨站追蹤，所以不需要同意橫幅。
//   Analytics     ── 有多少人、看哪一頁、從哪裡進來
//   SpeedInsights ── 真實使用者的載入與互動延遲（Core Web Vitals）
//
// 為什麼要後者：行動版剛大改過，但「快不快」目前完全沒有數據，
// 只有我在自動化環境量到的數字。這支收的是真手機、真網路的結果。
//
// 只在正式站載入 —— 開發時的重新整理不該算進流量，
// 本機的載入速度也不能代表使用者的。
export function Analytics() {
  if (!import.meta.env.PROD) return null
  return (
    <>
      <VercelAnalytics />
      <SpeedInsights />
    </>
  )
}
