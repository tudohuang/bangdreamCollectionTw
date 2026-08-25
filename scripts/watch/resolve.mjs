// 一次性設定：把「名冊」分頁的對象對到 eventernote 的 actor id。
//   npm run watch:resolve
//
// 中文譯名跟日文本名常常對不起來（西本里美 / 西本りみ、佐佐木李子 / 佐々木李子），
// 對不到的會標成 null 並列在最後，手動把 id 填進 watch.targets.json 就好 ——
// 這張表只要建一次。
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseRosterCsv } from '../../src/utils/parsePulse.js'
import { SHEET_ROSTER_CSV_URL } from '../../src/config.js'
import { searchActor, searchEplusWord } from './sources.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'watch.targets.json')

// 已知的中文譯名 → eventernote 上的日文寫法
const ALIAS = {
  '西本里美': '西本りみ',
  '佐佐木李子': '佐々木李子',
  '渡瀨結月': '渡瀬結月',
  '櫻川惠': '櫻川めぐ',
  '立石凜': '立石凛',
}

// 搜尋搞不定、人工查過的：'愛美' 搜出來第一名是別人，直接寫死
const OVERRIDE = {
  '愛美': { actorId: 2806, actorName: '愛美' },
}

const roster = parseRosterCsv(await (await fetch(SHEET_ROSTER_CSV_URL)).text())
if (!roster.length) { console.error('✗ 抓不到名冊'); process.exit(1) }

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { targets: [] }
const known = new Map(prev.targets.map(t => [t.name, t]))

const targets = []
const missed = []
for (const r of roster) {
  if (!r.tracked) continue
  const cached = known.get(r.name) || {}
  const t = { name: r.name, band: r.band, kind: r.kind, ...cached }
  const keyword = ALIAS[r.name] || r.name
  const marks = []

  // --- eventernote ---
  if (OVERRIDE[r.name]) {
    Object.assign(t, OVERRIDE[r.name])
    marks.push(`EN ${t.actorName}(${t.actorId}) 人工指定`)
  } else if (t.actorId) {
    marks.push(`EN ${t.actorName}(${t.actorId}) 沿用`)
  } else {
    let res = null
    try { res = await searchActor(keyword) } catch (e) { console.warn(`  ! ${r.name} eventernote 搜尋失敗：${e.message}`) }
    if (res?.exact) {
      t.actorId = res.exact.id; t.actorName = res.exact.name
      marks.push(`EN ${res.exact.name}(${res.exact.id})`)
    } else {
      t.actorId = null
      marks.push('EN ✗' + (res?.candidates?.length ? '（可能是 ' + res.candidates.slice(0, 3).map(c => `${c.name}/${c.id}`).join('、') + '）' : ''))
    }
  }

  // --- e+（イープラス）藝人頁 ---
  if (t.eplusId) {
    marks.push(`e+ ${t.eplusName}(${t.eplusId}) 沿用`)
  } else {
    let res = null
    try { res = await searchEplusWord(keyword) } catch (e) { console.warn(`  ! ${r.name} e+ 搜尋失敗：${e.message}`) }
    if (res?.exact) {
      t.eplusId = res.exact.id; t.eplusName = res.exact.name
      marks.push(`e+ ${res.exact.name}(${res.exact.id})`)
    } else {
      t.eplusId = null
      marks.push('e+ ✗')
    }
  }

  if (!t.actorId && !t.eplusId) missed.push(r.name)
  targets.push(t)
  console.log(`${t.actorId || t.eplusId ? '✓' : '?'} ${r.name.padEnd(12)} ${marks.join('  ')}`)
}

writeFileSync(OUT, JSON.stringify({
  note: [
    'actorId = eventernote（www.eventernote.com/actors/<名字>/<id>）',
    'eplusId = イープラス藝人頁（eplus.jp/sf/word/<id>）',
    '對不到的自己去那兩個站找 id 填進來，之後就會一直沿用。',
  ].join('　'),
  // ぴあ 的關鍵字搜尋很鬆，只放團名這種夠獨特的字串（個人名會撈到一堆同名的人）
  piaKeywords: prev.piaKeywords || ["MyGO!!!!!", "Ave Mujica", "Poppin'Party", "Roselia", "RAISE A SUILEN", "BanG Dream"],
  // 官方／FC 的公開消息頁。想加自己的就往這裡加，抓不到會自己跳過。
  news: prev.news || [
    { label: 'BanG Dream! 官網', url: 'https://bang-dream.com/news' },
    { label: 'ブシロード', url: 'https://bushiroad.com/news/' },
    // 新聞站用關鍵字搜尋，標題要真的含關鍵字才算（見 sources.mjs 的 fetchNewsSearch）
    {
      label: '華視新聞',
      search: 'https://news.cts.com.tw/search/?keyword={kw}',
      keywords: ['BanG Dream', 'MyGO', 'Ave Mujica', '聲優'],
    },
  ],
  targets,
}, null, 2) + '\n', 'utf8')

console.log(`\n✓ 寫入 ${OUT.replace(ROOT, '.')}（${targets.filter(t => t.actorId).length}/${targets.length} 已對到）`)
if (missed.length) console.log(`  還要手動補：${missed.join('、')}`)
