# 邦邦來台圖鑑 · Taiwan BanG Dream! Event Collection

一份關於 BanG Dream! 相關聲優、樂團與活動在台灣的收藏紀錄（2018–2026）。

## 資料庫（選用）

站本身不需要資料庫 —— 它讀建置時產的 JSON。
`db/` 底下是一層 PostgreSQL：schema、約束、ETL 與分析查詢，
用來把資料當成資料來管。本機用 PGlite（真的 Postgres 編成 WASM，
免安裝免開帳號），設 `DATABASE_URL` 就切到雲端。詳見 [db/README.md](db/README.md)。

## 專案結構

React + Vite + Tailwind，沒有後端；資料放在 Google Sheet，前端直接抓發布出來的 CSV。

```
src/
  App.jsx          路由（網址 hash）、全域狀態、頁面切換
                   六個分頁：首頁＝現在、活動＝歷史、人物＝人、統計＝故事、我的＝個人化、Labs＝實驗
  hooks/           useEvents（活動）、usePulse（名冊＋日本動態）：抓 CSV、快取、失敗退回內建資料
  utils/           所有不碰畫面的邏輯：解析、篩選、統計、產圖、地圖投影
  components/      畫面。一個檔案一個區塊，資料一律由 props 傳入
  data/events.json 內建資料，Sheet 抓不到時的後備，同時也是更新日誌的比對基準
  data/changelog.json 每次同步 Sheet 產生的異動紀錄
  server/          分享頁 HTML（給 Cloudflare Functions 用，只用 Web 標準 API）
functions/         Cloudflare Pages Functions：/e /p /b 分享頁、/api/img 圖片代理
api/               同樣兩支的 Vercel 版（只是轉接層，邏輯共用 src/server/）
content/impressions/ 手寫的那一層：心得、一句話、曲目、票價…（Markdown），建置時折進 events.json
scripts/           匯入、驗證、週報、OG 圖、看盤終端（都在本機跑，與網站無關）
tests/             utils 的單元測試
```

資料流是單向的：

```
Google Sheet ─CSV→ hooks ─parse→ utils ─props→ components
```

三個分頁的角色：**活動**（來台場次，網站主體）、**名冊**（聲優屬於哪個團，全站以它為準）、**動態**（這些人在日本的行程）。

驗證方式：

```bash
npm run verify   # 推之前跑這個：測試 + 完整 build（含 prebuild / postbuild）
npm test         # utils 單元測試 + 把每個畫面在 Node 裡 render 一遍
npm run validate # 檢查 events.json 的資料品質
npm run dead     # 找出 export 了但沒有任何人 import 的東西
npm run health   # 資料缺在哪：欄位覆蓋率 + 具體待辦（寫成 docs/health.md）
npm run template # 產出照編號排好的空白 TSV，填完貼回 Sheet
npm run snapshot # 把 Sheet 的「名冊」「動態」兩張分頁存成本機副本
npm run splash   # 產 iOS 加到主畫面的啟動畫面（改圖案時才要跑）
npm run icons:data # 從 FontAwesome 抽出用到的圖示路徑（加圖示時才要跑）
```

`npm run health` 刻意不是測試 —— 資料不完整不是錯誤，是待辦，
紅燈會讓人習慣忽略紅燈。想知道「現在最該補什麼」跑它就對了。

### 開發工具（只在 dev server 上，不會進 dist）

#### 填表台 `/__fill`

一次一筆把欄位填完。旁邊放齊寫這句話需要知道的東西 —— 封面、日期、
場館、誰來了、這是那個團第幾次來、距上一場多久、同一週還有幾場。
打完 <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 跳下一筆，進度存在瀏覽器裡，隨時可以關掉。
填完按「匯出 TSV」複製，貼回 Sheet。

`docs/template/*.tsv` 也還在，兩個都能用 —— 差別只在摩擦。

#### 行動版檢視台 `/__mobile`

`npm run dev` 之後開 `/__mobile`。把每個畫面各塞進一個手機尺寸的 iframe
一次排開，可以換裝置（含 Galaxy Fold 344px 這種極窄的）、切夜場模式、同步捲動。
標題旁會自動標出「寬度不對／橫向溢出／內容被切」——
絕對定位的裝飾與 object-cover 的裁切不算，不然每頁都會亮黃燈，然後你就開始無視它。

截圖模式會拿掉機殼與縮放，框內剛好是裝置真實像素。

> **不要用 `npx vite build` 當作驗證。** 它會跳過 `prebuild`（心得折進 JSON）
> 與 `postbuild`（OG 圖與分享頁），那兩支壞掉在本機看不出來，
> 但正式部署一定失敗 —— 這個坑已經踩過一次。

### Sheet 可填的欄位（全部都吃得到）

基本欄位之外，在表頭加這些欄就會自動生效，等於整本圖鑑都能在 Sheet 維護：

| 欄名 | 用途 |
|---|---|
| `ID` | **永久鍵**。照片、心得檔名、打卡備份碼、分享網址全都綁它，一旦給就不能再改、不能重複使用。沒這欄時退回用 `編號`（等於現在的行為）|
| `編號` | 圖鑑上看到的 `#042`。這是**顯示用**的序號，可以隨時重排 |
| `地點` | 場館（詳情顯示＋Google 地圖連結＋場館/城市統計）|
| `城市` | 選填；不填會自動從地點/標題判斷 |
| `封面` | 指定卡片封面（留空＝用照片第一張）|
| `照片` | 檔名（放 `public/photos/`）或圖片網址；支援直接貼 **Google Drive／Dropbox 分享連結**，會自動轉成可顯示的圖。多張用空白/換行分隔 |
| `購票連結` | 詳情顯示購票按鈕 |
| `主辦` | 主辦單位 |
| `簡介` | 活動簡介（長文）|
| `備註` | 詳情頁的備註欄 |
| `來源` | 參考連結，多個用空白/換行分隔 |
| `一句話` | 站長對這場的一句評語，印在詳情頁票根下方。門檻比完整心得低很多 |
| `心得` | 短心得。長文寫在 `content/impressions/<ID>.md`（見下）|
| `場次` | 這一筆實際有幾場演出。留空時用天數推，快閃店與展覽一律算一場 |
| `開賣` | 開賣日。填了詳情頁的時間線就會多一個點（公布 → 開賣 → 演出）|
| `關聯` | `官方本體` / `強關聯` / `弱關聯`。留空時程式依規則推，推錯就補這一格 |
| `曲目` | 一行一首，開頭編號可有可無；安可另起一行寫「安可」。詳情頁會算「這首在台灣第幾次」|
| `票價` | 分區用 `/` 隔開，可帶區名：`搖滾區 3800 / 座位區 2800` |
| `周邊` | 場販清單，一行一項，價格接在後面。名字含「台版限定」會自動標出來 |
| `主視覺` | 繪師名，後面可接來源網址 |
| `售票狀況` | 「完售」「開賣 3 分鐘完售」。事後查不到的東西，當下不記就沒了 |
| `場刊` | 場刊目次，一行一項 |
| `系列` | 留空會自動判斷（Bushiroad EXPO 那種跨年度的）。判錯才填 |

「名冊」分頁也多認一欄 `連結`：官推、官網、Eventernote，多條用空白分隔。
人物頁與樂團頁會多出一排出口，名字依網域自動判斷。

> 上面這四欄目前 Sheet 還沒有，直接在最右邊加欄、表頭照著寫就會生效。
> 解析規則在 `src/utils/archive.js`，四塊都是沒資料就整塊不出現。

> **加了 `ID` 欄之後，編號就可以隨你重排。** 在沒有 `ID` 欄的情況下，
> 編號同時扮演「圖鑑序號」和「永久鍵」兩個角色，重排會讓心得與照片對到別場活動。
> 遷移方式：新增一欄 `ID`，值直接複製現在的 `編號` —— 當下什麼都不會變，
> 但從此兩者各自獨立。

### 心得寫在檔案裡，不寫在 Sheet

心得是幾百字的文章，塞進試算表的一個儲存格既難寫也難改。
所以長內容放 `content/impressions/<ID>.md` —— 檔名是**永久鍵 ID**，不是編號，所以在 Sheet 中間插一列重排編號也不會錯位：

```markdown
---
一句話: 表演神，其他全爛。
---

開場前排隊就知道今天會出事……
```

`npm run impressions` 會折進 `src/data/events.json`（`npm run build` 也會自動跑）。
支援粗體、斜體、連結、清單、`>` 引言、`##` 小標。詳見 `content/impressions/README.md`。

### 手機（可安裝的 App）

加到主畫面之後會用獨立視窗開啟，沒有網址列。相關檔案：

| 檔案 | 用途 |
|---|---|
| `public/manifest.webmanifest` | 名稱、圖示、`display: standalone`、三個捷徑 |
| `public/icons/*` | `npm run icons` 產生，圖案取自頁首 logo 的同一顆 FontAwesome 圖示 |
| `public/sw.js` | Service worker：離線也開得起來 |

Service worker 只有三條規則，刻意寫得保守：HTML 走「先連線」（部署後一定拿得到新版）、
`/assets/*` 走「先快取」（Vite 檔名帶內容 hash，不會拿到舊的）、圖片走「先給快取、背景更新」。
Google Sheet 的 CSV 完全不碰，交給 App 自己的 localStorage 快取。
`_headers` 有把 `/sw.js` 設成 `no-cache` —— 這條不能漏，否則之後改快取策略推不出去。

**詳情頁在手機上是一整頁，不是浮層。** 從右邊推進來（`.push-page`），
左上角是「返回」不是叉叉，上下張的箭頭收起來（那裡改用手勢）。

手機專屬的操作：

- **下拉重新整理** —— 重抓 Sheet。資料是即時的，這個手勢真的有用
- **從左邊緣往右滑** —— 返回，頁面跟著手指走
- **在畫面中間左右滑** —— 切換上一場／下一場

  後兩者靠「從哪裡開始滑」分辨（邊緣 28px 內算返回），跟 iOS 一樣；
  縱向明顯比較大的一律放行，不然一邊捲動一邊會誤觸。

版面上刻意不沿用桌機那一套：桌機是「卡片浮在留白上」，把它縮窄只會變成
一堆擠在一起的小方框。手機改成滿版清單 —— `.glass` 在 `sm` 以下會拿掉圓角、
側邊框與陰影並往兩側撐滿（見 `index.css` 的「手機的版面規則」），
篩選列不換行改成可橫滑的一條，頁尾只留資料來源那行。
頂部是 `MobileAppBar`：只做返回、告訴你在哪一頁、搜尋與夜場模式；
標題平常隱藏，捲過 64px 才淡入到中間（頁面自己的大標就是 large title）。

還有幾件「不做就會覺得這是網頁」的事：

- **返回鍵**：浮層是疊上去的，關掉時用 `history.back()` 把它從歷史退掉，
  而不是再推一筆新的 —— 否則關掉詳情後按返回鍵，詳情會再跳出來。
  直接開分享連結進來的沒有上一頁可退，那時才 fallback 成 `replaceState`。
- **捲動位置記憶**：每個畫面各自記住捲到哪，切回來時放回去（`App.jsx` 的 `scrollMem`）。
  換篩選條件時記憶會作廢，因為那是新的一批結果。
- **點目前分頁 = 回到最上面**，跟 App 的分頁列一樣。
- **按下狀態**：手機沒有 hover，沒有 `:active` 的縮放回饋就會覺得「按了沒反應」。
- **觸覺回饋**（`utils/haptics.js`）：只在切分頁、打卡、下拉重新整理完成時震一下。
  用 `navigator.vibrate`，iOS Safari 沒有這個 API，那邊就安靜地沒有回饋。
- **theme-color 跟著站上的夜場模式走**（不是跟著系統偏好）。夜場模式是 class 切換，
  用 `prefers-color-scheme` 的兩條 meta 會對不上 —— 加到主畫面後那條色差就是狀態列。

### iOS

iOS Safari 沒有 `beforeinstallprompt`，所以 iPhone 使用者永遠不會看到安裝按鈕。
`utils/platform.js` 認出 iOS Safari 後改顯示教學卡（`IOSInstallCard`）：
「按下面的分享鈕，選加入主畫面」，卡片底下有指向 Safari 工具列的小尖角。
iOS 上的 Chrome / Firefox / Line 內建瀏覽器加不了主畫面，所以那些不顯示。

六個分頁在 372px 的螢幕上塞不進頁首，所以手機改用**底部導覽列**
（`BottomNav`，見 `components/Chrome.jsx`），頁首那條分頁列在 `sm` 以下隱藏，
空出來的位置給搜尋列。

排版上最容易踩到的坑是 **flex / grid 子項不會縮到 min-content 以下** ——
一個長標題就能把整張卡撐得比螢幕寬，然後被外層的 `overflow-x-clip` 靜靜切掉：
頁面不會橫向捲動，所以看起來沒事，但內容其實是被裁掉的。
`truncate` 要生效，從卡片到文字之間的**每一層**都要有 `min-w-0`。

### 詳情頁的史料層

活動詳情頁除了基本資料，還會自動長出三段（沒資料的那段整個不出現）：

- **這場的時間線** —— 公布日來自更新日誌，開賣日來自 `開賣` 欄，演出來自日期欄
- **當時的其他行程** —— 從「動態」分頁撈出演者前後一個月在台灣以外的場次，
  看得出這一站在整趟巡迴裡的位置。這是全站唯一別人重建不出來的東西
- **同時期的台灣** —— 前後 45 天內台灣還有哪些場

邏輯在 `src/utils/chronicle.js`，畫面在 `src/components/Chronicle.jsx`。

### 更新日誌

`npm run import -- <Sheet CSV 網址>` 會先跟上一次的 `events.json` 比對，
把新增與異動寫進 `src/data/changelog.json`，首頁的「最近公布」與統計頁的
「最近改了什麼」就是讀它。只追蹤日期、場地、名稱、售票、緊急性、出演者 ——
補心得或換封面不算異動。


### 本體 vs 個人 vs 關聯程度（重要）

`本體／擦邊` 欄位區分兩種來台性質：

- **本體**：BanG Dream! 官方活動，卡片以**樂團**為主視覺。
- **擦邊（顯示為「個人」）**：聲優以**個人身分**來台，只是與某樂團／角色有關聯。卡片改以**聲優**為主，樂團/角色只作柔性標註，不會硬綁邦邦。

`團體／關聯` 欄寫成 `樂團／角色`（全形斜線），例如 `Roselia／湊友希那`、`Ave Mujica／sumimi／純田真奈`。

兩分法在統計上不夠用：同一位聲優可能是自己的個人 LIVE，也可能只是去別的作品的舞台站台，
全部算「擦邊」會讓樂團的出現次數虛胖。所以站上再分三級（`src/utils/relation.js`）：

- **官方本體** —— 以 BanG Dream! 企劃或旗下樂團名義舉辦
- **強關聯** —— 出演者以自己的名義辦的 LIVE 或見面會
- **弱關聯** —— 音樂祭、展會、其他作品的活動

沒填 `關聯` 欄時由程式推論，統計頁會明講有幾筆是推的。

## 資料來源

所有活動資料在 `src/data/events.json`，從 CSV 轉換而來。每筆活動格式：

```json
{
  "id": "evt-001",
  "number": 1,
  "year": 2018,
  "startDate": "2018-02-03",
  "endDate": "2018-02-03",
  "month": 2,
  "title": "活動名稱",
  "type": "FMT",
  "people": ["聲優A", "聲優B"],
  "relatedGroups": ["Poppin'Party"],
  "category": "本體",
  "isFullBand": false,
  "attendanceCount": 3,
  "venue": "",
  "city": "",
  "photos": [],
  "cover": "",
  "ticketUrl": "",
  "organizer": "",
  "description": "",
  "impression": "",
  "sources": [],
  "notes": "",
  "lastUpdated": "2026-06-11"
}
```

新增活動只需在這個 JSON 加一筆即可。


## 部署

Cloudflare Pages 與 Vercel 都能直接部署，兩邊共用同一份邏輯（`src/server/shareHtml.js`），
差別只在轉接層：Cloudflare 用 `functions/`，Vercel 用 `api/` + `vercel.json`。
選定之後把另一邊刪掉就好。

### Cloudflare Pages

後台 → Workers & Pages → Create → Pages → 連 GitHub repo，設定：

| 欄位 | 值 |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| 環境變數 | `SITE_URL` = 正式網址（例：`https://bangdream.tw`）|

`functions/` 會被自動掛成路由，不用額外設定：

| 路由 | 做什麼 |
|---|---|
| `/e/<場次 id>` | 帶正確 og:* 的分享頁（爬蟲讀 meta、真人轉進 App）|
| `/p/<聲優>`、`/b/<樂團>` | 同上，聲優／樂團版 |
| `/api/img?u=<網址>` | 圖片代理，給「存成圖」補 CORS 標頭 |

`SITE_URL` 沒設也能跑（會用該次部署的 `CF_PAGES_URL`），但正式網域寫死比較穩，
分享出去的 og:image 才不會指到 preview 網址。

本機要試 functions：`npm run dev` 就會把它們接進 dev server（見 `vite.config.js`）；
想跑更接近正式環境的，用 `npm run preview:cf`（需要 `npx wrangler`）。

### Vercel

連 repo 就好，`vercel.json` 已經把 /e /p /b 轉到 `api/share.js`。

**不用買網域。** Vercel 免費給的 `xxx.vercel.app` 就是正式網址，
建置時會自動從 `VERCEL_PROJECT_PRODUCTION_URL` 讀出來，sitemap 與
og:image 都會是絕對路徑，什麼都不用設。

只有換成自己的網域時才要手動設 `SITE_URL`。

> 用 `VERCEL_PROJECT_PRODUCTION_URL` 而不是 `VERCEL_URL`：後者每次部署
> 都是新的網址，拿它當 canonical 會讓搜尋引擎每次都看到不同的頁。

### 被搜尋引擎找得到

這站是 hash 路由，`#` 後面永遠不會送到伺服器，所以 Google 只看得到首頁一頁。
`/e/<id>` 與 `/p/<名字>` 就是為了補這個 —— 它們是**真的有內容的靜態頁**，
不需要 JavaScript 就讀得完，並帶 JSON-LD（`Event` / `Person` / `MusicGroup`）。

> 這兩種頁曾經只有 1448 bytes，body 裡一個連結然後 `location.replace` 跳走。
> 搜尋引擎看到的是沒有內容的轉址頁 —— 等於 59 場活動與 53 個人物全部沒被收錄。
> 現在活動頁約 6 KB、人物頁約 6 KB，都是可索引的內容。

渲染邏輯在 `src/server/entryPage.js`，三個地方共用同一份：
Vercel 的函式、Cloudflare 的函式、以及靜態主機的建置產物。

**清單頁**（`/y/2026`、`/v/<場館>`、`/t/FMT`）是後來補的。
原因是這站原本只有「單筆」頁面，但人在 Google 打的是
「2026 邦邦 台灣」「台北世貿一館 演唱會」「邦邦 見面會」——
那種查詢單筆頁排不上去，清單頁才排得上。

門檻刻意設高，只產有份量的：年份不限、場館要 2 筆以上、類型要 3 筆以上。
一筆的清單頁跟單筆頁內容重複，會被判定為薄內容，拖累整站。

> 門檻寫在兩個地方（`scripts/build-og.mjs` 與 `src/server/shareHtml.js`），
> 兩邊要一致 —— 不然條目頁會連到不存在的清單頁。

每一頁都帶的東西（使用者看不到，只影響搜尋結果）：

| 項目 | 作用 |
|---|---|
| `max-image-preview:large` | 搜尋結果放大張縮圖而不是小方塊，差在點擊率 |
| `max-snippet:-1` | 摘要不被截斷 |
| `og:locale` / `og:site_name` | 分享卡片顯示站名 |
| `BreadcrumbList` | 結果顯示「邦邦來台圖鑑 › 2026 年 › 這場」 |
| `Event` 帶 `geo` | 58 場有座標，Google 認得出是實體場地 |
| `ItemList` | 清單頁被認出是清單 |
| `WebSite` + `SearchAction`（首頁）| 有機會在結果下方出現站內搜尋框 |
| sitemap `lastmod` | 從更新日誌算，Google 不用整份重爬 |
| sitemap `image:image` | 110 張圖進 Google 圖片，那是另一條進站來源 |

首頁還有一段 `<noscript>` 的分類連結。這站是 hash 路由，首頁對
不執行 JS 的爬蟲來說是空的 —— 沒有那一段，138 個頁面只能靠 sitemap
被發現，彼此之間沒有連結關係。有 JS 的使用者永遠看不到它。

目前的頁面數：

| 種類 | 數量 |
|---|---|
| 活動 `/e/` | 59 |
| 人物 `/p/` | 40 |
| 樂團 `/b/` | 13 |
| 年份 `/y/` | 6 |
| 場館 `/v/` | 14 |
| 類型 `/t/` | 5 |
| **sitemap 合計** | **138** |

### 流量數據

正式部署在 **Vercel**，量測用它自家的兩支：

| 套件 | 收什麼 | 後台位置 |
|---|---|---|
| `@vercel/analytics` | 有多少人、看哪一頁、從哪裡進來 | 專案 → Analytics |
| `@vercel/speed-insights` | 真實使用者的載入與互動延遲（Core Web Vitals）| 專案 → Speed Insights |

程式端不用填任何 token，在後台各按一次開關就會開始收。
兩支都不放 cookie、不做跨站追蹤，所以不需要同意橫幅。

只有 production build 會載入（`import.meta.env.PROD`）——
開發時的重新整理不該算進流量，本機的速度也不能代表使用者的。

> 為什麼要收效能：行動版剛大改過，但「在真手機上快不快」目前
> 完全沒有數據，只有自動化環境量到的數字。Speed Insights 收的
> 是真裝置、真網路的結果。

`functions/` 底下那份 Cloudflare Pages Functions 先留著 ——
邏輯與 `api/` 共用 `src/server/`，留著不影響 Vercel 部署，
之後若要搬也不用重寫。

## 看盤終端（scripts/watch.mjs）

盯追蹤名單在日本的新活動與售票狀態，跟網站無關，只在本機跑。

```bash
npm run watch:resolve            # 一次性：把「名冊」對到 eventernote / e+ 的 id
npm run watch                    # 開看盤（預設一天一輪）
npm run watch -- --interval 360  # 改成 6 小時一輪
npm run watch -- --once --export # 跑一輪就結束並寫出 CSV（適合丟排程）
```

盯五種來源：

| 來源 | 抓什麼 |
|---|---|
| eventernote | 每個人的行程（日期／會場／出演者） |
| イープラス | 藝人頁的售票資訊，**含「抽選／先行／一般発売」狀態** |
| チケットぴあ | `rlsInfo.do` 的發售一覽（關鍵字比對很鬆，有做嚴格過濾） |
| 官方／FC 公開消息頁 | 標題有沒有新的 |
| 台灣新聞站 | 關鍵字搜尋（華視）。搜尋很鬆，所以標題要真的含關鍵字才算；`聲優` 這種很廣的字再加一層 `require`（來台／見面會／開賣…）|

鍵盤：`q` 離開 · `r` 立即更新 · `t` 切換「異動流水／台灣清單」 · `c` 匯出「動態」分頁可貼的 CSV · `↑↓` `PgUp/PgDn` `g/G` 捲動。

**異動流水只有「這次開機之後」的變化**，基準線建好後通常是空的；
已經盯到的台灣場次按 `t` 從狀態檔看（畫面上方會顯示總數）。
標題或會場出現台北／台灣／高雄等字樣會轉紅並響鈴；售票狀態從「抽選」變「一般発売」也會報。

只讀公開頁面，FC 會員限定內容在登入後面（不做自動登入抓取）。
請求間隔 1.5 秒、預設一天一輪，`--interval` 不要調到 5 分鐘以下。

非營利、非官方紀錄。
