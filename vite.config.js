import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 開發時把 Cloudflare Pages Functions 接進 dev server。
// functions/ 裡的東西只有部署後才會被 Cloudflare 掛上路由，
// 本機沒有這層的話「存成圖」的圖片代理與 /e/<id> 分享頁都測不到。
function pagesFunctionsInDev() {
  const routes = [
    ['/api/img', '/functions/api/img.js'],
    ['/e/', '/functions/e/[id].js', 'id'],
    ['/p/', '/functions/p/[value].js', 'value'],
    ['/b/', '/functions/b/[value].js', 'value'],
  ]
  return {
    name: 'pages-functions-in-dev',
    apply: 'serve',
    configureServer(server) {
      for (const [prefix, modulePath, param] of routes) {
        server.middlewares.use(prefix, async (req, res, next) => {
          try {
            const mod = await server.ssrLoadModule(modulePath)
            const url = new URL(req.url, `http://${req.headers.host}`)
            // Pages 會把 [id] 這種檔名轉成 params，本機自己從路徑補上
            const params = param ? { [param]: url.pathname.replace(/^\//, '') } : {}
            const out = await mod.onRequestGet({
              request: new Request(prefix.endsWith('/') ? `http://${req.headers.host}${prefix}${url.pathname}${url.search}` : `http://${req.headers.host}${req.url}`),
              params,
            })
            res.statusCode = out.status
            out.headers.forEach((v, k) => res.setHeader(k, v))
            res.end(Buffer.from(await out.arrayBuffer()))
          } catch (e) {
            server.config.logger.error(`[pages-functions] ${prefix} ${e.message}`)
            next()
          }
        })
      }
    },
  }
}

// base: './' 用相對路徑輸出，部署到任意網域或子路徑都可用。
export default defineConfig({
  plugins: [react(), pagesFunctionsInDev()],
  base: './',
})
