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

// 資料回報入口（選填）：填了頁尾才會出現「資料回報」連結。
// 可填信箱（mailto:你的信箱）、Google 表單、或 GitHub issues 連結。留空＝不顯示。
export const REPORT_URL = ''

// 站長便利貼（選填）：首頁標題旁的手寫小紙條，想到什麼寫什麼。留空＝不顯示。
export const OWNER_NOTE = '台灣邦邦在一起 強大!'

