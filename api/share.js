// Vercel serverless function：/e/<id>、/p/<聲優>、/b/<樂團>（路由見 vercel.json 的 rewrites）
//
// HTML 的產生邏輯跟 Cloudflare 版共用 src/server/shareHtml.js，
// 這裡只是把 Vercel 的 (req, res) 轉成那支需要的參數。
import { renderSharePage } from '../src/server/shareHtml.js'

export default async function handler(req, res) {
  const q = req.query || {}
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${req.headers.host}`

  const html = await renderSharePage({
    kind: String(q.kind || 'event'),
    id: String(q.id || ''),
    value: String(q.value || ''),
    origin,
  })

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')
  res.status(200).send(html)
}
