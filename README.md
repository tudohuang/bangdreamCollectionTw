# 邦邦來台圖鑑 · Taiwan BanG Dream! Event Collection

一份關於 BanG Dream! 相關聲優、樂團與活動在台灣的收藏紀錄（2018–2026）。
不是資料庫，而是一本可以翻閱的圖鑑。

## 本地開發

需要 Node.js 18+。

```bash
npm install
npm run dev          # 本地預覽 http://localhost:5173
npm run build        # 產生 dist/
npm run preview      # 預覽 build 結果
```

## 更新資料（最快的方式）

資料以 Google 試算表維護，匯出成 CSV 後一鍵轉換：

```bash
npm run import          # 讀「邦邦來台 - 工作表1.csv」→ src/data/events.json
npm run import -- a.csv # 或指定其他 CSV
npm run validate        # 檢查重複編號 / 日期格式 / 未知樂團 等
```

- 匯入會**保留**你在 JSON 手動補的欄位（venue / description / impression / photos / sources / notes），以「活動編號」為合併鍵，不會被洗掉。
- 資料不全也沒關係：缺聲優、缺日期、`2026-09-??` 之類都能優雅顯示，不會壞版。
- `npm run import` 也能直接吃網址：`npm run import -- "https://docs.google.com/.../pub?output=csv"`。

### 即時抓 Google Sheet（免 rebuild）

想改完試算表、網站馬上更新、不用重 build：

1. Google Sheet →「檔案 → 共用 → 發布到網路」→ 選工作表、格式選 **CSV**，複製網址。
2. 把網址貼到 `src/config.js` 的 `SHEET_CSV_URL`。

之後每次開網站，瀏覽器會即時抓 Sheet 並與內建資料**合併**（照片 / 心得 / 簡介等手動欄位以內建為準，不會被 Sheet 的空白洗掉）。抓取失敗（離線 / CORS / 格式錯）會自動退回內建 `events.json`，頁尾會標示目前資料來源。

> 即時抓的代價：Sheet 網址會公開、載入稍慢，且分享用的 OG 圖仍以 build 當下的內建資料為準。要分享縮圖精準，記得改完後也跑一次 `npm run import` + build。

### Sheet 可填的欄位（全部都吃得到）

基本欄位之外，在表頭加這些欄就會自動生效，等於整本圖鑑都能在 Sheet 維護：

| 欄名 | 用途 |
|---|---|
| `地點` | 場館（詳情顯示＋Google 地圖連結＋場館/城市統計）|
| `城市` | 選填；不填會自動從地點/標題判斷 |
| `照片` | 圖片網址或 `public/photos/` 檔名，多張用空白/換行分隔 |
| `封面` | 指定卡片封面（留空＝用照片第一張）|
| `購票連結` | 詳情顯示購票按鈕 |
| `主辦` | 主辦單位 |
| `簡介` | 活動簡介（長文）|
| `心得` | 個人心得（長文）|
| `來源` | 參考連結，多個用空白/換行分隔 |

### 加入活動照片 / 宣傳照

兩種來源可混用，填在 `photos` 陣列（或 Sheet 的「照片」欄）：

- **本機檔**：圖丟進 `public/photos/`，填檔名 `"evt-034-1.jpg"`。
- **外部網址**：圖床 / 官方宣傳照，填完整網址 `"https://i.imgur.com/xxx.jpg"`。

第一張自動當卡片封面（也可用 `cover` 欄另外指定）。詳情頁有相簿，點圖可放大。細節見 `public/photos/README.md`。

### 本體 vs 個人（重要）

`本體／擦邊` 欄位區分兩種來台性質：

- **本體**：BanG Dream! 官方活動，卡片以**樂團**為主視覺。
- **擦邊（顯示為「個人」）**：聲優以**個人身分**來台，只是與某樂團／角色有關聯。卡片改以**聲優**為主，樂團/角色只作柔性標註，不會硬綁邦邦。

關聯欄寫成 `樂團／角色`（全形斜線），例如 `Roselia／湊友希那`、`Ave Mujica／sumimi／純田真奈`。

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

## 部署到 Vercel（推薦，免費，支援即時分享）

Vercel 比 GitHub Pages 多了一個好處：把**單一活動連結**貼到 Threads / Discord / LINE 時，會**即時**顯示正確標題與預覽圖（純靜態的 hash 路由做不到）。

1. 到 [vercel.com](https://vercel.com) 用 GitHub 登入 → Import 這個 repo。
2. Framework 會自動偵測為 Vite，直接 Deploy（免設定）。
3. 完成後，分享網址 `https://你的專案.vercel.app/e/<活動id>`（例如 `/e/evt-034`）就會在聊天室展開縮圖。

運作方式（純附加，不影響其他部署）：
- `api/share.js`：`/e/<id>` 即時抓 Sheet → 回正確 OG 標題/描述 → 轉址回 App 的 `#/event/<id>`。
- `vercel.json` 把 `/e/:id` 導到該函式；build 時 `VERCEL` 環境變數會讓靜態 stub 自動略過。
- 預覽圖用 build 產生的 `/og/<id>.png`（重新部署即更新）。

## 部署到 GitHub Pages

兩種方式擇一：

### 方式 1：用 GitHub Actions（推薦）

1. 把整個專案 push 到 GitHub repo（例如 `your-name/bangdream-tw`）。
2. 到 repo Settings → Pages → Build and deployment → Source 選 **GitHub Actions**。
3. push 到 `main` 後，`.github/workflows/deploy.yml` 會自動 build + 部署。
4. 完成後網址是 `https://your-name.github.io/bangdream-tw/`。

如果 repo 名稱不是 `your-name.github.io`，請開啟 `vite.config.js` 把 `base` 改成：

```js
base: '/bangdream-tw/',
```

（也可以維持 `'./'`，相對路徑也能用，但本機 preview 時資源路徑會以當前資料夾為基準。）

### 方式 2：手動 build 後 push 到 `gh-pages` 分支

```bash
npm run build
# 把 dist/ 內容 push 到 gh-pages 分支即可
```

## 分享連結格式

網站使用 hash 路由，無需後端設定也可分享：

- 活動條目：`#/event/evt-034`
- 年份章節：`#/year/2026`
- 篩選結果：`#/filter?type=FMT&category=本體`

## 分享預覽圖（OG）

`npm run build` 後的 `postbuild` 會自動為每場活動產生：

- `dist/og/<id>.png` — 1200×630 樂團色分享預覽圖
- `dist/e/<id>.html` — 帶 `og:title/description/image` 的靜態分享頁，開啟後轉址回 `#/event/<id>`

貼到 Threads / Discord 時想顯示縮圖，build 時設定網域：

```bash
SITE_URL=https://your-name.github.io/bangdream-tw npm run build
```

GitHub Actions 已自動帶入 `SITE_URL` 並安裝中文字型（否則雲端產的 OG 圖會是豆腐字）。

## 技術

- Vite + React 18
- Tailwind CSS 3（含 class 深色模式「夜間偶像」主題）
- FontAwesome SVG 圖示子集（自架、無 CDN、離線可用）
- OG 圖以 `@resvg/resvg-js` 在 build 時光柵化
- 字體：Baloo 2 / Quicksand / Noto Sans TC（Google Fonts）

## 授權與致謝

由台灣 BanG Dream! fandom 整理，非營利、非官方紀錄。
資料如有錯漏歡迎開 issue 或 PR。
