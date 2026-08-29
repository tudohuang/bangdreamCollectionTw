// 歌名正規化。
//
// 這支的工作跟場館那支一樣：判斷「兩個字串是不是同一首歌」。
// 答錯的代價很具體 —— 併太多會把不同的歌算成同一首（更糟），
// 併太少會讓「這首唱過幾次」永遠是 1（功能等於不存在）。
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { songKey, bestTitle, songIndex, findSong, songProfile, knownTitles } from '../src/utils/songs.js'

const ev = (id, startDate, setlist, people = []) =>
  ({ id, startDate, endDate: startDate, setlist, people, relatedGroups: [] })

describe('songKey', () => {
  test('副標與版本說明是同一首歌的補充', () => {
    assert.equal(songKey('STAR BEAT!〜ホシノコドウ〜'), songKey('STAR BEAT!'))
    assert.equal(songKey('Returns（Acoustic）'), songKey('Returns'))
  })

  test('全形半形、大小寫、空白、標點都拉平', () => {
    assert.equal(songKey('Ｙ.Ｏ.Ｌ.Ｏ！！！！！'), songKey('Y.O.L.O!!!!!'))
    assert.equal(songKey('キズナミュージック♪'), songKey('キズナミュージック'))
    assert.equal(songKey('  Returns  '), songKey('Returns'))
  })

  test('不同的歌不能被併在一起', () => {
    const distinct = ['STAR BEAT!', 'Returns', '天下トーイツ A to Z☆', 'キズナミュージック',
      'FIRE BIRD', 'BLACK SHOUT', '春日影', '迷星叫']
    const keys = distinct.map(songKey)
    assert.equal(new Set(keys).size, distinct.length, `有歌被誤併：${JSON.stringify(keys)}`)
  })

  test('不做前綴比對 —— 那會把不同的歌併掉', () => {
    // 「Returns」與「Returns to Zero」是兩首不同的歌
    assert.notEqual(songKey('Returns'), songKey('Returns to Zero'))
  })

  test('空的回空字串', () => {
    for (const v of ['', '   ', null, undefined]) assert.equal(songKey(v), '')
  })
})

describe('顯示用的歌名', () => {
  test('挑最完整的寫法（通常帶副標）', () => {
    assert.equal(bestTitle(['STAR BEAT!', 'STAR BEAT!〜ホシノコドウ〜']), 'STAR BEAT!〜ホシノコドウ〜')
  })
  test('空集合不要爆', () => {
    assert.equal(bestTitle([]), '')
  })
})

describe('索引', () => {
  const events = [
    ev('a', '2024-01-01', '1. STAR BEAT!\n2. Returns'),
    ev('b', '2025-01-01', '1. STAR BEAT!〜ホシノコドウ〜\n安可\nReturns'),
    ev('c', '2026-01-01', '1. 春日影'),
  ]

  test('不同寫法算成同一首', () => {
    const idx = songIndex(events)
    const star = idx.find(s => s.key === songKey('STAR BEAT!'))
    assert.equal(star.count, 2)
    assert.equal(star.titles.size, 2, '兩種寫法都要留著')
    assert.equal(star.title, 'STAR BEAT!〜ホシノコドウ〜', '顯示用挑完整的')
  })

  test('唱得多的排前面', () => {
    const idx = songIndex(events)
    assert.ok(idx[0].count >= idx[idx.length - 1].count)
  })

  test('同一場重複出現不會把自己數兩次', () => {
    const idx = songIndex([ev('a', '2024-01-01', '1. X\n安可\nX')])
    assert.equal(idx[0].count, 1, '安可再唱一次，還是只有一場唱過')
  })

  test('場次照時間排 —— 第一次／最近一次靠這個', () => {
    const star = songIndex(events).find(s => s.key === songKey('STAR BEAT!'))
    assert.deepEqual(star.events.map(e => e.id), ['a', 'b'])
  })

  test('沒有任何曲目資料時回空陣列', () => {
    assert.deepEqual(songIndex([ev('a', '2024-01-01', '')]), [])
  })
})

describe('一首歌的履歷', () => {
  const events = [
    ev('a', '2024-01-01', '1. STAR BEAT!', ['愛美']),
    ev('b', '2025-01-01', '1. STAR BEAT!〜ホシノコドウ〜', ['愛美', '大塚紗英']),
  ]

  test('第一次與最近一次', () => {
    const p = songProfile(events, 'STAR BEAT!')
    assert.equal(p.first.id, 'a')
    assert.equal(p.last.id, 'b')
    assert.equal(p.count, 2)
  })

  test('唱過的人依次數排', () => {
    const p = songProfile(events, 'STAR BEAT!')
    assert.deepEqual(p.people, [['愛美', 2], ['大塚紗英', 1]])
  })

  test('別的寫法列出來，不偷偷合併', () => {
    const p = songProfile(events, 'STAR BEAT!')
    assert.deepEqual(p.aliases, ['STAR BEAT!'])
  })

  test('用任一種寫法都找得到', () => {
    for (const t of ['STAR BEAT!', 'STAR BEAT!〜ホシノコドウ〜', 'star beat!']) {
      assert.ok(findSong(events, t), `「${t}」找不到`)
    }
  })

  test('找不到回 null', () => {
    assert.equal(findSong(events, '不存在的歌'), null)
    assert.equal(songProfile(events, ''), null)
  })
})

describe('自動完成用的清單', () => {
  test('回已經出現過的歌名與次數', () => {
    const list = knownTitles([
      ev('a', '2024-01-01', '1. A\n2. B'),
      ev('b', '2025-01-01', '1. A'),
    ])
    assert.deepEqual(list, [{ title: 'A', count: 2 }, { title: 'B', count: 1 }])
  })
})
