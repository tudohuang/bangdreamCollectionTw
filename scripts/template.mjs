// npm run template —— 產出一份可以直接貼回 Google Sheet 的空白表。
//
// 為什麼需要：站上有一半的欄位是空的，而「打開 Sheet 從頭填」這件事
// 之所以沒發生，是因為要先想「這欄要填什麼」「哪幾筆還沒填」。
// 這支把那兩件事都先做完 —— 產出的表已經按編號排好、帶著標題與日期，
// 只剩下真正需要人的部分：那句話本身。
//
//   npm run template            所有欄位、所有還沒填的
//   npm run template 一句話      只產這一欄
//
// 輸出是 TSV（用 tab 分隔），貼進 Google Sheet 會自動落格。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'docs', 'template')
const events = JSON.parse(readFileSync(join(ROOT, 'src/data/events.json'), 'utf8'))

// 每一欄：Sheet 的表頭、對應的資料欄位、寫法說明、以及一個真的例子。
// 例子不是裝飾 —— 「該寫多長、什麼語氣」是這件事最大的門檻。
const COLUMNS = [
  {
    header: '一句話', field: 'oneLine',
    how: '20 字以內。講這場的一件事，不要複述標題。',
    eg: '睽違三年八個月，台灣終於又有邦邦的 LIVE。',
  },
  {
    header: '來源', field: 'sources', isList: true,
    how: '公告或報導的網址。多筆用空白或換行分隔。',
    eg: 'https://www.facebook.com/xxx/posts/123',
  },
  {
    header: '簡介', field: 'description',
    how: '兩到三句。這場是什麼、為什麼值得記。詳情頁與搜尋結果都會用。',
    eg: 'Poppin’Party 與 Roselia 的雙團場，也是兩團第一次在台灣同台。',
  },
  {
    header: '曲目', field: 'setlist',
    how: '一行一首，開頭的編號可有可無。安可另起一行寫「安可」。',
    eg: '1. STAR BEAT!〜ホシノコドウ / 2. 天下トーイツ A to Z☆ / 安可 / Returns',
  },
  {
    header: '票價', field: 'price',
    how: '分區用 / 隔開，可以帶區名。',
    eg: '搖滾區 3800 / 座位區 2800 / 學生票 1800',
  },
  {
    header: '周邊', field: 'goods',
    how: '一行一項，價格接在後面。名字裡有「台版限定」會自動標出來。',
    eg: '場刊 400 / 毛巾 1200 / 台版限定壓克力立牌 800',
  },
  {
    header: '主視覺', field: 'keyVisual',
    how: '繪師名，後面可以接來源網址。',
    eg: '某某繪師 https://x.com/xxx/status/123',
  },
  {
    header: '開賣', field: 'ticketDate',
    how: 'YYYY-MM-DD。有它才畫得出「公布 → 開賣 → 演出」那條線。',
    eg: '2026-01-15',
  },
  {
    header: '售票狀況', field: 'soldOut',
    how: '完售了嗎？多久賣完的？這件事事後完全查不到 —— 售票頁會下架、貼文會被洗掉。',
    eg: '開賣 3 分鐘完售',
  },
  {
    header: '場刊', field: 'programme',
    how: '場刊的目次，一行一項。',
    eg: '聲優訪談 愛美 × 伊藤彩沙 / 設定資料集 / 台北公演特別寫真',
  },
  {
    header: '系列', field: 'series',
    how: '留空會自動從標題判斷（Bushiroad EXPO 那種）。判錯才填。',
    eg: 'bushiroad-expo',
  },
  {
    header: '關聯', field: 'relation',
    how: 'official（官方本體）／ strong（強關聯）／ weak（弱關聯）。留空會由規則推。',
    eg: 'official',
  },
]

const filled = (e, f) => {
  const v = e[f]
  return Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim())
}

const want = process.argv.slice(2).filter(a => !a.startsWith('-'))
const cols = want.length
  ? COLUMNS.filter(c => want.includes(c.header) || want.includes(c.field))
  : COLUMNS

if (!cols.length) {
  console.error(`不認得的欄位：${want.join('、')}`)
  console.error(`可以填的有：${COLUMNS.map(c => c.header).join('、')}`)
  process.exit(1)
}

mkdirSync(OUT_DIR, { recursive: true })
const written = []

for (const c of cols) {
  const todo = events
    .filter(e => !filled(e, c.field))
    .sort((a, b) => (a.number || 0) - (b.number || 0))
  if (!todo.length) { console.log(`✓ 「${c.header}」已經填完了`); continue }

  // 前三欄是給人對位用的，貼回 Sheet 時不要一起貼 —— 只貼最後一欄。
  const rows = [
    ['編號', '日期', '活動名稱', c.header].join('\t'),
    ...todo.map(e => [
      `#${String(e.number).padStart(3, '0')}`,
      e.startDate || '',
      e.title || '',
      '',
    ].join('\t')),
  ]
  const file = join(OUT_DIR, `${c.header}.tsv`)
  writeFileSync(file, rows.join('\n') + '\n', 'utf8')
  written.push({ c, n: todo.length, file })
}

if (!written.length) { console.log('\n沒有要填的了。'); process.exit(0) }

console.log('')
for (const { c, n } of written) {
  console.log(`「${c.header}」 ${n} 筆待填 → docs/template/${c.header}.tsv`)
  console.log(`   寫法：${c.how}`)
  console.log(`   例：${c.eg}`)
  console.log('')
}

// 說明檔：TSV 本身沒有地方寫使用方式，另外產一份
const readme = [
  '# 填表用的空白表',
  '',
  '`npm run template` 產生。每個 `.tsv` 是一欄，已經照編號排好。',
  '',
  '## 怎麼用',
  '',
  '1. 用試算表或文字編輯器打開 `.tsv`',
  '2. 對著「活動名稱」把最右邊那一欄填完',
  '3. **只複製最右邊那一欄**（前三欄是給你對位用的），貼回 Google Sheet 對應的欄位',
  '4. `npm run import` 拉回來，`npm run health` 確認',
  '',
  '如果 Sheet 還沒有那一欄，直接在最右邊加一欄、表頭寫成下表的名字就好 ——',
  '解析器認得的表頭都在下面，不認得的欄位也會自動收進詳情頁，不會壞。',
  '',
  '## 欄位',
  '',
  ...written.flatMap(({ c, n }) => [
    `### ${c.header}`,
    '',
    `- 待填 ${n} 筆`,
    `- 寫法：${c.how}`,
    `- 例：\`${c.eg}\``,
    '',
  ]),
].join('\n')
writeFileSync(join(OUT_DIR, 'README.md'), readme, 'utf8')
console.log('→ docs/template/（含 README）')
