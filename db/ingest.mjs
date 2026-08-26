// npm run db:ingest —— 把 events.json 灌進資料庫。
//
// 冪等：跑一百次跟跑一次結果一樣。這不是「跑之前先清空」那種假冪等 ——
// 清空重灌會讓 id 全部變號，而 id 是被外部參照的東西。
// 這裡用 ON CONFLICT DO UPDATE，同一筆永遠是同一個 id。
//
// 資料清洗與拆解的規則都沿用網站已經在用的那幾支 utils，
// 不另外寫一份 —— 兩套規則遲早會漂移，然後沒有人知道哪一套是對的。
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { connect, migrate } from './client.mjs'
import { rootGroup, parseGroup } from '../src/utils/bands.js'
import { detectCity, canonicalVenue } from '../src/utils/derive.js'
import { organizersOf } from '../src/utils/organizers.js'
import { relationOf } from '../src/utils/relation.js'
import { URGENT_VALUE } from '../src/utils/urgency.js'
import { SPAN_TYPES } from '../src/utils/counting.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))

// 名字正規化：只用來當唯一鍵，不影響顯示。
// 拿掉空白與各種撇號 —— Poppin'Party 有直的也有彎的，是同一個團。
const norm = (s) => String(s ?? '').replace(/[\s'’‘`]/g, '').toLowerCase()
const clean = (s) => { const v = String(s ?? '').trim(); return v || null }
const date = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null)

const db = await connect()
console.log(`資料庫：${db.kind}（${db.label}）`)
await migrate(db)

const events = read('src/data/events.json')
const changelog = existsSync(join(ROOT, 'src/data/changelog.json')) ? read('src/data/changelog.json') : []
const covers = existsSync(join(ROOT, 'src/data/covers.json')) ? read('src/data/covers.json') : {}

// 名冊：聲優屬於哪個團的權威來源。沒有它就只能從聯合場次反推，一定會錯。
let roster = []
try {
  const { parseRosterCsv } = await import('../src/utils/parsePulse.js')
  const { SHEET_CSV_URL } = await import('../src/config.js')
  if (SHEET_CSV_URL && !process.env.SKIP_ROSTER) {
    const url = `${SHEET_CSV_URL}&sheet=${encodeURIComponent('名冊')}`
    roster = parseRosterCsv(await (await fetch(url)).text())
  }
} catch (err) {
  console.log(`  （名冊抓不到，略過：${err.message}）`)
}

// ---------------------------------------------------------------- 小工具
// 回傳既有或新建的 id。UPDATE 那段看似多餘，但它讓 RETURNING 一定有值 ——
// DO NOTHING 在衝突時不會回傳任何列，還要再查一次。
async function upsertNamed(table, name, extra = {}) {
  const cols = ['name', 'name_norm', ...Object.keys(extra)]
  const vals = [name, norm(name), ...Object.values(extra)]
  const ph = vals.map((_, i) => `$${i + 1}`).join(', ')
  const updates = Object.keys(extra).map(k => `${k} = COALESCE(EXCLUDED.${k}, ${table}.${k})`)
  const setClause = ['name = EXCLUDED.name', ...updates].join(', ')
  const { rows } = await db.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph})
     ON CONFLICT (name_norm) DO UPDATE SET ${setClause}
     RETURNING id`, vals)
  return rows[0].id
}

const stat = { person: 0, band: 0, venue: 0, organizer: 0, event: 0, appearance: 0, eventBand: 0, change: 0, type: 0 }

// 「EXPO／Talk／手渡」拆成三個類型。半形斜線也吃。
const splitTypes = (s) => String(s ?? '').split(/[／/、]/).map(x => x.trim()).filter(Boolean)

await db.exec('BEGIN')
try {
  // ---------------------------------------------------------- 維度
  const bandId = new Map()
  const personId = new Map()
  const venueId = new Map()

  for (const r of roster) {
    if (!r.band) continue
    if (!bandId.has(r.band)) { bandId.set(r.band, await upsertNamed('band', r.band)); stat.band++ }
  }

  for (const e of events) {
    for (const g of e.relatedGroups || []) {
      const b = rootGroup(g)
      if (b && !bandId.has(b)) { bandId.set(b, await upsertNamed('band', b)); stat.band++ }
    }
    for (const p of e.people || []) {
      if (!personId.has(p)) { personId.set(p, await upsertNamed('person', p)); stat.person++ }
    }
    const v = canonicalVenue(e.venue)
    if (v && !venueId.has(v)) {
      venueId.set(v, await upsertNamed('venue', v, { city: detectCity(e) }))
      stat.venue++
    }
    // 別名指回正式名稱，之後 Sheet 再出現舊寫法也對得上
    const raw = clean(e.venue)
    if (raw && v && norm(raw) !== norm(v)) {
      await db.query(
        `INSERT INTO venue_alias (alias_norm, venue_id) VALUES ($1, $2)
         ON CONFLICT (alias_norm) DO UPDATE SET venue_id = EXCLUDED.venue_id`,
        [norm(raw), venueId.get(v)])
    }
  }

  for (const r of roster) {
    if (!r.name) continue
    if (!personId.has(r.name)) { personId.set(r.name, await upsertNamed('person', r.name)); stat.person++ }
    if (r.band && bandId.has(r.band)) {
      await db.query(
        `INSERT INTO band_member (band_id, person_id, role_name) VALUES ($1, $2, $3)
         ON CONFLICT (band_id, person_id) DO UPDATE SET role_name = COALESCE(EXCLUDED.role_name, band_member.role_name)`,
        [bandId.get(r.band), personId.get(r.name), clean(r.character)])
    }
  }

  // ---------------------------------------------------------- 活動
  const eventId = new Map()
  for (const e of events) {
    const stable = e.stableId ?? e.number
    const rel = relationOf(e)
    const v = canonicalVenue(e.venue)
    const { rows } = await db.query(
      `INSERT INTO event (
         stable_id, display_no, title, starts_on, ends_on, venue_id,
         tier, tier_source, urgency, is_full_band, sessions, ticket_on,
         cover_url, description, one_line, impression, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (stable_id) DO UPDATE SET
         display_no = EXCLUDED.display_no, title = EXCLUDED.title,
         starts_on = EXCLUDED.starts_on, ends_on = EXCLUDED.ends_on,
         venue_id = EXCLUDED.venue_id, tier = EXCLUDED.tier,
         tier_source = EXCLUDED.tier_source, urgency = EXCLUDED.urgency,
         is_full_band = EXCLUDED.is_full_band, sessions = EXCLUDED.sessions,
         ticket_on = EXCLUDED.ticket_on, cover_url = EXCLUDED.cover_url,
         description = EXCLUDED.description, one_line = EXCLUDED.one_line,
         impression = EXCLUDED.impression, notes = EXCLUDED.notes,
         updated_at = now()
       RETURNING id`,
      [stable, e.number, e.title || '未命名活動', date(e.startDate), date(e.endDate),
       v ? venueId.get(v) : null, rel.tier, rel.source,
       e.urgency === URGENT_VALUE ? 'critical' : 'normal',
       !!e.isFullBand, Number(e.sessions) || null, date(e.ticketDate),
       clean(e.cover), clean(e.description), clean(e.oneLine), clean(e.impression), clean(e.notes)])

    const id = rows[0].id
    eventId.set(stable, id)
    stat.event++

    // 關聯表：先刪後插。這些是「這一筆活動當下的完整陣容」，
    // Sheet 改掉某個人就該消失，只 upsert 不刪會留下幽靈資料。
    await db.query('DELETE FROM appearance WHERE event_id = $1', [id])
    for (const p of new Set(e.people || [])) {
      await db.query(
        'INSERT INTO appearance (event_id, person_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, personId.get(p)])
      stat.appearance++
    }

    await db.query('DELETE FROM event_band WHERE event_id = $1', [id])
    for (const b of new Set((e.relatedGroups || []).map(rootGroup).filter(Boolean))) {
      await db.query(
        'INSERT INTO event_band (event_id, band_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, bandId.get(b)])
      stat.eventBand++
    }

    // 角色關聯（「Roselia／湊友希那」）補進名冊
    for (const g of e.relatedGroups || []) {
      const { band, parts } = parseGroup(g)
      const role = parts?.[1]
      if (!band || !role || !bandId.has(band)) continue
      for (const p of e.people || []) {
        if (!personId.has(p)) continue
        await db.query(
          `INSERT INTO band_member (band_id, person_id, role_name) VALUES ($1,$2,$3)
           ON CONFLICT (band_id, person_id) DO NOTHING`,
          [bandId.get(band), personId.get(p), role])
      }
    }

    await db.query('DELETE FROM event_organizer WHERE event_id = $1', [id])
    for (const o of new Set(organizersOf(e))) {
      const oid = await upsertNamed('organizer', o)
      stat.organizer++
      await db.query(
        'INSERT INTO event_organizer (event_id, organizer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [id, oid])
    }

    // 類型：一場可以同時是多種，第一個是主要類型
    await db.query('DELETE FROM event_event_type WHERE event_id = $1', [id])
    let pos = 0
    for (const t of splitTypes(e.type)) {
      const { rows: tr } = await db.query(
        `INSERT INTO event_type (name, name_norm, is_span) VALUES ($1,$2,$3)
         ON CONFLICT (name_norm) DO UPDATE SET is_span = EXCLUDED.is_span
         RETURNING id`,
        [t, norm(t), SPAN_TYPES.has(t)])
      await db.query(
        'INSERT INTO event_event_type (event_id, event_type_id, position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [id, tr[0].id, pos++])
      stat.type++
    }

    for (const url of new Set(e.sources || [])) {
      await db.query(
        'INSERT INTO event_source (event_id, url) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [id, url])
    }
  }

  // ---------------------------------------------------------- 更新日誌
  for (const entry of changelog) {
    for (const kind of ['added', 'changed']) {
      for (const item of entry[kind] || []) {
        const id = eventId.get(item.id ?? item.number)
        if (!id) continue
        await db.query(
          `INSERT INTO event_change (event_id, changed_on, kind, fields) VALUES ($1,$2,$3,$4)
           ON CONFLICT (event_id, changed_on, kind) DO UPDATE SET fields = EXCLUDED.fields`,
          [id, entry.date, kind, item.fields || []])
        stat.change++
      }
    }
  }

  await db.exec('COMMIT')
} catch (err) {
  await db.exec('ROLLBACK')
  console.error('✗ 匯入失敗，已整份回捲：', err.message)
  await db.close()
  process.exit(1)
}

console.log(`\n活動 ${stat.event} · 人物 ${stat.person} · 樂團 ${stat.band} · 場館 ${stat.venue}`)
console.log(`陣容 ${stat.appearance} · 活動×樂團 ${stat.eventBand} · 異動 ${stat.change}`)
console.log(`封面 manifest ${Object.keys(covers).length} 筆（尚未入庫）`)
await db.close()
