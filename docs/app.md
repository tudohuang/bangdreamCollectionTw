# 為什麼不做成 App

2026-08-29 決定：**維持網站，不上架。**

## 查過的價錢

| | 費用 | 真正的門檻 |
|---|---|---|
| 加到主畫面 | 0 | 沒有 —— 現在就能用 |
| Google Play（TWA） | US$25 一次性 | 新的個人開發者帳號要先做封閉測試：**12 個測試者、連續 14 天** |
| App Store | US$99／年 | 年費制，停繳下架。沒有免門檻的路 |

Play 的 TWA 不是 WebView 套殼 —— 它開的是真的 Chrome 引擎跑真的這個網站，
所以網站更新＝App 更新，不用重新送審。技術上不難，難的是那 14 天流程。

## 為什麼還是不做

上架換到的東西（商店裡搜得到、可以貼商店連結）對這個站的價值，
不值得那 14 天的流程與之後每次改版的維護。

而且**這站的 PWA 已經是一個 App 了**：manifest、Service Worker、
三種圖示、36 張 iOS 啟動畫面、Android 與 iOS 各自的安裝引導都在。
加到主畫面之後沒有網址列、有自己的啟動畫面、離線開得起來。
上架多買到的只有「在商店裡」這件事本身。

## 如果哪天改變主意

`public/manifest.webmanifest` 已經備好 TWA 需要的欄位（`id`、
`display_override`、`prefer_related_applications`），build 也會在
`public/screenshots/` 有圖時自動把 `screenshots` 寫進 manifest。

還缺的只有兩樣：
1. `public/.well-known/assetlinks.json`（本次已刪 —— 放著假指紋沒有意義，
   要用的時候 PWABuilder 產包會直接給你一份）
2. 截圖：`npm run dev` → `/__mobile` → 截圖模式，框內就是裝置真實像素

包裝用 https://www.pwabuilder.com/ 貼網址即可，本機不用裝 Android SDK。
