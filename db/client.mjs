// 資料庫連線。
//
// 本機與 CI 用 PGlite —— 那是真的 PostgreSQL 編譯成 WebAssembly，
// 不用裝伺服器、不用開帳號，但語法與約束的行為跟正式環境一致。
// 設了 DATABASE_URL 就改連真的 Postgres（Neon / Supabase / 自架都行）。
//
// 兩邊共用同一個介面，所以 migration 與 ETL 只要寫一份。
import { readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const MIGRATIONS_DIR = join(HERE, 'migrations')

// 本機資料庫的落腳處。放 .cache 是因為它是產物不是原始碼 —— 隨時能重建。
const LOCAL_DIR = join(HERE, '..', '.cache', 'pgdata')

export async function connect({ url = process.env.DATABASE_URL, fresh = false } = {}) {
  if (url) return connectRemote(url)
  return connectLocal({ fresh })
}

async function connectRemote(url) {
  const { default: pg } = await import('pg')
  const client = new pg.Client({
    connectionString: url,
    // 雲端 Postgres 幾乎都要 TLS，但憑證鏈常常不完整
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
  })
  await client.connect()
  return {
    kind: 'postgres',
    label: new URL(url).host,
    query: (sql, params = []) => client.query(sql, params),
    exec: (sql) => client.query(sql),
    close: () => client.end(),
  }
}

async function connectLocal({ fresh }) {
  const { PGlite } = await import('@electric-sql/pglite')
  // fresh：不落地，每次都是全新的空資料庫（測試要的就是這個）
  const db = fresh ? await PGlite.create() : (mkdirSync(LOCAL_DIR, { recursive: true }), await PGlite.create(LOCAL_DIR))
  return {
    kind: 'pglite',
    label: fresh ? '記憶體' : LOCAL_DIR,
    query: (sql, params = []) => db.query(sql, params),
    exec: (sql) => db.exec(sql),
    close: () => db.close(),
  }
}

// 依檔名順序跑 migration，已經跑過的跳過。
// 用一張表記錄跑過哪些 —— 沒有這張表就只能靠人記得，遲早會重複跑或漏跑。
export async function migrate(db, { log = () => {} } = {}) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migration (
      filename   text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`)

  const done = new Set(
    (await db.query('SELECT filename FROM schema_migration')).rows.map(r => r.filename))

  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
  let applied = 0
  for (const file of files) {
    if (done.has(file)) continue
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    // 整份 migration 包在一個交易裡：中途失敗就整份回捲，
    // 不會留下改到一半的 schema
    await db.exec('BEGIN')
    try {
      await db.exec(sql)
      await db.query('INSERT INTO schema_migration (filename) VALUES ($1)', [file])
      await db.exec('COMMIT')
      log(`  ✓ ${file}`)
      applied++
    } catch (err) {
      await db.exec('ROLLBACK')
      throw new Error(`migration ${file} 失敗：${err.message}`)
    }
  }
  return { applied, total: files.length }
}
