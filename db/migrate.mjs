// npm run db:migrate —— 把 schema 帶到最新版
import { connect, migrate } from './client.mjs'

const db = await connect()
console.log(`資料庫：${db.kind}（${db.label}）`)
const { applied, total } = await migrate(db, { log: console.log })
console.log(applied ? `套用 ${applied} 份 migration，共 ${total} 份` : `已是最新（共 ${total} 份）`)
await db.close()
