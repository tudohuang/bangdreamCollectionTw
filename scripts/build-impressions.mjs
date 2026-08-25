// content/impressions/<編號>.md → src/data/events.json 的 oneLine / impression 欄。
//
// 為什麼不直接寫在 Google Sheet：心得是幾百字的文章，
// 塞進試算表的一個儲存格既難寫也難改。這裡讓心得回到編輯器裡寫，
// 建置時再折回 events.json；網站端因為 impression 屬於 MANUAL_FIELDS，
// 即時抓 Sheet 時不會被空白覆蓋。
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontMatter } from '../src/utils/markdown.js'

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

for (const file of readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
  if (file.toLowerCase() === 'readme.md') continue

  // 檔名是永久鍵，不是圖鑑編號 —— 編號可以重排，心得不能跟著對到別場活動
  const id = Number(file.replace(/^evt-/, '').replace(/\.md$/, ''))
  const event = byId.get(id)
  if (!event) { missing.push(file); continue }

  const { meta, body } = parseFrontMatter(readFileSync(join(dir, file), 'utf8'))
  const oneLine = meta['一句話'] || meta.oneLine || ''

  // 只有前置資料、正文還沒寫的檔案當作待補，不覆蓋既有內容
  if (!body && !oneLine) { skipped++; continue }

  if (oneLine) event.oneLine = oneLine
  if (body) event.impression = body
  written++
}

writeFileSync(jsonPath, JSON.stringify(events, null, 2) + '\n')

const withText = events.filter(e => e.impression).length
console.log(`心得 ${written} 篇寫入 · 待補 ${skipped} 篇 · 全站已有心得 ${withText}/${events.length}`)
if (missing.length) console.log(`找不到對應 ID：${missing.join('、')}`)
