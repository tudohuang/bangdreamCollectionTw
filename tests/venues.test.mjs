// 場館正規化。
//
// 這支的工作是「兩個字串是不是同一個地方」。答錯的代價很具體：
// 場館頁把一個地方拆成兩個、統計少算、網址對不上靜態頁。
// 而且 Sheet 是人手打的，寫法只會愈來愈多，所以規則要有測試守著。
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { venueKey, bestName, venueIndex, findVenue, cityOfWithVenue, cityBreakdown }
  from '../src/utils/venues.js'

const at = (id, venue, startDate = '2026-01-01') => ({ id, venue, startDate, endDate: startDate })

describe('venueKey', () => {
  test('同一個場館的不同寫法收斂成同一個 key', () => {
    const pairs = [
      ['南港展覽館一館', '台北南港展覽館一館 4 樓'],
      ['Clapper Studio', '三創生活園區 CLAPPER STUDIO'],
      ['TICC', 'ticc'],
      ['台北世貿一館', '世貿一館'],
    ]
    for (const [a, b] of pairs) {
      assert.equal(venueKey(a), venueKey(b), `「${a}」與「${b}」應該是同一個場館`)
    }
  })

  test('不同的場館不能被收斂成同一個', () => {
    const distinct = ['MOONDOG', 'WESTAR', 'TICC', '台北世貿一館', '南港展覽館一館',
      '桃園會展中心', 'Zepp New Taipei', '花博爭豔館']
    const keys = distinct.map(venueKey)
    assert.equal(new Set(keys).size, distinct.length,
      `有場館被誤併：${JSON.stringify(keys)}`)
  })

  test('樓層與廳室是同一棟建築裡的位置，不是不同場館', () => {
    assert.equal(venueKey('微風廣場 8F C1、C2 廳'), venueKey('微風廣場'))
    assert.equal(venueKey('新光三越高雄左營店 10F 舞台區'), venueKey('新光三越高雄左營店'))
  })

  test('全形英數與大小寫都吃', () => {
    assert.equal(venueKey('ＴＩＣＣ'), venueKey('TICC'))
    assert.equal(venueKey('臺北世貿一館'), venueKey('台北世貿一館'))
  })

  test('括號裡的是附註，丟掉；引號裡的是名字的一部分，留著', () => {
    // （TITAN SCREEN）是「哪一個影廳」——附註，不影響是哪個場館
    assert.equal(venueKey('MUVIE CINEMAS 台北松仁影城（TITAN SCREEN）'),
                 venueKey('MUVIE CINEMAS 松仁影城'))
    // 「魔法氣泡」是那間店的店名本身，丟掉會跟別的 Bushiroad 門市撞在一起
    assert.notEqual(venueKey('Bushiroad 台北旗艦店「魔法氣泡」'), venueKey('Bushiroad 旗艦店'))
    // 但引號本身要拿掉，這樣有沒有打引號都對得起來
    assert.equal(venueKey('Bushiroad 台北旗艦店「魔法氣泡」'),
                 venueKey('Bushiroad 台北旗艦店 魔法氣泡'))
  })

  test('沒填或「未確認」回空字串 —— 那不是一個場館', () => {
    for (const v of ['', '   ', '未確認', '—', '-', null, undefined]) {
      assert.equal(venueKey(v), '', JSON.stringify(v))
    }
  })
})

describe('顯示名', () => {
  test('先排除有樓層尾巴的，再挑最長的', () => {
    // 「台北南港展覽館一館 4 樓」比較長，但「4 樓」不該出現在場館頁的標題上
    assert.equal(bestName(['南港展覽館一館', '台北南港展覽館一館 4 樓']), '南港展覽館一館')
    assert.equal(bestName(['Clapper Studio', '三創生活園區 CLAPPER STUDIO']),
      '三創生活園區 CLAPPER STUDIO')
  })
  test('空集合回空字串，不要爆', () => {
    assert.equal(bestName([]), '')
  })
})

describe('場館索引', () => {
  const events = [
    at('a', '南港展覽館一館', '2024-01-01'),
    at('b', '台北南港展覽館一館 4 樓', '2025-01-01'),
    at('c', 'MOONDOG', '2023-01-01'),
    at('d', '未確認', '2026-01-01'),
  ]

  test('兩種寫法併成一個場館，場次都收進去', () => {
    const idx = venueIndex(events)
    const nangang = idx.find(v => v.key === venueKey('南港展覽館一館'))
    assert.equal(nangang.events.length, 2)
    assert.equal(nangang.names.size, 2, '兩種寫法都要留著，之後好講清楚')
  })

  test('沒有場館的場次不會生出一個空場館', () => {
    assert.ok(!venueIndex(events).some(v => !v.key))
    assert.equal(venueIndex(events).length, 2)
  })

  test('場次多的排前面', () => {
    const idx = venueIndex(events)
    assert.ok(idx[0].events.length >= idx[1].events.length)
  })

  test('每個場館內部依日期排 —— 場館頁的「第一次／最近」靠這個', () => {
    const nangang = venueIndex(events).find(v => v.events.length === 2)
    assert.deepEqual(nangang.events.map(e => e.id), ['a', 'b'])
  })

  test('用任一種寫法都找得到同一個場館', () => {
    for (const name of ['南港展覽館一館', '台北南港展覽館一館 4 樓', '南港展覽館一館 ']) {
      assert.ok(findVenue(events, name), `「${name}」找不到`)
    }
  })

  test('找不到就回 null，不要回一個空殼', () => {
    assert.equal(findVenue(events, '不存在的場館'), null)
    assert.equal(findVenue(events, ''), null)
  })
})

describe('城市', () => {
  test('同一個場館其中一種寫法推得出城市，另一種就跟著走', () => {
    // 「Clapper Studio」單看推不出來，但它跟「三創生活園區 CLAPPER STUDIO」
    // 是同一個 key，後者靠「三創」推得出台北。這不是猜，是資料自己說的。
    const events = [at('a', '三創生活園區 CLAPPER STUDIO'), at('b', 'Clapper Studio')]
    assert.equal(cityOfWithVenue(events[1], events), '台北')
  })

  test('沒有旁證就留空 —— 不要猜', () => {
    const events = [at('a', 'WESTAR')]
    assert.equal(cityOfWithVenue(events[0], events), '')
  })

  test('Sheet 的「城市」欄永遠優先', () => {
    const e = { ...at('a', 'MOONDOG'), city: '台中' }
    assert.equal(cityOfWithVenue(e, [e]), '台中')
  })

  test('推不出城市的歸到「未標記」，數字才誠實', () => {
    const events = [at('a', '台北世貿一館'), at('b', 'WESTAR')]
    const b = cityBreakdown(events)
    assert.deepEqual(b, [{ city: '台北', count: 1 }, { city: '未標記', count: 1 }])
  })
})
