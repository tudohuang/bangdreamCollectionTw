// 史料層的解析：曲目、票價、周邊、主視覺。
//
// 這四欄的寫法是給人手打的，所以規則必須容忍實際會發生的髒東西 ——
// 編號有沒有、全形半形、價格帶不帶逗號、安可寫「安可」還是「encore」。
// Sheet 那邊填錯不會有人發現，只會在網站上少一塊，所以規則要在這裡釘死。
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { setlistOf, songIndex, pricesOf, priceHistory, goodsOf, keyVisualOf, hasArchive }
  from '../src/utils/archive.js'

const L = (...lines) => lines.join('\n')

describe('曲目', () => {
  test('一行一首，編號可有可無', () => {
    const a = setlistOf({ setlist: L('1. STAR BEAT!', '2. 天下トーイツ') })
    const b = setlistOf({ setlist: L('STAR BEAT!', '天下トーイツ') })
    assert.deepEqual(a.map(x => x.title), ['STAR BEAT!', '天下トーイツ'])
    assert.deepEqual(b.map(x => x.title), a.map(x => x.title))
  })

  test('各種編號寫法都吃', () => {
    for (const raw of ['1. 歌', '01 歌', '1) 歌', '1、歌', '1．歌', '  1.  歌']) {
      assert.equal(setlistOf({ setlist: raw })[0].title, '歌', `解析失敗：${raw}`)
    }
  })

  test('安可之後的都標成安可，而且不佔編號', () => {
    const s = setlistOf({ setlist: L('1. A', '2. B', '安可', 'C', 'D') })
    assert.deepEqual(s.map(x => [x.n, x.title, x.encore]),
      [[1, 'A', false], [2, 'B', false], [3, 'C', true], [4, 'D', true]])
  })

  test('encore / アンコール 也認得', () => {
    for (const w of ['encore', 'ENCORE', 'アンコール', '安可：', 'Encore:']) {
      const s = setlistOf({ setlist: L('1. A', w, 'B') })
      assert.equal(s[1].encore, true, `${w} 沒被當成安可`)
    }
  })

  test('分號與全形分號也能分行 —— Sheet 裡換行不好打', () => {
    assert.equal(setlistOf({ setlist: 'A；B;C' }).length, 3)
  })

  test('沒填就是空陣列，不是 null', () => {
    for (const v of [undefined, '', '  ', '—', '-']) {
      assert.deepEqual(setlistOf({ setlist: v }), [], JSON.stringify(v))
    }
  })

  test('放在 extras 的「曲目」也讀得到（Sheet 加欄免改程式那條路）', () => {
    assert.equal(setlistOf({ extras: { 曲目: '1. A' } })[0].title, 'A')
  })
})

describe('曲目索引', () => {
  test('同一首歌跨場次會被算在一起', () => {
    const events = [
      { id: 'a', setlist: L('1. X', '2. Y') },
      { id: 'b', setlist: L('1. X') },
      { id: 'c', setlist: L('1. Z') },
    ]
    const idx = songIndex(events)
    assert.equal(idx[0].title, 'X')
    assert.equal(idx[0].count, 2)
    assert.equal(idx.find(s => s.title === 'Z').count, 1)
  })

  test('同一場重複的歌不會把自己數兩次', () => {
    const idx = songIndex([{ id: 'a', setlist: L('1. X', '安可', 'X') }])
    assert.equal(idx[0].count, 1, '安可再唱一次同一首，還是只有一場唱過')
  })

  test('沒有任何曲目資料時回空陣列（畫面靠這個決定不出現）', () => {
    assert.deepEqual(songIndex([{ id: 'a' }, { id: 'b' }]), [])
  })
})

describe('票價', () => {
  test('分區帶區名', () => {
    const p = pricesOf({ price: '搖滾區 3800 / 座位區 2800' })
    assert.deepEqual(p.tiers.map(t => [t.label, t.amount]), [['搖滾區', 3800], ['座位區', 2800]])
    assert.equal(p.low, 2800)
    assert.equal(p.high, 3800)
  })

  test('只有數字也可以', () => {
    const p = pricesOf({ price: '1800 / 2800 / 3800' })
    assert.deepEqual(p.tiers.map(t => t.amount), [1800, 2800, 3800])
  })

  test('千分位逗號與 NT$ 不會弄壞數字', () => {
    const p = pricesOf({ price: 'NT$3,800 / NT$2,800' })
    assert.deepEqual(p.tiers.map(t => t.amount), [3800, 2800])
  })

  test('直線與全形直線也能當分隔', () => {
    assert.equal(pricesOf({ price: '1800|2800' }).tiers.length, 2)
    assert.equal(pricesOf({ price: '1800｜2800' }).tiers.length, 2)
  })

  test('沒填回 null（畫面靠這個決定不出現）', () => {
    assert.equal(pricesOf({}), null)
    assert.equal(pricesOf({ price: '   ' }), null)
  })

  test('票價歷史只收有票價又有年份的，並依日期排', () => {
    const h = priceHistory([
      { year: 2026, startDate: '2026-04-12', price: '3800' },
      { year: 2018, startDate: '2018-02-03', price: '800' },
      { year: 2020, startDate: '2020-01-01' },           // 沒票價
      { price: '1000' },                                  // 沒年份
    ])
    assert.deepEqual(h.map(x => x.price.high), [800, 3800])
  })
})

describe('周邊', () => {
  test('名稱與價格分得開', () => {
    const g = goodsOf({ goods: L('場刊 400', '毛巾 1200') })
    assert.deepEqual(g.map(x => [x.name, x.price]), [['場刊', 400], ['毛巾', 1200]])
  })

  test('沒有價格就是 null，名字保持完整', () => {
    const g = goodsOf({ goods: '未公開的神秘商品' })
    assert.equal(g[0].name, '未公開的神秘商品')
    assert.equal(g[0].price, null)
  })

  test('台版限定會被標出來 —— 那是收藏圈真正在找的東西', () => {
    const g = goodsOf({ goods: L('台版限定壓克力立牌 800', '一般毛巾 1200') })
    assert.equal(g[0].taiwanOnly, true)
    assert.equal(g[1].taiwanOnly, false)
  })

  test('名字裡有數字不會被當成價格', () => {
    const g = goodsOf({ goods: 'Roselia 5th 場刊' })
    assert.equal(g[0].name, 'Roselia 5th 場刊')
    assert.equal(g[0].price, null, '只有結尾且前面有空白的數字才算價格')
  })
})

describe('主視覺', () => {
  test('繪師與網址分得開', () => {
    const kv = keyVisualOf({ keyVisual: '某某繪師 https://x.com/a/status/1' })
    assert.equal(kv.artist, '某某繪師')
    assert.equal(kv.url, 'https://x.com/a/status/1')
  })

  test('只有名字也可以', () => {
    assert.deepEqual(keyVisualOf({ keyVisual: '某某繪師' }), { artist: '某某繪師', url: '' })
  })

  test('「繪師」這個表頭也讀得到', () => {
    assert.equal(keyVisualOf({ extras: { 繪師: '某某' } }).artist, '某某')
  })

  test('沒填回 null', () => {
    assert.equal(keyVisualOf({}), null)
  })
})

describe('hasArchive', () => {
  test('四樣有任一樣就算有', () => {
    assert.equal(hasArchive({ setlist: '1. A' }), true)
    assert.equal(hasArchive({ price: '1800' }), true)
    assert.equal(hasArchive({ goods: '場刊 400' }), true)
    assert.equal(hasArchive({ keyVisual: '某某' }), true)
  })
  test('都沒有就是沒有 —— 整塊不出現靠這個判斷', () => {
    assert.equal(hasArchive({ title: '只有標題' }), false)
  })
})

// Sheet 的格子裡按 Alt+Enter 就能換行，匯出成 CSV 時整格會被雙引號包起來。
// 整個歌單功能都靠這個 round trip —— 解析器哪天不吃多行，曲目會整批變成
// 一行擠在一起，而且畫面上看起來只是「這場只有一首歌」，不會報錯。
describe('Sheet 的多行格子', () => {
  test('曲目寫在一格裡的多行，解析後還是多行', async () => {
    const { parseCsvToEvents } = await import('../src/utils/parseEvents.js')
    const nl = String.fromCharCode(10)
    const csv = [
      'ID,編號,活動名稱,曲目,票價',
      `43,43,DAY2,"1. STAR BEAT!${nl}2. Returns${nl}安可${nl}キズナミュージック",搖滾區 3800 / 座位區 2800`,
    ].join(nl)

    const [e] = parseCsvToEvents(csv)
    assert.equal(e.setlist.split(nl).length, 4)
    assert.equal(e.price, '搖滾區 3800 / 座位區 2800')

    const songs = setlistOf(e)
    assert.deepEqual(songs.map(s => s.title),
      ['STAR BEAT!', 'Returns', 'キズナミュージック'])
    assert.equal(songs[2].encore, true, '「安可」那一行要把後面的標成安可')
  })

  test('格子裡的雙引號用兩個雙引號跳脫，不會把整列打斷', async () => {
    const { parseCsvToEvents } = await import('../src/utils/parseEvents.js')
    const csv = 'ID,編號,活動名稱,曲目\n1,1,X,"1. 歌名裡有""引號""\n2. B"'
    const [e] = parseCsvToEvents(csv)
    assert.equal(setlistOf(e).length, 2)
    assert.match(e.setlist, /「?歌名裡有"引號"/)
  })
})
