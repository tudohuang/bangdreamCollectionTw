// Service worker：讓網站加到主畫面後，離線也開得起來。
//
// 刻意寫得很保守。這站沒有後端、資料是即時抓 Google Sheet 的，
// 快取策略只要弄錯一步，使用者就會一直看到過期的活動表 —— 那比沒有離線功能糟。
// 所以規則只有三條：
//
//   1. 網頁本身（HTML）走「先連線、失敗才用快取」。部署後一定拿得到新版。
//   2. Vite 產出的 /assets/*.js|css 檔名帶內容 hash，內容變檔名就變，
//      所以可以放心走「先快取」—— 不會拿到舊的。
//   3. 其他（圖片）走「先給快取、背景更新」。
//
// Google Sheet 的 CSV 完全不碰，交給 App 自己的 localStorage 快取處理。

const VERSION = 'v2'
const SHELL = `bdtw-shell-${VERSION}`
const ASSETS = `bdtw-assets-${VERSION}`
const MEDIA = `bdtw-media-${VERSION}`
const KEEP = new Set([SHELL, ASSETS, MEDIA])

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('bdtw-') && !KEEP.has(name)) await caches.delete(name)
    }
    await self.clients.claim()
  })())
})

const put = async (cacheName, request, response) => {
  if (response && response.ok && response.type === 'basic') {
    (await caches.open(cacheName)).put(request, response.clone())
  }
  return response
}

// 這站是 hash 路由，所有 App 網址的 pathname 都是「/」——
// #/collection 那段永遠不會送到伺服器。所以只有它才該退回 App 外殼。
// 不加這個判斷的話，任何一次網路抖動都會讓「別的網址」也拿到 App 外殼，
// 使用者看到的網址與內容對不上，而且極難查。
const isAppShell = (url) => url.pathname === '/' || url.pathname === '/index.html'

async function networkFirst(request) {
  try {
    return await put(SHELL, request, await fetch(request))
  } catch {
    const exact = await caches.match(request)
    if (exact) return exact
    if (isAppShell(new URL(request.url))) {
      const shell = await caches.match('/')
      if (shell) return shell
    }
    return new Response('離線中，而且這一頁還沒被快取過。', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

async function cacheFirst(request, cacheName) {
  const hit = await caches.match(request)
  if (hit) return hit
  return put(cacheName, request, await fetch(request))
}

async function staleWhileRevalidate(request, cacheName) {
  const hit = await caches.match(request)
  const fresh = fetch(request).then(r => put(cacheName, request, r)).catch(() => null)
  return hit || (await fresh) || Response.error()
}

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // 跨網域一律不管：Sheet 的 CSV、字型、外站圖床都讓瀏覽器自己處理
  if (url.origin !== self.location.origin) return
  // 分享頁與圖片代理是動態產生的，不快取
  if (/^\/(api|e|p|b)\//.test(url.pathname)) return

  if (request.mode === 'navigate') return e.respondWith(networkFirst(request))
  if (url.pathname.startsWith('/assets/')) return e.respondWith(cacheFirst(request, ASSETS))
  if (request.destination === 'image') return e.respondWith(staleWhileRevalidate(request, MEDIA))
})
