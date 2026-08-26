// npm run db:sql -- "SELECT …"  或  npm run db:sql -- --file db/queries/xxx.sql
// 一個很薄的查詢殼，方便在終端機直接下 SQL 看結果。
import { readFileSync } from 'node:fs'
import { connect } from './client.mjs'

const args = process.argv.slice(2)
const fileIdx = args.indexOf('--file')
const sql = fileIdx >= 0 ? readFileSync(args[fileIdx + 1], 'utf8') : args.join(' ')
if (!sql.trim()) { console.error('用法：npm run db:sql -- "SELECT 1"'); process.exit(1) }

const db = await connect()
const t0 = Date.now()
const res = await db.query(sql)
const ms = Date.now() - t0
if (res.rows?.length) {
  console.table(res.rows)
  console.log(`${res.rows.length} 列 · ${ms} ms`)
} else {
  console.log(`（沒有回傳列）· ${ms} ms`)
}
await db.close()
