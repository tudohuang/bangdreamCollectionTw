// 路由的測試。
//
// 為什麼特別測這裡：路由是全站最容易壞、又最不容易被發現壞掉的地方。
// 加一條新路由要同時改兩個檔案（url.js 認、App.jsx 接），漏了其中一個，
// 網址打得進去、畫面卻掉回首頁 —— 沒有錯誤訊息、測試全綠、
// 只有真的去點那條連結的人會遇到。
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// url.js 直接讀 window.location，在 node 裡要先給它一個
globalThis.window = { location: { hash: '' } }
globalThis.history = { pushState() {}, replaceState() {} }
const { readHash, writeHash } = await import('../src/utils/url.js')

const at = (hash) => { globalThis.window.location.hash = hash; return readHash() }

describe('路由', () => {
  test('首頁', () => {
    assert.equal(at('').route, 'home')
    assert.equal(at('#/').route, 'home')
    assert.equal(at('#/不存在的頁').route, 'home')
  })

  test('內容頁認得 id 與名字', () => {
    assert.deepEqual(at('#/event/evt-043'), { route: 'event', id: 'evt-043', params: {} })
    assert.equal(at('#/person/愛美').value, '愛美')
    assert.equal(at('#/band/Roselia').value, 'Roselia')
    assert.equal(at('#/org/宝島制作委員会').value, '宝島制作委員会')
    assert.equal(at('#/venue/世貿一館').value, '世貿一館')
  })

  test('中文與符號經過編碼還原得回來', () => {
    // Poppin'Party 的撇號、場館名的全形字，都會被 encodeURIComponent 改寫
    for (const v of ["Poppin'Party", '台北世貿一館', 'Pastel＊Palettes', '宝島制作委員会']) {
      assert.equal(at(`#/band/${encodeURIComponent(v)}`).value, v, `${v} 還原失敗`)
    }
  })

  test('清單頁帶得住查詢參數', () => {
    const h = at('#/collection?year=2026&type=FMT')
    assert.equal(h.route, 'collection')
    assert.deepEqual(h.params, { year: '2026', type: 'FMT' })
  })

  test('舊網址還進得來', () => {
    // 這些連結已經散在外面了，改版不能讓它們變成 404
    assert.deepEqual(at('#/year/2026'), { route: 'collection', params: { year: '2026' } })
    assert.equal(at('#/filter?type=LIVE').route, 'collection')
    assert.equal(at('#/pulse').route, 'pulse')
  })

  test('writeHash 與 readHash 對得起來', () => {
    const cases = [
      ['event', { id: 'evt-001' }],
      ['person', { value: '愛美' }],
      ['band', { value: "Poppin'Party" }],
      ['venue', { value: '世貿一館' }],
    ]
    for (const [route, opts] of cases) {
      let written = ''
      globalThis.history.pushState = (_a, _b, h) => { written = h }
      globalThis.window.location.hash = '#/sentinel'
      writeHash(route, opts)
      const back = at(written)
      assert.equal(back.route, route, `${route} 寫出去再讀回來變成 ${back.route}`)
      assert.equal(back.id ?? back.value, opts.id ?? opts.value)
    }
  })

  // 這一條是重點：readHash 實際會吐出來的每一個 route，App.jsx 都必須接。
  //
  // 比對的是「實際回傳值」不是原始碼裡的字串 —— 因為 url.js 自己就會改寫
  // 一部分網址（#/year/2026 → collection、#/pulse → labs），那些名字
  // 根本不會傳到 App.jsx，照原始碼比會誤報。
  //
  // 用讀檔比對是因為 App.jsx 要瀏覽器環境，在 node 裡跑不起來。
  test('readHash 吐得出來的路由，App.jsx 都有接', () => {
    const url = readFileSync('src/utils/url.js', 'utf8')
    const app = readFileSync('src/App.jsx', 'utf8')

    // 把 url.js 裡出現過的所有路徑名都拿去試一遍，看實際會變成什麼 route
    const names = new Set([
      ...[...url.matchAll(/segments\[0\] === '([a-z]+)'/g)].map(m => m[1]),
      ...[...(url.match(/const PAGES = new Set\(\[([^\]]*)\]\)/)?.[1] || '')
            .matchAll(/'([a-z]+)'/g)].map(m => m[1]),
    ])
    assert.ok(names.size >= 8, `只找到 ${names.size} 個路徑名，正則可能失效了`)

    const produced = new Set()
    for (const n of names) produced.add(at(`#/${n}/x`).route)

    // App.jsx 自己也有一層別名（例如 pulse → labs），那些不用另外接
    const alias = new Set([...(app.match(/const PAGE_ALIAS = \{([^}]*)\}/s)?.[1] || '')
      .matchAll(/([a-z]+)\s*:/g)].map(m => m[1]))

    const missing = [...produced].filter(r =>
      r !== 'home' && !alias.has(r) && !new RegExp(`'${r}'`).test(app))
    assert.deepEqual(missing, [],
      'readHash 會吐出這些 route，但 App.jsx 完全沒提到 —— 網址打得進去，畫面會掉回首頁')
  })
})
