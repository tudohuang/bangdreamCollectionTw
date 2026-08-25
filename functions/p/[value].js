// /p/<聲優名> → 聲優的分享頁
import { renderSharePage } from '../../src/server/shareHtml.js'
import { HTML_HEADERS, originOf } from '../_lib.js'

export async function onRequestGet({ params, request }) {
  const html = await renderSharePage({
    kind: 'person',
    value: decodeURIComponent(String(params.value || '')),
    origin: originOf(request),
  })
  return new Response(html, { headers: HTML_HEADERS })
}
