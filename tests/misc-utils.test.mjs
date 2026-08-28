// 剩下幾支沒有測試的 util，加上一條主題色票的防呆。
//
// canvas / shareImage / wrappedImage / useEdgeFade 沒有列進來：
// 它們要真的 CanvasRenderingContext2D 或 React 的 DOM，在 node 裡跑不起來，
// 硬要測只能測到假的東西。那幾支的保障來自煙霧測試會不會爆，不是這裡。
import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

describe('打卡紀錄（attended）', () => {
  let store
  beforeEach(() => {
    store = {}
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: (k) => { delete store[k] },
    }
  })

  test('存進去再讀出來是同一組', async () => {
    const { getAttended, saveAttended } = await import('../src/utils/attended.js?1')
    saveAttended(new Set(['evt-001', 'evt-043']))
    assert.deepEqual([...getAttended()].sort(), ['evt-001', 'evt-043'])
  })

  test('沒存過就是空的，不是 null —— 呼叫端會直接 .has()', async () => {
    const { getAttended } = await import('../src/utils/attended.js?2')
    const a = getAttended()
    assert.ok(a instanceof Set)
    assert.equal(a.size, 0)
  })

  test('存了壞掉的 JSON 也不能讓整站掛掉', async () => {
    const { getAttended } = await import('../src/utils/attended.js?3')
    for (const junk of ['{壞掉的', 'null', '"不是陣列"', '123']) {
      store['bdtw-attended'] = junk
      const a = getAttended()
      assert.ok(a instanceof Set, `${junk} 讓它回了 ${typeof a}`)
    }
  })
})

describe('封面（cover）', () => {
  test('沒有本機封面時退回 Sheet 的原網址', async () => {
    const { coverSrc, hasLocalCover } = await import('../src/utils/cover.js')
    const e = { stableId: 99999, cover: 'https://example.tw/a.jpg' }
    assert.equal(hasLocalCover(e), false)
    assert.equal(coverSrc(e), 'https://example.tw/a.jpg')
  })

  test('有本機封面就用本機的三種格式', async () => {
    const { coverSources, hasLocalCover } = await import('../src/utils/cover.js')
    const manifest = JSON.parse(readFileSync('src/data/covers.json', 'utf8'))
    const id = Object.keys(manifest)[0]
    const e = { stableId: Number(id), cover: 'https://example.tw/a.jpg' }
    assert.equal(hasLocalCover(e), true)
    const s = coverSources(e, 'sm')
    for (const k of ['avif', 'webp', 'jpg']) assert.match(s[k], /^\/covers\//, `${k} 不是本機路徑`)
    assert.ok(s.w > 0 && s.h > 0, '要帶寬高，不然版面會跳')
  })

  test('完全沒有封面也不能爆', async () => {
    const { coverSrc, coverRatio } = await import('../src/utils/cover.js')
    assert.doesNotThrow(() => coverSrc({}))
    // 比例回 null 代表「不知道」——呼叫端要靠這個決定不要先佔位，
    // 回一個假的預設比例反而會讓版面跳。
    assert.equal(coverRatio({}), null)
  })
})

describe('回顧（review）', () => {
  const ev = (id, year, startDate) => ({ id, year, startDate, endDate: startDate, relatedGroups: [], people: [] })

  test('可選年份由資料決定，且由新到舊', async () => {
    const { availableYears } = await import('../src/utils/review.js')
    const years = availableYears([ev('a', 2018, '2018-01-01'), ev('b', 2026, '2026-01-01'), ev('c', 2022, '2022-01-01')])
    assert.deepEqual(years.slice(0, 3), [2026, 2022, 2018])
  })

  test('某一年的摘要只算那一年', async () => {
    const { yearSummary } = await import('../src/utils/review.js')
    const s = yearSummary([ev('a', 2026, '2026-01-01'), ev('b', 2018, '2018-01-01')], 2026)
    assert.equal(s.year, 2026)
    assert.equal(s.total, 1)
  })

  test('沒有資料的年份不會爆', async () => {
    const { yearSummary } = await import('../src/utils/review.js')
    assert.doesNotThrow(() => yearSummary([], 2026))
  })
})

describe('主題色票', () => {
  // 加了一個新色票卻忘了給深色值，畫面上是「深色底配深色字」——
  // 看不出是錯誤，只覺得那一塊怪怪的。這條擋的就是那個。
  test(':root 的每個顏色，.dark 都要覆寫', () => {
    const css = readFileSync('src/index.css', 'utf8')
    const block = (sel) => css.match(new RegExp(sel + '\\s*\\{([\\s\\S]*?)\\n  \\}'))?.[1] || ''
    const varsOf = (b) => [...b.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1])

    const root = varsOf(block(':root'))
    const dark = new Set(varsOf(block('\\.dark')))
    assert.ok(root.length >= 5, `:root 只找到 ${root.length} 個變數，正則可能失效了`)

    // 版面偏移不是顏色，不需要跟著主題變
    const LAYOUT_ONLY = ['--sticky-top', '--wall-top']
    const missing = root.filter(v => !dark.has(v) && !LAYOUT_ONLY.includes(v))
    assert.deepEqual(missing, [], '這些色票沒有深色版本')
  })
})
