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

// 資料回報入口（選填）：填了頁尾才會出現「資料回報」連結。
// 可填信箱（mailto:你的信箱）、Google 表單、或 GitHub issues 連結。留空＝不顯示。
export const REPORT_URL = ''

