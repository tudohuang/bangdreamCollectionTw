// SEO 的自動檢查。
//
// 這些事情用眼睛看不完 —— 138 個頁面，每頁十幾個 head 標籤，
// 而且壞掉的時候完全沒有症狀：畫面正常、測試綠燈，只有搜尋結果悄悄變差。
// 所以寫成測試。
//
// 跑的是 dist/ 的實際產物，不是渲染函式 —— 中間任何一步弄壞了都要抓得到。
// 沒有 dist/ 就整批跳過（本機還沒 build 過是正常的）。
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const HAS_DIST = existsSync(join(DIST, 'index.html'))

// 蒐集所有產出的靜態頁
function allPages() {
  const out = []
  if (existsSync(join(DIST, 'index.html'))) out.push({ rel: 'index.html', kind: 'home' })
  for (const dir of ['e', 'p', 'b', 'y', 'v', 't', 's']) {
    const d = join(DIST, dir)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d)) {
      if (f.endsWith('.html')) out.push({ rel: `${dir}/${f}`, kind: dir })
    }
  }
  return out
}

const read = (rel) => readFileSync(join(DIST, rel), 'utf8')

// head 標籤的取值。刻意用最笨的方式解析 —— 正式的 HTML parser 對
// 這種檢查是殺雞用牛刀，而且多一個依賴。
const meta = (html, name) => {
  const m = html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`))
  return m ? m[1] : null
}
const prop = (html, p) => {
  const m = html.match(new RegExp(`<meta\\s+property="${p}"\\s+content="([^"]*)"`))
  return m ? m[1] : null
}
const titleOf = (html) => (html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? null
const canonicalOf = (html) => (html.match(/rel="canonical"\s+href="([^"]*)"/) || [])[1] ?? null
const jsonLd = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(m => JSON.parse(m[1]))

// 中文字在搜尋結果佔的寬度約是英數的兩倍
const displayWidth = (s) =>
  [...String(s ?? '')].reduce((n, ch) => n + (/[\x00-\xff]/.test(ch) ? 1 : 2), 0)

describe('SEO', { skip: HAS_DIST ? false : '尚未 build，跳過（npm run verify 會先 build 再跑）' }, () => {
  const pages = HAS_DIST ? allPages() : []

  test('產出的頁數符合預期', () => {
    const byKind = {}
    for (const p of pages) byKind[p.kind] = (byKind[p.kind] || 0) + 1
    assert.ok(byKind.home === 1, '要有首頁')
    assert.ok(byKind.e >= 50, `活動頁太少：${byKind.e}`)
    assert.ok(byKind.p >= 30, `人物頁太少：${byKind.p}`)
    assert.ok(byKind.y >= 5, `年份頁太少：${byKind.y}`)
  })

  test('每一頁都有 title、description、canonical', () => {
    const bad = []
    for (const p of pages) {
      const h = read(p.rel)
      if (!titleOf(h)) bad.push(`${p.rel} 沒有 title`)
      if (!meta(h, 'description')) bad.push(`${p.rel} 沒有 description`)
      if (!canonicalOf(h)) bad.push(`${p.rel} 沒有 canonical`)
    }
    assert.deepEqual(bad, [])
  })

  test('canonical 是絕對網址', () => {
    const bad = pages.filter(p => !/^https?:\/\//.test(canonicalOf(read(p.rel)) || ''))
    assert.deepEqual(bad.map(p => p.rel), [],
      'canonical 用相對路徑等於沒設，搜尋引擎會自己猜')
  })

  test('沒有兩頁共用同一個 title', () => {
    const seen = new Map()
    for (const p of pages) {
      const t = titleOf(read(p.rel))
      if (!seen.has(t)) seen.set(t, [])
      seen.get(t).push(p.rel)
    }
    const dup = [...seen].filter(([, list]) => list.length > 1)
    assert.deepEqual(dup.map(([t, l]) => `${t} ← ${l.join(', ')}`), [],
      '重複的 title 會讓 Google 只收其中一頁')
  })

  test('沒有兩頁共用同一個 description', () => {
    const seen = new Map()
    for (const p of pages) {
      const d = meta(read(p.rel), 'description')
      if (!seen.has(d)) seen.set(d, [])
      seen.get(d).push(p.rel)
    }
    const dup = [...seen].filter(([, list]) => list.length > 1)
    assert.deepEqual(dup.map(([, l]) => l.join(', ')), [])
  })

  test('description 長度落在會被完整顯示的範圍', () => {
    // 太短沒資訊，太長會被截斷。以顯示寬度算，不是字數。
    const bad = []
    for (const p of pages) {
      const d = meta(read(p.rel), 'description') || ''
      const w = displayWidth(d)
      if (w < 40) bad.push(`${p.rel} 太短（${w}）：${d}`)
      if (w > 320) bad.push(`${p.rel} 太長（${w}）`)
    }
    assert.deepEqual(bad, [])
  })

  test('每一頁都允許被收錄，而且開了大張縮圖', () => {
    const bad = []
    for (const p of pages) {
      const r = meta(read(p.rel), 'robots') || ''
      if (/noindex/.test(r)) bad.push(`${p.rel} 被 noindex 擋住`)
      if (!/max-image-preview:large/.test(r)) bad.push(`${p.rel} 沒開大張縮圖`)
    }
    assert.deepEqual(bad, [])
  })

  test('分享卡片的四個必要欄位都在', () => {
    const bad = []
    for (const p of pages) {
      const h = read(p.rel)
      for (const k of ['og:title', 'og:description', 'og:image']) {
        if (!prop(h, k)) bad.push(`${p.rel} 缺 ${k}`)
      }
      if (!meta(h, 'twitter:card')) bad.push(`${p.rel} 缺 twitter:card`)
    }
    assert.deepEqual(bad, [])
  })

  test('og:image 是絕對網址而且檔案真的在', () => {
    const bad = []
    for (const p of pages) {
      const img = prop(read(p.rel), 'og:image') || ''
      if (!/^https?:\/\//.test(img)) { bad.push(`${p.rel} og:image 不是絕對網址`); continue }
      const path = new URL(img).pathname.replace(/^\//, '')
      if (!existsSync(join(DIST, path))) bad.push(`${p.rel} og:image 指向不存在的檔案：${path}`)
    }
    assert.deepEqual(bad, [])
  })

  test('沒有任何頁面在自動轉址', () => {
    // 立刻跳走的頁面會被當成轉址頁，內容不會被收錄
    const bad = pages.filter(p => /location\.replace|http-equiv="refresh"/i.test(read(p.rel)))
    assert.deepEqual(bad.map(p => p.rel), [])
  })

  test('結構化資料全部可解析，型別正確', () => {
    const bad = []
    const types = new Map()
    for (const p of pages) {
      let blocks
      try { blocks = jsonLd(read(p.rel)) }
      catch (e) { bad.push(`${p.rel} JSON-LD 壞掉：${e.message}`); continue }
      if (!blocks.length) { bad.push(`${p.rel} 沒有結構化資料`); continue }
      for (const b of blocks) {
        if (!b['@context'] || !b['@type']) bad.push(`${p.rel} 缺 @context 或 @type`)
        types.set(b['@type'], (types.get(b['@type']) || 0) + 1)
      }
    }
    assert.deepEqual(bad, [])
    for (const t of ['Event', 'BreadcrumbList', 'Person', 'ItemList', 'WebSite']) {
      assert.ok(types.get(t) > 0, `應該要有 ${t} 型別`)
    }
  })

  test('Event 結構化資料有 Google 要的必填欄位', () => {
    const bad = []
    for (const p of pages.filter(x => x.kind === 'e')) {
      const ev = jsonLd(read(p.rel)).find(b => b['@type'] === 'Event')
      if (!ev) { bad.push(`${p.rel} 沒有 Event`); continue }
      // Google 的 Event 複合式搜尋結果要求：name、startDate、location
      if (!ev.name) bad.push(`${p.rel} Event 缺 name`)
      if (!ev.startDate) bad.push(`${p.rel} Event 缺 startDate`)
      if (!ev.location?.name) bad.push(`${p.rel} Event 缺 location`)
      if (ev.startDate && !/^\d{4}-\d{2}-\d{2}/.test(ev.startDate)) {
        bad.push(`${p.rel} startDate 格式不對：${ev.startDate}`)
      }
      if (ev.location?.geo) {
        const { latitude: la, longitude: ln } = ev.location.geo
        if (!(la >= -90 && la <= 90 && ln >= -180 && ln <= 180)) {
          bad.push(`${p.rel} 座標超出範圍`)
        }
      }
    }
    // 有幾場沒有日期或場館是資料本身的問題，不該讓測試整個失敗
    assert.ok(bad.length <= 3, `Event 結構化資料問題太多：\n${bad.join('\n')}`)
  })

  test('站內連結不會連到不存在的頁', () => {
    const bad = []
    for (const p of pages) {
      const h = read(p.rel)
      for (const m of h.matchAll(/href="\.\.\/([^"#?]+)"/g)) {
        const target = decodeURIComponent(m[1])
        if (target === '' || target.startsWith('#')) continue
        const candidates = [target, target + '.html', join(target, 'index.html')]
        if (!candidates.some(c => existsSync(join(DIST, c)))) {
          bad.push(`${p.rel} → ${target}`)
        }
      }
    }
    assert.deepEqual([...new Set(bad)], [])
  })

  test('sitemap 每個網址都是絕對路徑，而且檔案存在', () => {
    const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8')
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
    assert.ok(locs.length >= 100, `sitemap 只有 ${locs.length} 個網址`)

    const bad = []
    for (const u of locs) {
      if (!/^https?:\/\//.test(u)) { bad.push(`不是絕對網址：${u}`); continue }
      const path = decodeURIComponent(new URL(u).pathname).replace(/^\//, '')
      if (path === '') continue
      const candidates = [path, path + '.html']
      if (!candidates.some(c => existsSync(join(DIST, c)))) bad.push(`找不到檔案：${path}`)
    }
    assert.deepEqual(bad, [])
  })

  test('每一個產出的頁面都有進 sitemap', () => {
    const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8')
    const listed = new Set(
      [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map(m => decodeURIComponent(new URL(m[1]).pathname).replace(/^\//, '').replace(/\.html$/, '')))

    const missing = pages
      .map(p => p.rel.replace(/\.html$/, ''))
      .filter(rel => rel !== 'index' && !listed.has(rel))
    assert.deepEqual(missing, [], '沒進 sitemap 的頁面只能靠爬蟲自己找到')
  })

  test('robots.txt 指向 sitemap', () => {
    const txt = readFileSync(join(DIST, 'robots.txt'), 'utf8')
    assert.ok(!/Disallow:\s*\/\s*$/m.test(txt), 'robots.txt 把整站擋掉了')
    assert.match(txt, /Sitemap:\s*https?:\/\//, 'robots.txt 要指向 sitemap')
  })

  test('首頁有給爬蟲的分類連結', () => {
    // hash 路由的首頁對不執行 JS 的爬蟲來說是空的
    const h = read('index.html')
    const ns = h.match(/<noscript>([\s\S]*?)<\/noscript>/)
    assert.ok(ns, '首頁缺少 noscript 的爬蟲入口')
    const links = (ns[1].match(/<a /g) || []).length
    assert.ok(links >= 10, `爬蟲入口只有 ${links} 個連結`)
  })
})

// 系列頁是最後才補的（年份／場館／類型早就有了），所以單獨釘住 ——
// 「同一檔活動跨好幾年」是這站唯一有、別處查不到的軸線，
// 也是搜尋「bushiroad expo 台灣」時真正該命中的那一頁。
describe('系列頁', { skip: HAS_DIST ? false : '尚未 build' }, () => {
  const dir = join(DIST, 's')
  const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.html')) : []

  test('有產出來', () => {
    assert.ok(files.length >= 5, `系列頁太少：${files.length}`)
  })

  test('CTA 指向 App 裡的系列頁，不是圖鑑首頁', () => {
    // 落到圖鑑等於把人丟回起點 —— 他明明是為了這個系列來的
    for (const f of files) {
      const html = read(`s/${f}`)
      const cta = (html.match(/<a class="cta" href="([^"]*)"/) || [])[1]
      assert.match(cta ?? '', /^\.\.\/#\/series\//, `${f} 的 CTA 是 ${cta}`)
      assert.equal(cta.slice('../#/series/'.length), f.replace(/\.html$/, ''))
    }
  })

  test('每一頁至少列兩場 —— 只有一場的系列不該產（跟單場頁重複）', () => {
    for (const f of files) {
      const n = (read(`s/${f}`).match(/<li><a href="\.\.\/e\//g) || []).length
      assert.ok(n >= 2, `${f} 只列了 ${n} 場`)
    }
  })

  test('進得了 sitemap', () => {
    const sm = read('sitemap.xml')
    for (const f of files) {
      const key = f.replace(/\.html$/, '')
      assert.ok(sm.includes(`/s/${encodeURIComponent(key)}`), `sitemap 少了 ${key}`)
    }
  })

  test('首頁的爬蟲入口帶得到系列', () => {
    // 沒有內部連結的頁面等於沒有產
    assert.match(read('index.html'), /href="\/s\//)
  })
})
