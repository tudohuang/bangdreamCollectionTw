// Vercel serverless function：/api/calendar —— 可訂閱的行事曆。
//
// 「匯出 .ics」是一次性的：存進去之後新公布的場次不會自己出現，
// 使用者也不會記得回來重新匯出。訂閱把方向反過來 —— 行事曆 App
// 每半天回來拉一次這個網址，之後每一場新公布的活動、每一個開賣日
// 都自動出現在使用者的手機裡，連提醒一起。
//
// 這是這站沒有後端、做不了推播的情況下，最接近推播的東西。
//
// 資料即時抓 Sheet（跟 /e/<id> 分享頁同一套），抓不到退回內建 ——
// 訂閱網址一旦被存進別人的行事曆就是永久合約，這個端點永遠不能 500。
import bundled from '../src/data/events.json' with { type: 'json' }
import { SHEET_CSV_URL } from '../src/config.js'
import { parseCsvToEvents, mergeWithBundled } from '../src/utils/parseEvents.js'
import { buildIcs } from '../src/utils/ics.js'

async function fetchEvents() {
  if (!SHEET_CSV_URL) return bundled
  try {
    const r = await fetch(SHEET_CSV_URL)
    if (!r.ok) return bundled
    const parsed = parseCsvToEvents(await r.text())
    return parsed.length ? mergeWithBundled(parsed, bundled) : bundled
  } catch {
    return bundled
  }
}

export default async function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${req.headers.host}`

  const events = await fetchEvents()
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const ics = buildIcs(events, stamp, { origin, name: '邦邦來台圖鑑' })

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  // inline 不是 attachment：webcal:// 訂閱要能直接讀，不是跳下載
  res.setHeader('Content-Disposition', 'inline; filename="bangdream-tw.ics"')
  // CDN 快取一小時。行事曆 App 半天才回來一次，一小時的新鮮度綽綽有餘，
  // 而且 Sheet 掛掉的那個小時裡大家拿到的還是好的版本。
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(ics)
}
