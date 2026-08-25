// Vercel serverless function：圖片代理（Cloudflare 版在 functions/api/img.js）
//
// 為什麼需要：年度回顧卡與票根圖是在瀏覽器用 canvas 畫出來再下載的，
// 圖片必須帶 CORS 載入，否則 canvas 會被污染、toDataURL 會被擋。
// 收藏裡約四成的封面來自不送 CORS 標頭的圖床，那些就得繞這裡一手。
const MAX_BYTES = 8 * 1024 * 1024
const BLOCKED_HOST = /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i

export default async function handler(req, res) {
  const raw = String((req.query || {}).u || '')
  if (!raw) return res.status(400).json({ error: 'missing u' })

  let url
  try { url = new URL(raw) } catch { return res.status(400).json({ error: 'bad url' }) }
  if (!/^https?:$/.test(url.protocol)) return res.status(400).json({ error: 'bad protocol' })
  if (BLOCKED_HOST.test(url.hostname)) return res.status(403).json({ error: 'blocked host' })

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 bangdream-collection/1.0 (image proxy)' },
      redirect: 'follow',
    })
    if (!upstream.ok) return res.status(502).json({ error: `upstream ${upstream.status}` })
    const type = upstream.headers.get('content-type') || ''
    if (!type.startsWith('image/')) return res.status(415).json({ error: 'not an image' })

    const buf = Buffer.from(await upstream.arrayBuffer())
    if (buf.byteLength > MAX_BYTES) return res.status(413).json({ error: 'too large' })

    res.setHeader('Content-Type', type)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800')
    return res.status(200).send(buf)
  } catch {
    return res.status(502).json({ error: 'fetch failed' })
  }
}
