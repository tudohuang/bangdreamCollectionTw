// Pages Functions 共用的小工具。
// 檔名開頭的底線代表這不是路由，Cloudflare 不會把它掛成 /_lib
export const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  // 邊緣快取 5 分鐘，過期後先給舊的再背景更新；Sheet 改了最多五分鐘會反映
  'Cache-Control': 's-maxage=300, stale-while-revalidate=86400',
}

export const originOf = (request) => new URL(request.url).origin
