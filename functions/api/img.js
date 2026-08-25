// 圖片代理：把外站圖片轉一手，補上 CORS 標頭。
//
// 為什麼需要：年度回顧卡與票根圖是在瀏覽器用 canvas 畫出來再下載的，
// 圖片必須帶 CORS 載入，否則 canvas 會被污染、toDataURL 會被擋。
// 但收藏裡的封面來自各種圖床，其中約四成（巴哈 truth、Instagram、4gamers、S3…）
// 根本不送 Access-Control-Allow-Origin，那些封面就畫不進圖裡。
//
// 只有「存成圖」時才會走這裡，一般瀏覽網站是直接載原圖，不經過代理。
const MAX_BYTES = 8 * 1024 * 1024
const BLOCKED_HOST = /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i

const fail = (status, error) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })

export async function onRequestGet({ request }) {
  const raw = new URL(request.url).searchParams.get('u') || ''
  if (!raw) return fail(400, 'missing u')

  let url
  try { url = new URL(raw) } catch { return fail(400, 'bad url') }
  // 只放行 http(s)，並擋掉內網位址（避免被拿去打內部服務）
  if (!/^https?:$/.test(url.protocol)) return fail(400, 'bad protocol')
  if (BLOCKED_HOST.test(url.hostname)) return fail(403, 'blocked host')

  let upstream
  try {
    upstream = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 bangdream-collection/1.0 (image proxy)' },
      redirect: 'follow',
      cf: { cacheTtl: 86400, cacheEverything: true },
    })
  } catch {
    return fail(502, 'fetch failed')
  }

  if (!upstream.ok) return fail(502, `upstream ${upstream.status}`)
  const type = upstream.headers.get('content-type') || ''
  // 只轉圖片，不要變成任意內容的轉發站
  if (!type.startsWith('image/')) return fail(415, 'not an image')

  const size = Number(upstream.headers.get('content-length') || 0)
  if (size > MAX_BYTES) return fail(413, 'too large')

  return new Response(upstream.body, {
    headers: {
      'Content-Type': type,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  })
}
