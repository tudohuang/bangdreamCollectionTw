import { useEffect, useState } from 'react'
import { isStandalone, isIOS, isIOSSafari } from '../utils/platform.js'
import Icon from './Icon.jsx'

// 「我的」頁面上的常駐安裝入口。
//
// 為什麼要有：底部那張邀請卡按掉之後就收起來 30 天，而且一開始也只對
// 回訪的人出現。如果沒有第二個入口，一個想裝的人除非自己知道
// Safari 分享選單那一招，否則就是沒辦法。
//
// 已經裝好的人（獨立視窗）看到的是另一段話 —— 那時候這塊該講的是
// 「你已經裝好了」，不是再叫他裝一次。
export default function InstallCard() {
  const [mode, setMode] = useState(null)   // 'installed' | 'prompt' | 'ios' | 'other'
  const [prompt, setPrompt] = useState(null)

  useEffect(() => {
    // localStorage 與 UA 都只有瀏覽器有，要等 mount
    if (isStandalone()) { setMode('installed'); return }
    if (isIOSSafari()) { setMode('ios'); return }

    // Android / 桌面 Chrome：等瀏覽器願意代勞。它不一定會丟這個事件
    // （已經裝過、或它覺得這站不夠格），所以先給 other 當保底。
    setMode('other')
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); setMode('prompt') }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!mode) return null

  return (
    <div className="glass p-5 sm:p-6">
      <h3 className="flex items-center gap-2.5 font-display font-bold text-[18px] text-dream-ink">
        <Icon n="house" className="text-bloom-indigo" />
        {mode === 'installed' ? '已經在你的主畫面上' : '裝到手機上'}
      </h3>

      {mode === 'installed' && (
        <p className="mt-2 text-[14px] text-dream-sub">
          你現在開的就是主畫面上那顆。沒有網址列、離線也開得起來，
          資料有更新時打開就是新的。
        </p>
      )}

      {mode === 'prompt' && (
        <>
          <p className="mt-2 text-[14px] text-dream-sub">
            加到主畫面之後開起來沒有網址列，離線也看得到已經載過的內容。
          </p>
          <button
            onClick={async () => { prompt.prompt(); await prompt.userChoice; setPrompt(null); setMode('other') }}
            className="btn-primary mt-4">
            <Icon n="arrow-up" /> 加到主畫面
          </button>
        </>
      )}

      {mode === 'ios' && (
        <>
          <p className="mt-2 text-[14px] text-dream-sub">
            加到主畫面之後開起來沒有網址列，離線也看得到已經載過的內容。
          </p>
          <ol className="mt-3 space-y-1.5 text-[14px] text-dream-ink">
            <li>1. 點下面工具列中間的<strong>分享</strong>鈕</li>
            <li>2. 往下找<strong>「加入主畫面」</strong></li>
            <li>3. 右上角<strong>加入</strong></li>
          </ol>
        </>
      )}

      {mode === 'other' && (
        <p className="mt-2 text-[14px] text-dream-sub">
          {isIOS()
            // iOS 上只有 Safari 能加到主畫面。在 Chrome、Line、IG 內建瀏覽器裡
            // 教他點分享鈕，他只會找不到那個選項。
            ? '在 iPhone 上要用 Safari 開才裝得起來 —— 其他瀏覽器（Chrome、Line、IG 內建的）沒有這個功能。用 Safari 開這個網址就會看到教學。'
            : '在瀏覽器的選單裡找「安裝應用程式」或「加到主畫面」。找不到的話，通常是這個瀏覽器不支援 —— 換 Chrome 或 Edge 開就有。'}
        </p>
      )}
    </div>
  )
}
