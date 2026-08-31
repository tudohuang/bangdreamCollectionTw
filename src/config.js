// ──────────────────────────────────────────────────────────────
// 即時資料來源：Google Sheet（發布為 CSV）
//
// 設定方式：
//   1. 在 Google Sheet 點「檔案 → 共用 → 發布到網路」
//   2. 選擇要發布的工作表，格式選「逗號分隔值 (.csv)」
//   3. 複製產生的網址（長得像 …/pub?output=csv 或 …/pub?gid=0&single=true&output=csv）
//   4. 貼到下面 SHEET_CSV_URL
//
// 留空字串＝不啟用，網站只用內建的 src/data/events.json。
// 有填＝開啟瀏覽器時會即時抓 Sheet，與內建資料合併（照片/心得等手動欄位以內建為準）。
// 抓取失敗（離線、格式錯、CORS）會自動退回內建資料。
// ──────────────────────────────────────────────────────────────
export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1KWSuDODuH2gNAfsxDs1tpGj5ikBkpRKc6BxS0L5Qkcs/gviz/tq?tqx=out:csv'

// 同一份試算表的其他分頁：加 &sheet=<分頁名> 就好（gviz 支援）。
//   名冊 = 追蹤對象主檔（誰、屬於哪團、角色）
//   動態 = 這些人在日本的行程長表（一列一筆）
// 兩條都留空＝不啟用「動態」頁，網站其餘部分完全不受影響。
const sheetTab = (name) => `${SHEET_CSV_URL}&sheet=${encodeURIComponent(name)}`
export const SHEET_ROSTER_CSV_URL = sheetTab('名冊')
export const SHEET_PULSE_CSV_URL = sheetTab('動態')

// 歌曲主檔（選填）：一列一首歌 —— 原唱團、專輯、發行日、詞曲、官方連結。
// 歌單記的是「這場唱了什麼」，這張記的是「這首歌是什麼」，靠歌名對位。
// 沒有建這個分頁就完全不影響其他地方，歌曲頁只是少掉上半部。
export const SHEET_SONGS_CSV_URL = sheetTab('歌曲')

// 資料回報入口：頁尾的「資料回報」、以及詳情頁「這一格還缺…」都指到這裡。
// 可填信箱（mailto:）、Google 表單、或 GitHub issues。留空＝整個入口不顯示。
//
// 原本是空字串，所以那些入口從來沒出現過 —— 全站唯一「發現錯了怎麼講」
// 的路是隱形的。先接自己的 issues，之後想換 Google 表單改這一行就好。
export const REPORT_URL = 'https://github.com/tudohuang/bangdreamCollectionTw/issues/new'

// 流量與效能量測不需要在這裡設定 —— 用的是 Vercel 自家的
// @vercel/analytics 與 @vercel/speed-insights，在 Vercel 後台
// 各按一次開關就會開始收，程式端不用填 token（見 components/Chrome.jsx）。

// 站長便利貼（選填）：首頁標題旁的手寫紙條。留空＝不顯示。
export const OWNER_NOTE = '台灣邦邦在一起 強大!'

