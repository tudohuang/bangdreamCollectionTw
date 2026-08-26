# 資料庫

網站本身不需要資料庫就能跑 —— 它讀的是建置時產生的 JSON。
這一層存在的理由是**把資料當成資料來管**：約束、歷史、可查詢。

```
Google Sheet（作者介面，不變）
      ↓  npm run db:ingest      解析 → 清洗 → 冪等 upsert
   PostgreSQL                   來源真相，約束與歷史都在這
      ↓  npm run db:export      物化成 events.json
   靜態網站（零改動）
```

**網站不在執行期依賴資料庫。** 這是刻意的：資料庫是做功夫的地方，
不該變成使用者的當機點。

## 跑起來

```bash
npm run db:migrate     # 建 schema（第一次會自動建本機資料庫）
npm run db:ingest      # 把 events.json 灌進去
npm run db:sql -- "SELECT count(*) FROM event"
npm run db:sql -- --file db/queries/band_inflation.sql
npm run db:reset       # 砍掉重來（只有本機能跑）
```

本機用 **PGlite** —— 真的 PostgreSQL 編譯成 WebAssembly，不用裝伺服器、
不用開帳號，語法與約束的行為跟正式環境一致。
要連真的 Postgres（Neon / Supabase / 自架）就設環境變數：

```bash
DATABASE_URL=postgres://... npm run db:migrate
```

同一份 migration 與 ETL 兩邊通用。

## 這份 schema 在解什麼問題

不是為了把 59 筆放進資料庫 —— 59 筆用 JSON 就夠了。
值得做的是這份資料真實存在的模型問題：

| 問題 | 已經發生過的事 | schema 怎麼處理 |
|---|---|---|
| 編號重排 → 心得對到別場 | 2026-08 真的發生 | `stable_id`（永久鍵）與 `display_no`（展示編號）分開 |
| 59 筆 ≠ 67 場 ≠ 71 天 | 統計口徑爭議 | `event_sessions` view 把 grain 定義寫死一份 |
| 樂團出現 ≠ 本體來過 | Pastel＊Palettes 9 筆只有 1 筆本體 | `appearance` 與 `event_band` 分開，`tier` 三級 |
| 重跑匯入不能變兩份 | — | `ON CONFLICT DO UPDATE`，id 永遠不變 |
| 同一個場館兩種寫法 | 南港展覽館一館 | `venue_alias` 指回正式名稱 |
| 上坂堇 → 上坂菫 | 異體字 | `name_norm` 當唯一鍵，顯示名另存 |

## 交叉驗證

統計邏輯有兩份實作：`src/utils/` 的 JavaScript 與 `db/queries/` 的 SQL。
`tests/db.test.mjs` 斷言兩邊算出同一個答案 —— **兩種實作互相當對方的測試**。

這在第一次跑就抓到東西：SQL 算 83 場、JS 算 67 場，
差別是 schema 漏了「類型」，判斷不出「快閃店開十天只算一場」。
migration `002` 就是為了補這個。

## 檔案

| 檔案 | 用途 |
|---|---|
| `migrations/*.sql` | 依檔名順序套用，跑過的記在 `schema_migration` |
| `client.mjs` | 連線與 migration。PGlite 與 pg 共用同一個介面 |
| `ingest.mjs` | ETL。清洗規則直接用網站那幾支 utils，不另寫一份 |
| `queries/*.sql` | 分析查詢，也是測試的比對對象 |
