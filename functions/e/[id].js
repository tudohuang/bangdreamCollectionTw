// /e/<場次 id> → 帶 og:* 的分享頁（爬蟲讀 meta，真人被轉進 App）
import { renderSharePage } from '../../src/server/shareHtml.js'
import { HTML_HEADERS, originOf } from '../_lib.js'

export async function onRequestGet({ params, request }) {
  const html = await renderSharePage({ kind: 'event', id: String(params.id || ''), origin: originOf(request) })
  return new Response(html, { headers: HTML_HEADERS })
}
