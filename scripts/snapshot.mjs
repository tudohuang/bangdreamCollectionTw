// npm run snapshot —— 把 Sheet 上除了活動表以外的分頁抓下來存進 repo。
//
// 為什麼需要：活動表有 events.json 進版控，Sheet 掉了還救得回來。
// 但名冊與動態是執行時才抓的，本機一份副本都沒有 ——
// Sheet 誤刪一列、共用連結被關掉、帳號出事，那兩張表就直接消失，
// 而且沒有人會立刻發現（網站只是安靜地少一塊）。
//
// 存的是原始 CSV 不是解析後的 JSON：解析規則之後會改，原始資料不會。
// 順便留一份解析後的 JSON 給 npm run health 查健康度。
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRosterCsv, parsePulseCsv } from '../src/utils/parsePulse.js'
import { parseSongsCsv } from '../src/utils/parseSongs.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src', 'data', 'snapshot')
mkdirSync(OUT, { recursive: true })

// config.js 是 ESM 而且沒有副作用，直接讀
const { SHEET_ROSTER_CSV_URL, SHEET_PULSE_CSV_URL, SHEET_SONGS_CSV_URL } = await import('../src/config.js')

const TABS = [
  { key: 'roster', name: '名冊', url: SHEET_ROSTER_CSV_URL, parse: parseRosterCsv },
  { key: 'pulse', name: '動態', url: SHEET_PULSE_CSV_URL, parse: parsePulseCsv },
  { key: 'songs', name: '歌曲', url: SHEET_SONGS_CSV_URL, parse: parseSongsCsv, optional: true },
]

let failed = 0
for (const tab of TABS) {
  if (!tab.url) { console.log(`· ${tab.name}：沒有設定網址，跳過`); continue }

  let csv
  try {
    const res = await fetch(tab.url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    csv = await res.text()
  } catch (err) {
    // 抓不到不覆蓋既有副本 —— 那份可能是唯一還活著的資料
    console.error(`✗ ${tab.name} 抓取失敗（${err.message}），保留既有副本`)
    failed++
    continue
  }

  const rows = tab.parse(csv)
  if (!rows.length) {
    // 「歌曲」是選填的，還沒建就是 0 列 —— 那是正常狀態不是故障
    if (tab.optional) { console.log(`· ${tab.name}：還沒建這張分頁，跳過`); continue }
    console.error(`✗ ${tab.name} 解析出 0 列 —— 可能是分頁改名或發布被關掉，不覆蓋既有副本`)
    failed++
    continue
  }

  const csvPath = join(OUT, `${tab.key}.csv`)
  const jsonPath = join(OUT, `${tab.key}.json`)

  // 只在真的變了才寫，不然每次跑都會產生一筆沒意義的 diff
  const prev = existsSync(csvPath) ? readFileSync(csvPath, 'utf8') : ''
  if (prev === csv) {
    console.log(`· ${tab.name}：${rows.length} 列，沒有變動`)
    continue
  }

  writeFileSync(csvPath, csv, 'utf8')
  writeFileSync(jsonPath, JSON.stringify(rows, null, 2) + '\n', 'utf8')
  const delta = prev ? `（上次 ${prev.split(/\r?\n/).length - 1} 列）` : '（第一次）'
  console.log(`✓ ${tab.name}：${rows.length} 列 ${delta} → src/data/snapshot/${tab.key}.{csv,json}`)
}

if (failed) {
  console.log('')
  console.log(`⚠ ${failed} 張分頁沒抓到。既有副本原封不動 —— 這正是這支存在的理由。`)
  process.exitCode = 1
}
