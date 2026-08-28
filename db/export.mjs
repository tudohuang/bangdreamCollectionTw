// npm run db:export —— 把資料庫倒回 events.json 的形狀，並且跟原始檔對帳。
//
// 為什麼需要這支：在這之前，資料只往一個方向流（Sheet → events.json → DB），
// 資料庫是死路。死路上的東西沒有人會發現它壞了 —— schema 改了、ETL 漏了一欄，
// 網站照常運作，因為網站根本不讀資料庫。
//
// 對帳把這件事變成可驗證的：如果 DB 倒出來的結果跟 events.json 逐欄相同，
// 那就證明資料庫裝得下網站需要的一切，可以放心把它當成下一步的真相來源。
// 對不起來的欄位會被逐一列出來 —— 那就是還沒進資料庫的東西。
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { connect } from './client.mjs'
import { organizersOf } from '../src/utils/organizers.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'db', 'export')

const db = await connect()
console.log(`資料庫：${db.kind}（${db.label}）`)

// 一次撈完再在 JS 裡組。逐筆 N+1 查詢在 59 筆看不出差別，
// 但這支將來會拿去跑幾千筆，形狀先寫對。
const { rows: events } = await db.query(`
  SELECT e.stable_id, e.display_no, e.title, e.starts_on, e.ends_on,
         e.tier, e.tier_source, e.urgency, e.is_full_band, e.sessions,
         e.ticket_on, e.cover_url, e.description, e.one_line, e.impression, e.notes,
         v.name AS venue, v.city
    FROM event e
    LEFT JOIN venue v ON v.id = e.venue_id
   ORDER BY e.stable_id`)

const { rows: people } = await db.query(`
  SELECT e.stable_id, p.name
    FROM appearance a
    JOIN event e ON e.id = a.event_id
    JOIN person p ON p.id = a.person_id
   ORDER BY e.stable_id, a.person_id`)

const { rows: bands } = await db.query(`
  SELECT e.stable_id,
         CASE WHEN eb.role_name IS NULL THEN b.name
              ELSE b.name || '／' || eb.role_name END AS name
    FROM event_band eb
    JOIN event e ON e.id = eb.event_id
    JOIN band b ON b.id = eb.band_id
   ORDER BY e.stable_id, eb.band_id`)

const { rows: orgs } = await db.query(`
  SELECT e.stable_id, o.name
    FROM event_organizer eo
    JOIN event e ON e.id = eo.event_id
    JOIN organizer o ON o.id = eo.organizer_id
   ORDER BY e.stable_id, eo.organizer_id`)

const { rows: sources } = await db.query(`
  SELECT e.stable_id, s.url
    FROM event_source s
    JOIN event e ON e.id = s.event_id
   ORDER BY e.stable_id, s.id`)

const { rows: types } = await db.query(`
  SELECT e.stable_id, t.name
    FROM event_event_type et
    JOIN event e ON e.id = et.event_id
    JOIN event_type t ON t.id = et.event_type_id
   ORDER BY e.stable_id, t.id`)

await db.close()

const group = (rows, key = 'name') => {
  const m = new Map()
  for (const r of rows) {
    if (!m.has(r.stable_id)) m.set(r.stable_id, [])
    m.get(r.stable_id).push(r[key])
  }
  return m
}
const byPeople = group(people)
const byBands = group(bands)
const byOrgs = group(orgs)
const bySources = group(sources, 'url')
const byTypes = group(types)

// date 物件 → 'YYYY-MM-DD'。pg 回 Date、PGlite 回字串，兩邊都要吃。
const day = (v) => {
  if (!v) return ''
  if (typeof v === 'string') return v.slice(0, 10)
  const d = new Date(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const out = events.map(e => ({
  id: `evt-${String(e.stable_id).padStart(3, '0')}`,
  stableId: e.stable_id,
  number: e.display_no,
  year: e.starts_on ? Number(day(e.starts_on).slice(0, 4)) : null,
  startDate: day(e.starts_on),
  endDate: day(e.ends_on) || day(e.starts_on),
  title: e.title,
  type: (byTypes.get(e.stable_id) || []).join('、'),
  people: byPeople.get(e.stable_id) || [],
  relatedGroups: byBands.get(e.stable_id) || [],
  isFullBand: e.is_full_band,
  venue: e.venue || '',
  city: e.city || '',
  cover: e.cover_url || '',
  organizer: (byOrgs.get(e.stable_id) || []).join('、'),
  description: e.description || '',
  impression: e.impression || '',
  oneLine: e.one_line || '',
  sessions: e.sessions || 0,
  relation: e.tier_source === 'sheet' ? e.tier : '',
  ticketDate: day(e.ticket_on),
  sources: bySources.get(e.stable_id) || [],
  notes: e.notes || '',
}))

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'events.json'), JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log(`✓ 匯出 ${out.length} 筆 → db/export/events.json`)

// ------------------------------------------------------------------ 對帳
// 逐欄比對。目的不是「全綠」，是「知道哪裡不綠、為什麼」。
const src = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'events.json'), 'utf8'))
const srcById = new Map(src.map(e => [e.stableId ?? e.number, e]))

// 這些欄位本來就不期待 round-trip，理由寫在旁邊。列出來是為了不要假裝沒事。
const EXPECTED_DIFF = {
  organizer: '主辦在資料庫是多對多，倒回來時的分隔符不保證跟 Sheet 原字串一樣（下面會另外比清單）',
  city: '資料庫存的是場館的城市（正規化過），events.json 存的是那一列原始的空值',
  venue: '資料庫存的是正規化後的場館名，同一場館的兩種寫法會收斂成一個',
  relation: 'Sheet 沒填時資料庫存推導結果，events.json 存空字串',
  type: '資料庫把類型拆成多對多，倒回來的順序不保證跟原字串一致',
}

const same = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '')
const diffs = new Map()
let missing = 0

for (const row of out) {
  const orig = srcById.get(row.stableId)
  if (!orig) { missing++; continue }
  for (const k of Object.keys(row)) {
    if (same(row[k], orig[k])) continue
    // 主辦：比拆開後的清單，不比串起來的字串。「A / B」與「A、B」是同一件事。
    if (k === 'organizer' &&
        same(organizersOf(row).sort(), organizersOf(orig).sort())) continue
    // 陣列比對忽略順序 —— 多對多表的排序沒有語意
    if (Array.isArray(row[k]) && Array.isArray(orig[k]) &&
        same([...row[k]].sort(), [...orig[k]].sort())) continue
    if (!diffs.has(k)) diffs.set(k, [])
    diffs.get(k).push(row.stableId)
  }
}

console.log(`\n對帳：資料庫 ${out.length} 筆 vs events.json ${src.length} 筆`)
if (missing) console.log(`⚠ 有 ${missing} 筆在 events.json 找不到對應`)

const unexpected = [...diffs].filter(([k]) => !EXPECTED_DIFF[k])
const expected = [...diffs].filter(([k]) => EXPECTED_DIFF[k])

for (const [k, ids] of expected) {
  console.log(`  · ${k.padEnd(14)} ${String(ids.length).padStart(3)} 筆不同（預期內：${EXPECTED_DIFF[k]}）`)
}
for (const [k, ids] of unexpected) {
  console.log(`  ✗ ${k.padEnd(14)} ${String(ids.length).padStart(3)} 筆不同 ← #${ids.slice(0, 6).join(' #')}${ids.length > 6 ? ' …' : ''}`)
}

if (!unexpected.length) {
  console.log('\n✓ 除了預期內的差異，資料庫裝得下 events.json 的每一欄。')
} else {
  console.log(`\n✗ ${unexpected.length} 個欄位沒有 round-trip —— 那些資料還沒真的進資料庫。`)
  process.exitCode = 1
}
