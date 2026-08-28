// 時間的三種切法：初來台／空窗／年輪。
//
// 這三個都會直接變成畫面上的一句斷言（「1385 天」「只來過一次」「最密的是 2 月」），
// 講錯了沒有人會發現 —— 因為那些數字看起來都很合理。所以用手算得出來的
// 小資料集把邊界釘住。
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { firsts, gaps, currentGap, dayOfYear, yearRing, monthTotals, labelOfDay }
  from '../src/utils/chronology.js'

const ev = (id, startDate, people = [], endDate) => ({ id, startDate, endDate: endDate || startDate, people })

describe('初來台與最近一次', () => {
  const events = [
    ev('a', '2018-02-03', ['愛美', '大塚紗英']),
    ev('b', '2023-05-20', ['愛美']),
    ev('c', '2026-04-12', ['愛美', '相羽あいな']),
  ]

  test('第一次取最早、最近一次取最晚', () => {
    const f = firsts(events).find(x => x.name === '愛美')
    assert.equal(f.first.id, 'a')
    assert.equal(f.last.id, 'c')
    assert.equal(f.count, 3)
  })

  test('只來過一次的人，頭尾是同一場，而且明著標出來', () => {
    const f = firsts(events).find(x => x.name === '大塚紗英')
    assert.equal(f.onlyOnce, true)
    assert.equal(f.first.id, f.last.id)
    assert.equal(f.spanDays, 0)
  })

  test('依初來台排序 —— 整張表要讀起來像一條隊伍', () => {
    // 斷言的是「初來台日期不遞減」這個不變條件，不是某個確切的名單順序。
    // 同一天並列時用名字排，而中文的排序結果跟 Node 的 ICU 版本有關 ——
    // 把那個綁進測試，換一台機器就會紅。
    const dates = firsts(events).map(x => x.first.startDate)
    for (let i = 1; i < dates.length; i++) {
      assert.ok(dates[i - 1] <= dates[i], `${dates[i - 1]} 排在 ${dates[i]} 前面`)
    }
    assert.equal(dates[0], '2018-02-03')
    assert.equal(dates[dates.length - 1], '2026-04-12')
  })

  test('沒有日期的場次不參與，不能讓它變成「最早的一次」', () => {
    const f = firsts([...events, ev('x', '', ['愛美'])]).find(x => x.name === '愛美')
    assert.equal(f.count, 3)
    assert.equal(f.first.id, 'a')
  })

  test('跨了幾天算得對', () => {
    const f = firsts([ev('a', '2020-01-01', ['A']), ev('b', '2021-01-01', ['A'])])[0]
    assert.equal(f.spanDays, 366, '2020 是閏年')
  })
})

describe('空窗期', () => {
  const events = [
    ev('a', '2019-08-04'),
    ev('b', '2023-05-20'),
    ev('c', '2023-05-27'),
  ]

  test('由長到短，附上前後兩場', () => {
    const g = gaps(events)
    assert.equal(g[0].days, 1385)
    assert.equal(g[0].prev.id, 'a')
    assert.equal(g[0].next.id, 'b')
    assert.equal(g[1].days, 7)
  })

  test('同一天的兩場不算空窗（間隔 0 不列入）', () => {
    assert.deepEqual(gaps([ev('a', '2024-01-01'), ev('b', '2024-01-01')]), [])
  })

  test('只有一場就沒有空窗', () => {
    assert.deepEqual(gaps([ev('a', '2024-01-01')]), [])
  })

  test('用開始日算，跨日活動不會把空窗吃掉', () => {
    // 快閃店辦一個月，下一場在結束後三天 —— 空窗要從「開始日」量
    const g = gaps([ev('a', '2024-01-01', [], '2024-01-31'), ev('b', '2024-02-03')])
    assert.equal(g[0].days, 33)
  })

  test('進行中的空窗算到今天', () => {
    const now = new Date('2024-03-01T00:00:00')
    const c = currentGap([ev('a', '2024-02-01'), ev('b', '2099-01-01')], now)
    assert.equal(c.prev.id, 'a', '未來的場次不能算成「上一場」')
    assert.equal(c.days, 29)
  })
})

describe('年輪', () => {
  test('一年裡的第幾天', () => {
    assert.equal(dayOfYear('2026-01-01'), 1)
    assert.equal(dayOfYear('2026-12-31'), 365)
    assert.equal(dayOfYear('2024-12-31'), 366, '閏年多一天')
    assert.equal(dayOfYear(''), 0)
  })

  test('不同年份的同一天會疊在同一格', () => {
    const cells = yearRing([ev('a', '2018-04-12'), ev('b', '2026-04-12')])
    const n = dayOfYear('2026-04-12')
    assert.equal(cells[n].length, 2)
  })

  test('跨日活動填滿整段，不是一個點', () => {
    const cells = yearRing([ev('a', '2026-03-01', [], '2026-03-05')])
    const start = dayOfYear('2026-03-01')
    for (let i = 0; i < 5; i++) assert.equal(cells[start + i].length, 1, `第 ${i} 天沒填到`)
    assert.equal(cells[start + 5].length, 0, '結束日之後不該再填')
  })

  test('超長檔期會被截在 60 天 —— 不然一筆就把整張圖塗滿', () => {
    const cells = yearRing([ev('a', '2026-01-01', [], '2026-12-31')])
    assert.equal(cells.filter(c => c.length).length, 61)
  })

  test('每個月的場次數', () => {
    const t = monthTotals([ev('a', '2026-02-01'), ev('b', '2026-02-20'), ev('c', '2026-08-01')])
    assert.equal(t[2], 2)
    assert.equal(t[8], 1)
    assert.equal(t[1], 0)
  })

  test('第 n 天換算成月日（畫面上的 tooltip）', () => {
    assert.equal(labelOfDay(1), '1 月 1 日')
    assert.equal(labelOfDay(102), '4 月 12 日')
  })
})
