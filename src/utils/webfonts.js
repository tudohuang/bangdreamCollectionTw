// 網頁字型要等第一個畫面畫出來之後才去拿。
//
// 原本 index.html 直接掛 Google Fonts 的 <link rel="stylesheet">：那支 CSS 有 200 KB
// （三個中文字型 × 六種字重 × 上百片 unicode-range），後面再拖出二十幾個、加起來
// 1.2 MB 的字型檔。瀏覽器把字型排在最高優先，Lighthouse 也照這個優先度把它們全算進
// 首屏的關鍵路徑 —— 慢速 4G 模擬下 FCP 被推到 10 秒，效能分數卡在 56。
//
// 真正的使用者體驗其實是：先用系統字把畫面畫出來，字型到了再換上去（display=swap）。
// 這裡把它做成明確的順序：React 第一次 commit → 畫一格 → 才把字型的 <link> 掛上去。
// 最終長相完全一樣，只是換字的那一下從「等到才畫」變成「先畫再換」。
// 回訪的人字型檔在瀏覽器快取裡，換字幾乎看不出來。
//
// 字重只留有在用的：Noto Sans TC 400/500/700（900 全站沒人用，砍掉少載四片），
// Outfit 500–800，文楷 400/700。
export const WEBFONT_CSS =
  'https://fonts.googleapis.com/css2' +
  '?family=Noto+Sans+TC:wght@400;500;700' +
  '&family=Outfit:wght@500;600;700;800' +
  '&family=LXGW+WenKai+TC:wght@400;700' +
  '&display=swap'

let started = false

export function loadWebFonts() {
  if (started || typeof document === 'undefined') return
  started = true
  const inject = () => {
    if (document.querySelector(`link[href="${WEBFONT_CSS}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = WEBFONT_CSS
    document.head.appendChild(link)
  }
  // rAF 排在下一格「畫之前」，再包一層 setTimeout 才會落在那一格畫完之後
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => setTimeout(inject, 0))
  } else {
    setTimeout(inject, 0)
  }
}
