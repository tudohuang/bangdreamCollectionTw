// 搜尋：正規化、羅馬字、假名、錯字容錯。
//
// 這支最容易「改好一個情境、弄壞三個」。四種打法（漢字／片假名／平假名／
// 羅馬字）都要通，而且容錯不能在有結果的時候插手 —— 那會讓好的查詢變差。
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { norm, searchHay, matchSearch, fuzzyMatch, searchEvents } from '../src/utils/search.js'
import { toRomaji, kataToHira } from '../src/utils/kana.js'

const ev = (o) => ({ people: [], relatedGroups: [], ...o })

describe('假名轉換', () => {
  test('片假名轉平假名', () => {
    assert.equal(kataToHira('アイバアイナ'), 'あいばあいな')
  })
  test('假名轉羅馬字，漢字原樣留著', () => {
    assert.equal(toRomaji('相羽あいな'), '相羽aina')
    assert.equal(toRomaji('アイバアイナ'), 'aibaaina')
  })
  test('拗音不會被拆開', () => {
    assert.equal(toRomaji('きゃりー'), 'kyarii')
    assert.equal(toRomaji('しょう'), 'shou')
  })
  test('促音把下一個子音重複一次', () => {
    assert.equal(toRomaji('きっぷ'), 'kippu')
  })
  test('長音符把前一個母音再寫一次', () => {
    assert.equal(toRomaji('ラーメン'), 'raamen')
  })
})

describe('正規化', () => {
  test('全形英數、大小寫、空白、標點都拉平', () => {
    const target = norm('TICC')
    for (const v of ['ＴＩＣＣ', 'ticc', 'T I C C', 't.i.c.c']) {
      assert.equal(norm(v), target, v)
    }
  })
  test('撇號的直彎兩種寫法要一樣', () => {
    assert.equal(norm("Poppin'Party"), norm('Poppin’Party'))
  })
})

describe('比對', () => {
  const aiba = ev({ title: '相羽あいな 見面會', people: ['相羽あいな'], venue: 'MOONDOG' })
  const aimi = ev({ title: '愛美 LIVE', people: ['愛美'], venue: '台北世貿一館' })

  test('四種打法都找得到同一個人', () => {
    for (const q of ['相羽', 'あいば', 'アイバ', 'aiba', 'aina']) {
      assert.equal(matchSearch(aiba, q), true, `「${q}」找不到`)
    }
  })

  test('漢字名字靠別名表找得到羅馬字', () => {
    assert.equal(matchSearch(aimi, 'aimi'), true)
  })

  test('樂團縮寫找得到', () => {
    const e = ev({ title: 'x', relatedGroups: ["Poppin'Party"] })
    for (const q of ['popipa', 'ポピパ', 'ppp', "poppin'party"]) {
      assert.equal(matchSearch(e, q), true, `「${q}」找不到`)
    }
  })

  test('空查詢everything通過 —— 篩選器靠這個', () => {
    assert.equal(matchSearch(aimi, ''), true)
    assert.equal(matchSearch(aimi, '   '), true)
  })

  test('不相干的字不會命中', () => {
    assert.equal(matchSearch(aimi, '完全不相干的東西'), false)
  })

  test('searchHay 不會因為缺欄位就爆', () => {
    assert.doesNotThrow(() => searchHay({}))
    assert.doesNotThrow(() => searchHay({ people: null, relatedGroups: undefined }))
  })
})

describe('錯字容錯', () => {
  const events = [
    ev({ id: 'a', title: '愛美 LIVE', people: ['愛美'], venue: '台北世貿一館' }),
    ev({ id: 'b', title: 'Roselia ASIA TOUR', relatedGroups: ['Roselia'], venue: 'TICC' }),
  ]

  test('打錯一個字還是找得到，而且會標記成容錯', () => {
    const r = searchEvents(events, '愛実')
    assert.equal(r.list.length, 1)
    assert.equal(r.fuzzy, true, '要標出來，不然使用者以為自己打對了')
  })

  test('打對的時候完全不啟動容錯', () => {
    const r = searchEvents(events, '愛美')
    assert.equal(r.fuzzy, false)
    assert.equal(r.list.length, 1, '不能把 Roselia 那筆也拉進來')
  })

  test('拉丁字母要四個字以上才容錯 —— 太短會亂命中', () => {
    assert.equal(fuzzyMatch(events[1], 'tic'), false)
    assert.equal(fuzzyMatch(events[1], 'rosalia'), true)
  })

  test('中日文兩個字就容錯 —— 兩個字已經是一個完整的詞', () => {
    assert.equal(fuzzyMatch(events[0], '愛実'), true)
  })

  test('差太多就是找不到，不要硬撈', () => {
    const r = searchEvents(events, 'zzzzzzzz')
    assert.equal(r.list.length, 0)
    assert.equal(r.fuzzy, false)
  })

  test('沒有查詢時原樣回傳，不做任何事', () => {
    const r = searchEvents(events, '')
    assert.equal(r.list, events, '應該回同一個陣列，不要多複製一份')
    assert.equal(r.fuzzy, false)
  })
})

describe('真實資料', () => {
  test('每個聲優都至少用自己的名字搜得到', async () => {
    const { default: events } = await import('../src/data/events.json', { with: { type: 'json' } })
    const people = [...new Set(events.flatMap(e => e.people || []))]
    const bad = people.filter(p => !searchEvents(events, p).list.length)
    assert.deepEqual(bad, [])
  })

  test('每個場館都搜得到', async () => {
    const { default: events } = await import('../src/data/events.json', { with: { type: 'json' } })
    const venues = [...new Set(events.map(e => e.venue).filter(Boolean))]
    const bad = venues.filter(v => !searchEvents(events, v).list.length)
    assert.deepEqual(bad, [])
  })
})
