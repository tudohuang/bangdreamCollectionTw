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
  build: {
    rollupOptions: {
      output: {
        // React 與圖示庫拆成獨立的 vendor chunk。
        //
        // 總下載量不會變少，變的是回訪者：改一行文案就換一次 hash 的話，
        // 每次部署所有人都要重載整包。拆開之後 vendor 的 hash 不動，
        // 瀏覽器直接用快取，只重載真的改過的應用程式碼。
        //
        // 這站現在幾乎天天有新場次要更新，所以這件事會一直發生。
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\/]node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return 'vendor-react'
          if (id.includes('@fortawesome')) return 'vendor-icons'
        },
      },
    },
  },
})
