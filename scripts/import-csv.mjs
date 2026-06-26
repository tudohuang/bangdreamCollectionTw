// CSV → events.json 轉換器
//   npm run import                 讀預設 CSV 檔
//   npm run import -- foo.csv       指定檔案
//   npm run import -- <https URL>   直接抓 Google Sheet 發布的 CSV 網址
//
// 會「合併」既有 events.json 的手動欄位（description / impression / sources /
// notes / cover，以及未填時的 venue / photos），以「活動編號 number」為合併鍵，
// 重新匯入不會洗掉你補的內容。

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseCsvToEvents } from '../src/utils/parseEvents.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ARG = process.argv[2] || join(ROOT, '邦邦來台 - 工作表1.csv')
const OUT_PATH = join(ROOT, 'src', 'data', 'events.json')
const today = new Date().toISOString().slice(0, 10)

// 讀取來源（本機檔或網址）
let raw
if (/^https?:\/\//.test(ARG)) {
  const res = await fetch(ARG)
  if (!res.ok) { console.error(`✗ 抓取失敗：HTTP ${res.status}`); process.exit(1) }
  raw = await res.text()
} else {
  raw = readFileSync(ARG, 'utf8')
}

// 讀既有 JSON 以保留手動欄位
const prevByNumber = new Map()
if (existsSync(OUT_PATH)) {
  try {
    for (const e of JSON.parse(readFileSync(OUT_PATH, 'utf8'))) prevByNumber.set(e.number, e)
  } catch { /* 壞掉就重建 */ }
}

const parsed = parseCsvToEvents(raw)
const pick = (a, b) => (a ? a : (b || ''))
const pickArr = (a, b) => (a && a.length ? a : (b || []))
const events = parsed.map(e => {
  const prev = prevByNumber.get(e.number) || {}
  return {
    ...e,
    id: prev.id || e.id,
    // 手動欄位：Sheet 有值就用 Sheet，否則保留既有 JSON
    venue: pick(e.venue, prev.venue),
    city: pick(e.city, prev.city),
    photos: pickArr(e.photos, prev.photos),
    cover: pick(e.cover, prev.cover),
    ticketUrl: pick(e.ticketUrl, prev.ticketUrl),
    organizer: pick(e.organizer, prev.organizer),
    description: pick(e.description, prev.description),
    impression: pick(e.impression, prev.impression),
    sources: pickArr(e.sources, prev.sources),
    notes: pick(e.notes, prev.notes),
    lastUpdated: today,
  }
})

writeFileSync(OUT_PATH, JSON.stringify(events, null, 2) + '\n', 'utf8')
console.log(`✓ 匯入 ${events.length} 筆 → ${OUT_PATH.replace(ROOT, '.')}`)
const merged = events.filter(e => prevByNumber.has(e.number)).length
console.log(`  其中 ${merged} 筆沿用既有手動欄位（心得 / 簡介 / 照片 等）`)
