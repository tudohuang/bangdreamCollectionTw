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

describe('曲目能標的三件事', () => {
  const nl = String.fromCharCode(10)
  const ev2 = (id, startDate, setlist, groups) =>
    ({ id, startDate, endDate: startDate, setlist, people: [], relatedGroups: groups })

  test('MC 與影片不是歌，不進統計但留在曲目裡', async () => {
    const { setlistOf, songsOf } = await import('../src/utils/archive.js')
    const e = ev2('a', '2026-01-01', ['1. A', 'MC', '影片', '2. B'].join(nl), ['Roselia'])
    assert.equal(setlistOf(e).length, 4, '四行都留著')
    assert.equal(songsOf(e).length, 2, '只有兩首是歌')
    assert.deepEqual(setlistOf(e).map(s => s.isSong), [true, false, false, true])
  })

  test('編號跳過非歌曲 —— MC 不佔一個號碼', async () => {
    const { setlistOf } = await import('../src/utils/archive.js')
    const e = ev2('a', '2026-01-01', ['1. A', 'MC', '2. B'].join(nl), ['Roselia'])
    assert.deepEqual(setlistOf(e).map(s => s.n), [1, null, 2])
  })

  test('單團場不用標團，自動帶上', async () => {
    const { songsOf } = await import('../src/utils/archive.js')
    const e = ev2('a', '2026-01-01', ['1. A', '2. B'].join(nl), ['Roselia'])
    assert.deepEqual(songsOf(e).map(s => s.band), ['Roselia', 'Roselia'])
  })

  test('雙團場沒標就留空 —— 猜錯會變成顯示出來的假事實', async () => {
    const { songsOf } = await import('../src/utils/archive.js')
    const e = ev2('a', '2026-01-01', ['1. 春日影'].join(nl), ['MyGO!!!!!', 'Ave Mujica'])
    assert.equal(songsOf(e)[0].band, '', '兩團以上不猜')
  })

  test('團名有空白也拆得開（Ave Mujica、RAISE A SUILEN）', async () => {
    const { songsOf } = await import('../src/utils/archive.js')
    const e = ev2('a', '2026-01-01',
      ['1. KiLLKiSS／Ave Mujica', '2. Hell! or Hell?／RAISE A SUILEN'].join(nl),
      ['MyGO!!!!!', 'Ave Mujica'])
    assert.deepEqual(songsOf(e).map(s => [s.title, s.band]),
      [['KiLLKiSS', 'Ave Mujica'], ['Hell! or Hell?', 'RAISE A SUILEN']])
  })

  test('歌名裡有斜線但後面不是樂團，就不拆 —— 寧可不標也不要把歌名切斷', async () => {
    const { songsOf } = await import('../src/utils/archive.js')
    const e = ev2('a', '2026-01-01', '1. 歌名裡有／斜線的歌', ['Roselia'])
    assert.equal(songsOf(e)[0].title, '歌名裡有／斜線的歌')
  })

  test('開場與收尾：安可段落不算開場，收尾是最後一首歌', async () => {
    const { songsOf } = await import('../src/utils/archive.js')
    const e = ev2('a', '2026-01-01', ['1. A', '2. B', '安可', 'C'].join(nl), ['Roselia'])
    const s = songsOf(e)
    assert.equal(s[0].opener, true)
    assert.ok(!s[2].opener, '安可第一首不是開場')
    assert.equal(s[2].closer, true)
  })

  test('第二次安可（W安可 / EN2）算得出是第幾輪', async () => {
    const { songsOf } = await import('../src/utils/archive.js')
    const e = ev2('a', '2026-01-01', ['1. A', '安可', 'B', 'W安可', 'C'].join(nl), ['Roselia'])
    assert.deepEqual(songsOf(e).map(s => s.encoreRound), [0, 1, 2])
  })
})

describe('算得出來的東西（不用多打字）', () => {
  const nl = String.fromCharCode(10)
  const ev2 = (id, startDate, setlist, groups = ['Roselia']) =>
    ({ id, startDate, endDate: startDate, setlist, people: [], relatedGroups: groups })

  test('台灣首唱＝全站最早唱這首的那一場', async () => {
    const { setlistWithFirsts } = await import('../src/utils/songs.js')
    const a = ev2('a', '2024-01-01', '1. X')
    const b = ev2('b', '2025-01-01', ['1. X', '2. Y'].join(nl))
    assert.deepEqual(setlistWithFirsts(a, [a, b]).map(s => s.firstInTw), [true])
    assert.deepEqual(setlistWithFirsts(b, [a, b]).map(s => [s.title, s.firstInTw]),
      [['X', false], ['Y', true]])
  })

  test('每場幾首、最常開場', async () => {
    const { setlistStats } = await import('../src/utils/songs.js')
    const s = setlistStats([
      ev2('a', '2024-01-01', ['1. X', '2. Y'].join(nl)),
      ev2('b', '2025-01-01', ['1. X', '2. Y', '3. Z'].join(nl)),
    ])
    assert.equal(s.shows, 2)
    assert.equal(s.avg, 2.5)
    assert.deepEqual(s.openers, [['X', 2]])
    assert.deepEqual(s.closers, [['Y', 1], ['Z', 1]])
  })

  test('沒有任何曲目時 setlistStats 回 null（畫面靠這個不出現）', async () => {
    const { setlistStats } = await import('../src/utils/songs.js')
    assert.equal(setlistStats([ev2('a', '2024-01-01', '')]), null)
  })

  test('兩場的重疊度 —— 雙日公演才問得出來的問題', async () => {
    const { overlap } = await import('../src/utils/songs.js')
    const a = ev2('a', '2026-04-11', ['1. X', '2. Y', '3. Z'].join(nl))
    const b = ev2('b', '2026-04-12', ['1. X', '2. W'].join(nl))
    assert.deepEqual(overlap(a, b), { shared: 1, onlyA: 2, onlyB: 1, ratio: 50 })
  })

  test('其中一場沒曲目時重疊度回 null，不要算出 0% 誤導人', async () => {
    const { overlap } = await import('../src/utils/songs.js')
    assert.equal(overlap(ev2('a', '2026-01-01', '1. X'), ev2('b', '2026-01-02', '')), null)
  })
})
