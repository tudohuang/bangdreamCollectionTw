// 資料庫測試：schema 的約束擋不擋得住、SQL 與 JS 兩種實作算不算得出同一個答案。
//
// 用 PGlite 的記憶體模式，每個測試都是全新的空資料庫 ——
// 測試之間不會互相污染，也不用清理。
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { connect, migrate } from '../db/client.mjs'
import { countingSummary } from '../src/utils/counting.js'
import { conclusions } from '../src/utils/conclusions.js'

let db
const events = JSON.parse(readFileSync('src/data/events.json', 'utf8'))

before(async () => {
  db = await connect({ url: null, fresh: true })
  await migrate(db)
})
after(async () => { await db?.close() })

const one = async (sql, params = []) => (await db.query(sql, params)).rows[0]

// 有些測試需要一筆最小可用的活動
const seedEvent = async (over = {}) => {
  const row = { stable_id: 1, display_no: 1, title: 'X', starts_on: '2026-04-12', ends_on: '2026-04-12', ...over }
  const cols = Object.keys(row)
  const { rows } = await db.query(
    `INSERT INTO event (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`,
    Object.values(row))
  return rows[0].id
}

// ---------------------------------------------------------------- 約束
test('結束日期早於開始日期會被擋下來', async () => {
  await assert.rejects(
    () => seedEvent({ stable_id: 90, display_no: 90, starts_on: '2026-04-12', ends_on: '2026-04-11' }),
    /event_dates_ordered/)
})

test('開賣日晚於演出日會被擋下來', async () => {
  await assert.rejects(
    () => seedEvent({ stable_id: 91, display_no: 91, ticket_on: '2026-05-01' }),
    /event_ticket_before_show/)
})

test('永久鍵不能重複 —— 它是外部參照的對象', async () => {
  await seedEvent({ stable_id: 92, display_no: 92 })
  await assert.rejects(
    () => seedEvent({ stable_id: 92, display_no: 93 }),
    /event_stable_id_key/)
})

test('同一場不會出現同一個人兩次', async () => {
  const eid = await seedEvent({ stable_id: 93, display_no: 94 })
  const p = await one(`INSERT INTO person (name, name_norm) VALUES ('測試人', 'test') RETURNING id`)
  await db.query('INSERT INTO appearance (event_id, person_id) VALUES ($1,$2)', [eid, p.id])
  await assert.rejects(
    () => db.query('INSERT INTO appearance (event_id, person_id) VALUES ($1,$2)', [eid, p.id]),
    /appearance_pkey/)
})

test('場館座標要嘛都有、要嘛都沒有', async () => {
  await assert.rejects(
    () => db.query(`INSERT INTO venue (name, name_norm, lat) VALUES ('半套', 'half', 25.0)`),
    /venue_latlng_together/)
})

test('刪掉活動會連帶清掉它的關聯，不留孤兒', async () => {
  const eid = await seedEvent({ stable_id: 94, display_no: 95 })
  const p = await one(`INSERT INTO person (name, name_norm) VALUES ('孤兒測試', 'orphan') RETURNING id`)
  await db.query('INSERT INTO appearance (event_id, person_id) VALUES ($1,$2)', [eid, p.id])
  await db.query('DELETE FROM event WHERE id = $1', [eid])
  const left = await one('SELECT count(*)::int AS n FROM appearance WHERE event_id = $1', [eid])
  assert.equal(left.n, 0)
})

test('year / month 是算出來的，不用自己填', async () => {
  const eid = await seedEvent({ stable_id: 95, display_no: 96, starts_on: '2026-08-09', ends_on: '2026-08-09' })
  const r = await one('SELECT year, month FROM event WHERE id = $1', [eid])
  assert.equal(r.year, 2026)
  assert.equal(r.month, 8)
})

// ---------------------------------------------------------------- 交叉驗證
// 這一段是重點：同一個問題用 SQL 與 JS 各算一次，答案必須一樣。
// 兩種實作互相當對方的測試 —— 任何一邊改壞都會在這裡被抓到。
test('統計口徑：SQL 與 JS 算出同一組數字', async () => {
  const fresh = await connect({ url: null, fresh: true })
  await migrate(fresh)
  await ingestInto(fresh)

  const sql = (await fresh.query(readFileSync('db/queries/counting.sql', 'utf8'))).rows[0]
  const js = countingSummary(events)

  assert.equal(Number(sql.活動紀錄), js.records, '活動紀錄')
  assert.equal(Number(sql.跨日筆數), js.multiDay, '跨日筆數')
  assert.equal(Number(sql.活動日), js.activeDays, '活動日')
  assert.equal(Number(sql.推估場次), js.sessions,
    '推估場次 —— 對不上通常是漏了「期間型活動只算一場」這條規則')

  await fresh.close()
})

test('樂團虛胖：SQL 與 JS 指向同一個團', async () => {
  const fresh = await connect({ url: null, fresh: true })
  await migrate(fresh)
  await ingestInto(fresh)

  const rows = (await fresh.query(readFileSync('db/queries/band_inflation.sql', 'utf8'))).rows
  const worst = rows[0]
  const card = conclusions(events).find(c => c.key === 'band-inflation')

  assert.ok(card, 'JS 應該要有樂團虛胖那張卡')
  assert.ok(card.text.startsWith(worst.樂團),
    `SQL 認為最虛的是 ${worst.樂團}，JS 說的是「${card.text}」`)
  assert.equal(Number(worst.本體), 0)

  await fresh.close()
})

// 測試用的迷你 ETL：只灌交叉驗證需要的欄位。
// 不直接呼叫 db/ingest.mjs 是因為那支會連 Sheet，測試不該依賴網路。
async function ingestInto(target) {
  const { rootGroup } = await import('../src/utils/bands.js')
  const { relationOf } = await import('../src/utils/relation.js')
  const { SPAN_TYPES } = await import('../src/utils/counting.js')
  const norm = (s) => String(s ?? '').replace(/[\s'’‘`]/g, '').toLowerCase()
  const date = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null)

  const bandId = new Map()
  const typeId = new Map()

  for (const e of events) {
    const stable = e.stableId ?? e.number
    const { rows } = await target.query(
      `INSERT INTO event (stable_id, display_no, title, starts_on, ends_on, tier, sessions)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [stable, e.number, e.title || 'X', date(e.startDate), date(e.endDate),
       relationOf(e).tier, Number(e.sessions) || null])
    const id = rows[0].id

    for (const t of String(e.type || '').split(/[／/、]/).map(x => x.trim()).filter(Boolean)) {
      if (!typeId.has(t)) {
        const r = await target.query(
          `INSERT INTO event_type (name, name_norm, is_span) VALUES ($1,$2,$3) RETURNING id`,
          [t, norm(t), SPAN_TYPES.has(t)])
        typeId.set(t, r.rows[0].id)
      }
      await target.query(
        'INSERT INTO event_event_type (event_id, event_type_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [id, typeId.get(t)])
    }

    for (const b of new Set((e.relatedGroups || []).map(rootGroup).filter(Boolean))) {
      if (!bandId.has(b)) {
        const r = await target.query(
          `INSERT INTO band (name, name_norm) VALUES ($1,$2) RETURNING id`, [b, norm(b)])
        bandId.set(b, r.rows[0].id)
      }
      await target.query(
        'INSERT INTO event_band (event_id, band_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [id, bandId.get(b)])
    }
  }
}
