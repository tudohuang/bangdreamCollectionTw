// npm run health —— 一次講完這個站的資料缺在哪。
//
// 這支存在的理由：程式有 45 個元件在等資料，資料卻只有骨架。
// 「心得 0/59」這種事以前要自己去 Sheet 裡數，數完也記不住。
// 現在一行指令講完，而且輸出成 docs/health.md，可以直接對著它填。
//
// 刻意不做成測試 —— 資料不完整不是錯誤，是待辦。紅燈會讓人習慣忽略紅燈。
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { venueIndex, cityOfWithVenue } from '../src/utils/venues.js'
import { relationOf } from '../src/utils/relation.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))
const events = read('src/data/events.json')
const covers = existsSync(join(ROOT, 'src/data/covers.json')) ? read('src/data/covers.json') : {}
const N = events.length

const filled = (e, f) => {
  const v = e[f]
  return Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim())
}

// 依「補起來會讓網站多出什麼」排，不是依欄位在 Sheet 裡的順序。
const FIELDS = [
  ['oneLine', '一句話', '卡片、首頁、搜尋結果、分享描述會同時活過來。每筆 20 字。'],
  ['sources', '來源', '史料庫的底線是可追溯。沒有來源的條目等於「聽說」。'],
  ['description', '簡介', '詳情頁與 SEO 描述的正文。沒有的話搜尋結果只有標題。'],
  ['impression', '心得', '這站唯一別的地方沒有的東西。'],
  ['photos', '照片', '現場的樣子。封面是宣傳圖，照片才是紀錄。'],
  ['ticketUrl', '購票連結', '對過去的場次它是史料 —— 當年在哪買、賣多少錢。'],
  ['ticketDate', '開賣日', '有它才畫得出「公布 → 開賣 → 演出」那條線。'],
  ['sessions', '場次', '留空時用天數推。填了統計才精確。'],
  ['relation', '關聯', '本體／強／弱。留空時由規則推，目前 59 筆全是推的。'],
  ['notes', '備註', '規則塞不下的例外。'],
]

const bar = (n) => {
  const w = Math.round((n / N) * 24)
  return '█'.repeat(w) + '·'.repeat(24 - w)
}

const lines = []
const say = (s = '') => { lines.push(s); console.log(s) }

say(`資料健檢 · ${N} 筆活動`)
say('='.repeat(58))
say('')
say('欄位覆蓋率')
say('')

const holes = []
for (const [key, label, why] of FIELDS) {
  const n = events.filter(e => filled(e, key)).length
  const pct = Math.round((n / N) * 100)
  say(`  ${label.padEnd(6)} ${bar(n)} ${String(n).padStart(2)}/${N}  ${String(pct).padStart(3)}%`)
  if (pct < 100) holes.push({ key, label, n, why, missing: events.filter(e => !filled(e, key)) })
}

// ------------------------------------------------------------------ 具體問題
say('')
say('具體要處理的')
say('')

const problems = []

// 封面：manifest 裡沒有的，代表那張圖抓不下來
const coverKey = (e) => String(e.stableId).padStart(3, '0')
const noCover = events.filter(e => e.cover && !covers[coverKey(e)])
if (noCover.length) {
  problems.push({
    title: `${noCover.length} 張封面抓不下來`,
    detail: '原網址掛了或擋外連。這些活動在列表上只會顯示編號。',
    items: noCover.map(e => `#${String(e.number).padStart(3, '0')} ${e.title} ← ${e.cover}`),
  })
}
const noCoverAtAll = events.filter(e => !e.cover)
if (noCoverAtAll.length) {
  problems.push({
    title: `${noCoverAtAll.length} 筆根本沒有封面`,
    detail: '',
    items: noCoverAtAll.map(e => `#${String(e.number).padStart(3, '0')} ${e.title}`),
  })
}

// 城市：推不出來的
const noCity = events.filter(e => !cityOfWithVenue(e, events))
if (noCity.length) {
  problems.push({
    title: `${noCity.length} 筆歸不出城市`,
    detail: '這些場館的名字裡沒有城市，對照表也不敢猜（venues.js 的規矩是只放有把握的）。在 Sheet 的「城市」欄填一次就解決。',
    items: noCity.map(e => `#${String(e.number).padStart(3, '0')} 地點「${e.venue || '（空白）'}」`),
  })
}

// 場館：只出現過一次、而且名字很短的，通常是打字不一致
const suspicious = venueIndex(events).filter(v => v.names.size > 1)
if (suspicious.length) {
  problems.push({
    title: `${suspicious.length} 個場館有多種寫法`,
    detail: '程式已經合併了，但 Sheet 統一寫法之後這裡就不用靠規則。',
    items: suspicious.map(v => [...v.names].join('  ／  ')),
  })
}

// 關聯：全部都是推的話，那個三層分級其實沒有人工確認過
const inferred = events.filter(e => relationOf(e).source !== 'sheet').length
if (inferred === N) {
  problems.push({
    title: '關聯程度 59 筆全部是推的',
    detail: '官方本體／強關聯／弱關聯目前沒有一筆是人工確認的。在 Sheet 的「關聯」欄填 official／strong／weak 就會蓋掉推導。',
    items: [],
  })
}

// ---------------------------------------------------- 名冊與動態（另外兩張分頁）
//
// 這兩張表以前完全沒被查過 —— 它們是執行時才抓的，本機沒有副本。
// npm run snapshot 存下來之後才有東西可以查。
const snap = (f) => (existsSync(join(ROOT, 'src/data/snapshot', f))
  ? read('src/data/snapshot/' + f) : null)
const roster = snap('roster.json')
const pulse = snap('pulse.json')

if (!roster || !pulse) {
  problems.push({
    title: '名冊與動態沒有本機副本',
    detail: 'events.json 有進 git，那兩張分頁沒有 —— Sheet 掉了就沒了。跑 npm run snapshot。',
    items: [],
  })
} else {
  const rosterNames = new Set(roster.map(r => r.name))
  const eventPeople = new Set(events.flatMap(e => e.people || []))

  const notInRoster = [...eventPeople].filter(p => !rosterNames.has(p))
  if (notInRoster.length) {
    problems.push({
      title: `名冊少了 ${notInRoster.length} 個在活動表出現過的人`,
      detail: '詳情頁的「飾演」會留白，動態頁也追蹤不到他們。',
      items: notInRoster,
    })
  }

  const noBand = roster.filter(r => r.kind === 'person' && !r.band).map(r => r.name)
  if (noBand.length) {
    problems.push({
      title: `名冊有 ${noBand.length} 個人沒填樂團`,
      detail: '沒有樂團就沒有代表色，站上會用灰色的「其他」。',
      items: noBand,
    })
  }

  const noRole = roster.filter(r => r.kind === 'person' && r.band && !r.role).map(r => r.name)
  if (noRole.length) {
    problems.push({
      title: `名冊有 ${noRole.length} 個人沒填角色`,
      detail: '「飾 戶山香澄」那一段會不見。',
      items: noRole,
    })
  }

  const noLinks = roster.filter(r => !r.links?.length).map(r => r.name)
  if (noLinks.length) {
    problems.push({
      title: `名冊有 ${noLinks.length} 筆沒有官方連結`,
      detail: '人物頁的「官方連結」那一排不會出現。在名冊加一欄「連結」，貼官推或 Eventernote 就好。',
      items: noLinks,
    })
  }

  const noUrl = pulse.filter(p => !p.url).length
  if (noUrl) {
    problems.push({
      title: `動態有 ${noUrl} / ${pulse.length} 筆沒有來源連結`,
      detail: '看得到行程但點不進去，查證不了。',
      items: [],
    })
  }
}

for (const p of problems) {
  say(`  ▸ ${p.title}`)
  if (p.detail) say(`    ${p.detail}`)
  const short = (s) => (s.length > 96 ? s.slice(0, 93) + '…' : s)
  for (const it of p.items.slice(0, 8)) say(`      · ${short(it)}`)
  if (p.items.length > 8) say(`      · …還有 ${p.items.length - 8} 筆（完整清單在 docs/health.md）`)
  say('')
}

if (!problems.length) say('  （沒有）')

// ------------------------------------------------------------------ 下一步
say('')
say('如果只做一件事')
say('')
const worst = holes.sort((a, b) => a.n - b.n)[0]
if (worst) {
  say(`  填「${worst.label}」。現在 ${worst.n}/${N}。`)
  say(`  ${worst.why}`)
  say('')
  say('  npm run template  ← 產出一份已經帶好編號與標題的表，填完貼回 Sheet')
}

// ------------------------------------------------------------------ 存檔
const mdItems = (p) => p.items
const md = [
  '# 資料健檢',
  '',
  `> 由 \`npm run health\` 產生。${N} 筆活動。`,
  '',
  '## 欄位覆蓋率',
  '',
  '| 欄位 | 已填 | 比例 | 補起來會怎樣 |',
  '| --- | ---: | ---: | --- |',
  ...FIELDS.map(([key, label, why]) => {
    const n = events.filter(e => filled(e, key)).length
    return `| ${label} | ${n}/${N} | ${Math.round((n / N) * 100)}% | ${why} |`
  }),
  '',
  '## 具體要處理的',
  '',
  ...problems.flatMap(p => [
    `### ${p.title}`,
    '',
    ...(p.detail ? [p.detail, ''] : []),
    ...mdItems(p).map(it => `- ${it}`),
    '',
  ]),
  ...(problems.length ? [] : ['（沒有）', '']),
].join('\n')

writeFileSync(join(ROOT, 'docs', 'health.md'), md, 'utf8')
say('')
say('→ docs/health.md')
void lines
