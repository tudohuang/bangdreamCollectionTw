// npm run db:reset —— 砍掉重來。本機開發用，正式環境不該跑。
import { rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.env.DATABASE_URL) {
  console.error('✗ 設了 DATABASE_URL 就不讓 reset —— 這支只給本機用')
  process.exit(1)
}
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'pgdata')
rmSync(dir, { recursive: true, force: true })
console.log('✓ 本機資料庫已刪除，下次 db:migrate 會重建')
