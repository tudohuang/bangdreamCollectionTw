// events.json 資料驗證
//   npm run validate
// 有 error 時離開碼為 1（可擋 CI / build）。warning 只提示。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA = join(ROOT, 'src', 'data', 'events.json')

const KNOWN_BANDS = [
  "Poppin'Party", 'Afterglow', 'Pastel', 'Roselia', 'Hello', 'Morfonica',
  'RAISE', 'MyGO', 'Ave', 'Glitter', 'BanG',
]
const DATE_RE = /^\d{4}-\d{2}-(\d{2}|\?\?)$/

const errors = []
const warns = []

let events
try {
  events = JSON.parse(readFileSync(DATA, 'utf8'))
} catch (e) {
  console.error('✗ 無法解析 events.json：', e.message)
  process.exit(1)
}

const ids = new Set()
const numbers = new Set()

for (const e of events) {
  const tag = `#${e.number ?? '?'} ${e.title || '(無標題)'}`
  if (!e.id) errors.push(`${tag}：缺少 id`)
  else if (ids.has(e.id)) errors.push(`${tag}：id 重複（${e.id}）`)
  else ids.add(e.id)

  if (e.number == null) errors.push(`${tag}：缺少 number`)
  else if (numbers.has(e.number)) errors.push(`${tag}：number 重複（${e.number}）`)
  else numbers.add(e.number)

  if (!e.title) errors.push(`${tag}：缺少標題`)
  if (!['本體', '擦邊'].includes(e.category)) warns.push(`${tag}：category 非「本體/擦邊」（${e.category}）`)
  if (e.startDate && !DATE_RE.test(e.startDate)) warns.push(`${tag}：開始日期格式異常（${e.startDate}）`)
  if (e.endDate && !DATE_RE.test(e.endDate)) warns.push(`${tag}：結束日期格式異常（${e.endDate}）`)
  if (e.startDate && e.endDate && e.endDate < e.startDate) warns.push(`${tag}：結束早於開始`)
  if (!Array.isArray(e.relatedGroups) || e.relatedGroups.length === 0) warns.push(`${tag}：沒有關聯樂團`)
  else for (const g of e.relatedGroups) {
    const root = g.split('／')[0]
    if (!KNOWN_BANDS.some(b => root.startsWith(b))) warns.push(`${tag}：未知樂團「${g}」（會以「其他」灰色呈現）`)
  }
  if (e.isFullBand && (e.people || []).length < 3) warns.push(`${tag}：標記全團但聲優少於 3 位`)
}

// 編號連續性
const sorted = [...numbers].sort((a, b) => a - b)
for (let i = 0; i < sorted.length; i++) {
  if (sorted[i] !== i + 1) { warns.push(`編號不連續：預期 ${i + 1}，實際 ${sorted[i]}`); break }
}

console.log(`檢查 ${events.length} 筆活動`)
if (warns.length) {
  console.log(`\n⚠ ${warns.length} 個提醒：`)
  for (const w of warns) console.log('  - ' + w)
}
if (errors.length) {
  console.log(`\n✗ ${errors.length} 個錯誤：`)
  for (const er of errors) console.log('  - ' + er)
  process.exit(1)
}
console.log(errors.length ? '' : '\n✓ 沒有致命錯誤')
