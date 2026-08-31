import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { parseSongsCsv, songMetaIndex, hasSongMeta } from '../src/utils/parseSongs.js'

const csv = (rows) => rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')

const HEAD = ['歌名', '樂團', '專輯', '發行', '作詞', '作曲', '編曲', '連結', '封面', '別名', '備註']
const one = (over = {}) => {
  const base = {
    歌名: '春日影', 樂團: 'MyGO!!!!!', 專輯: '迷跡波', 發行: '2023-9-27',
    作詞: '藤原優樹', 作曲: '藤永龍太郎', 編曲: '', 連結: '', 封面: '', 別名: '', 備註: '',
    ...over,
  }
  return csv([HEAD, HEAD.map(h => base[h] ?? '')])
}

describe('歌曲分頁解析', () => {
  test('基本欄位', () => {
    const [s] = parseSongsCsv(one())
    assert.equal(s.title, '春日影')
    assert.equal(s.band, 'MyGO!!!!!')
    assert.equal(s.album, '迷跡波')
    assert.equal(s.lyricist, '藤原優樹')
  })

  test('日期補零 —— Sheet 上手打常常是 2023-9-27', () => {
    assert.equal(parseSongsCsv(one())[0].released, '2023-09-27')
  })

  test('看不懂的日期原樣留著，不要吞掉', () => {
    // 「2023年秋」也是資訊，硬要正規化只會把它變成空字串
    assert.equal(parseSongsCsv(one({ 發行: '2023年秋' }))[0].released, '2023年秋')
  })

  test('連結欄可以放好幾條，分隔符隨便打', () => {
    const [s] = parseSongsCsv(one({
      連結: 'https://a.test/x https://b.test/y、https://c.test/z',
    }))
    assert.deepEqual(s.links, ['https://a.test/x', 'https://b.test/y', 'https://c.test/z'])
  })

  test('連結欄裡不是網址的字被丟掉', () => {
    // 「待補」變成一個點不進去的按鈕，比沒有那顆按鈕還糟
    assert.deepEqual(parseSongsCsv(one({ 連結: '待補 https://a.test/x 之後再找' }))[0].links,
      ['https://a.test/x'])
  })

  test('封面必須是網址', () => {
    assert.equal(parseSongsCsv(one({ 封面: '有' }))[0].cover, '')
    assert.equal(parseSongsCsv(one({ 封面: 'https://i.test/a.jpg' }))[0].cover, 'https://i.test/a.jpg')
  })

  test('歌名那欄找不到就整張放棄', () => {
    // 硬解只會產出一堆對不到任何一首的空殼
    assert.deepEqual(parseSongsCsv(csv([['樂團', '專輯'], ['MyGO!!!!!', '迷跡波']])), [])
  })

  test('空表、只有表頭、亂七八糟的輸入都回空陣列', () => {
    for (const bad of ['', '歌名', csv([HEAD])]) {
      assert.deepEqual(parseSongsCsv(bad), [])
    }
  })

  test('同一首重複填就用第一列', () => {
    const two = csv([HEAD,
      HEAD.map(h => (h === '歌名' ? '春日影' : h === '專輯' ? '第一次' : '')),
      HEAD.map(h => (h === '歌名' ? '春日影' : h === '專輯' ? '第二次' : '')),
    ])
    const out = parseSongsCsv(two)
    assert.equal(out.length, 1)
    assert.equal(out[0].album, '第一次')
  })
})

describe('歌曲索引', () => {
  test('用正規化後的 key 對位 —— Sheet 不用手動統一寫法', () => {
    const idx = songMetaIndex(parseSongsCsv(one({ 歌名: '春日影（MyGO!!!!! ver.）' })))
    assert.ok(idx.get('春日影'), '括號版本註記應該被吃掉')
  })

  test('別名也查得到', () => {
    const idx = songMetaIndex(parseSongsCsv(one({ 歌名: '春日影', 別名: 'Haruhikage、はるひかげ' })))
    assert.equal(idx.get('haruhikage')?.title, '春日影')
  })

  test('別名不會蓋掉真的有一列的歌', () => {
    const rows = csv([HEAD,
      HEAD.map(h => (h === '歌名' ? '迷跡波' : h === '專輯' ? '本尊' : '')),
      HEAD.map(h => (h === '歌名' ? '春日影' : h === '別名' ? '迷跡波' : '')),
    ])
    const idx = songMetaIndex(parseSongsCsv(rows))
    assert.equal(idx.get('迷跡波').album, '本尊')
  })
})

describe('有沒有東西可以顯示', () => {
  test('只填了歌名不算有資料 —— 不該長出一塊空白區域', () => {
    assert.equal(hasSongMeta(parseSongsCsv(csv([['歌名'], ['春日影']]))[0]), false)
  })

  test('任何一欄有東西就算', () => {
    assert.equal(hasSongMeta(parseSongsCsv(one())[0]), true)
    assert.equal(hasSongMeta(parseSongsCsv(csv([['歌名', '連結'], ['春日影', 'https://a.test/x']]))[0]), true)
  })

  test('沒有這首歌的時候不會爆', () => {
    assert.equal(hasSongMeta(undefined), false)
    assert.equal(hasSongMeta(null), false)
  })
})

describe('空白表與解析器不會漂移', () => {
  test('npm run template 產的每一欄，解析器都認得', async () => {
    // 兩邊各寫一份表頭的話，改名之後貼進 Sheet 每一欄都會靜靜讀不到 ——
    // 畫面正常、沒有錯誤、就是沒資料。所以表頭只有一份，這裡釘住它真的通。
    const { SONG_COLUMNS } = await import('../src/utils/parseSongs.js')
    const value = (h) => (h === '封面' ? 'https://i.test/a.jpg'
      : h === '連結' ? 'https://a.test/x'
        : h === '發行' ? '2020-01-02' : `${h}的值`)
    const [s] = parseSongsCsv(csv([SONG_COLUMNS, SONG_COLUMNS.map(value)]))

    assert.equal(s.title, '歌名的值')
    assert.equal(s.band, '樂團的值')
    assert.equal(s.album, '專輯的值')
    assert.equal(s.released, '2020-01-02')
    assert.equal(s.lyricist, '作詞的值')
    assert.equal(s.composer, '作曲的值')
    assert.equal(s.arranger, '編曲的值')
    assert.deepEqual(s.links, ['https://a.test/x'])
    assert.equal(s.cover, 'https://i.test/a.jpg')
    assert.deepEqual(s.aliases, ['別名的值'])
    assert.equal(s.note, '備註的值')
  })

  test('欄序改了也還是讀得到 —— 靠表頭不靠位置', async () => {
    const { SONG_COLUMNS } = await import('../src/utils/parseSongs.js')
    const reversed = [...SONG_COLUMNS].reverse()
    const [s] = parseSongsCsv(csv([reversed, reversed.map(h => (h === '歌名' ? '春日影' : ''))]))
    assert.equal(s.title, '春日影')
  })
})
