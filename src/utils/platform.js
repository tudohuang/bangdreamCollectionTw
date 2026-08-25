// 平台判斷。
//
// 只在「同一件事在不同平台要用不同做法」時才用它 ——
// 拿來做功能開關會很快失控。目前只有一個用途：
// 「加到主畫面」在 Android 是一顆按鈕，在 iOS 只能教使用者自己按。

export const isStandalone = () =>
  typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )

// iPadOS 13 之後 UA 會偽裝成 Mac，多判一個觸控點才抓得到
export const isIOS = () => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1)
}

// iOS 上只有 Safari 能加到主畫面。Chrome / Firefox / Line 內建瀏覽器都不行，
// 對他們顯示「點分享按鈕」的教學只會讓人找不到那顆按鈕。
export const isIOSSafari = () => {
  if (!isIOS()) return false
  const ua = navigator.userAgent || ''
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Line|FBAN|FBAV|Instagram/.test(ua)
}
