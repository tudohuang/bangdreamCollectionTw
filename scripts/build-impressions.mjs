// content/impressions/<ID>.md → src/data/events.json 的手寫欄位。
//
// 為什麼不直接寫在 Google Sheet：心得是幾百字的文章、曲目是一整串二十行，
// 塞進試算表的一個儲存格既難寫也難改。這裡讓長內容回到編輯器裡寫，
// 建置時再折回 events.json；網站端因為這些欄位都屬於 MANUAL_FIELDS，
// 即時抓 Sheet 時不會被空白覆蓋。
//
// 短的值（一句話、票價、售票狀況…）用 front matter，一行一個；
// 長清單（曲目、場刊）用「## 小標」分段 —— 二十首歌塞進 front matter 的
// 一行，比塞進試算表還糟。
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontMatter, parseSections } from '../src/utils/markdown.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'content', 'impressions')
const jsonPath = join(root, 'src', 'data', 'events.json')

if (!existsSync(dir)) {
  console.log('沒有 content/impressions/，略過')
  process.exit(0)
}

const events = JSON.parse(readFileSync(jsonPath, 'utf8'))
const byId = new Map(events.map(e => [e.stableId ?? e.number, e]))

let written = 0, skipped = 0
const missing = []
const tally = {}   // 哪個欄位被寫了幾筆

for (const file of readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
  if (file.toLowerCase() === 'readme.md') continue

  // 檔名是永久鍵，不是圖鑑編號 —— 編號可以重排，心得不能跟著對到別場活動
  const id = Number(file.replace(/^evt-/, '').replace(/\.md$/, ''))
  const event = byId.get(id)
  if (!event) { missing.push(file); continue }

  const { meta, body } = parseFrontMatter(readFileSync(join(dir, file), 'utf8'))
  const { intro, sections } = parseSections(body)

  // front matter 的短欄位。中英文表頭都認，跟 Sheet 那邊一致。
  const FRONT = [
    ['oneLine', ['一句話', 'oneLine']],
    ['description', ['簡介', 'description']],
    ['price', ['票價', 'price']],
    ['soldOut', ['售票狀況', '完售', 'soldOut']],
    ['keyVisual', ['主視覺', '繪師', 'keyVisual']],
    ['series', ['系列', 'series']],
  ]
  // 「## 小標」的長清單
  const BODY_SECTIONS = [
    ['setlist', ['曲目', 'setlist']],
    ['goods', ['周邊', '場販', 'goods']],
    ['programme', ['場刊', '目次', 'programme']],
  ]

  const picked = {}
  for (const [field, keys] of FRONT) {
    const v = keys.map(k => meta[k]).find(x => x && x.trim())
    if (v) picked[field] = v.trim()
  }
  for (const [field, keys] of BODY_SECTIONS) {
    const v = keys.map(k => sections[k]).find(x => x && x.trim())
    if (v) picked[field] = v.trim()
  }
  if (intro) picked.impression = intro

  // 什麼都還沒寫的檔案當作待補，不覆蓋既有內容
  if (!Object.keys(picked).length) { skipped++; continue }

  Object.assign(event, picked)
  for (const k of Object.keys(picked)) tally[k] = (tally[k] || 0) + 1
  written++
}

writeFileSync(jsonPath, JSON.stringify(events, null, 2) + '\n')

console.log(`手寫內容 ${written} 個檔寫入 · 待補 ${skipped} 個`)
const LABEL = {
  oneLine: '一句話', impression: '心得', description: '簡介', setlist: '曲目',
  price: '票價', soldOut: '售票狀況', goods: '周邊', programme: '場刊',
  keyVisual: '主視覺', series: '系列',
}
for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  const total = events.filter(e => {
    const v = e[k]
    return Array.isArray(v) ? v.length : !!(v && String(v).trim())
  }).length
  console.log(`  ${(LABEL[k] || k).padEnd(6)} 這次 ${n} 筆 · 全站 ${total}/${events.length}`)
}
if (missing.length) console.log(`找不到對應 ID：${missing.join('、')}`)
