import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { buildIcs, eventToVevent, ticketToVevent } from '../src/utils/ics.js'
import { coverSrcSet } from '../src/utils/cover.js'

const STAMP = '20260831T000000Z'
const future = (over = {}) => ({
  id: 'e47', number: 47, startDate: '2026-10-11',
  title: 'Kanon Shizaki Fan Meeting', venue: 'Legacy Taipei', ...over,
})
const past = (over = {}) => ({
  id: 'e01', number: 1, startDate: '2018-04-27', title: '很久以前那一場', ...over,
})

describe('行事曆提醒', () => {
  test('未來的場次會掛兩個提醒：一週前與前一天的早上九點', () => {
    const s = eventToVevent(future(), STAMP)
    assert.equal((s.match(/BEGIN:VALARM/g) || []).length, 2)
    // 全日事件的 DTSTART 是 00:00，所以 -15h 就是前一天早上九點
    assert.match(s, /TRIGGER:-P6DT15H/)
    assert.match(s, /TRIGGER:-PT15H/)
  })

  test('已經過去的場次不掛提醒', () => {
    // 觸發時間在過去本來就不會響，但有些行事曆匯入時會一起列出來，看起來像壞掉
    assert.doesNotMatch(eventToVevent(past(), STAMP), /VALARM/)
  })

  test('提醒文字帶得到活動名稱', () => {
    const s = eventToVevent(future(), STAMP)
    assert.match(s, /DESCRIPTION:明天：Kanon Shizaki Fan Meeting/)
  })

  test('每個 VALARM 都自己開自己關', () => {
    const s = eventToVevent(future(), STAMP)
    assert.equal((s.match(/BEGIN:VALARM/g) || []).length,
      (s.match(/END:VALARM/g) || []).length)
  })
})

describe('開賣日', () => {
  test('沒填開賣就不生成', () => {
    assert.equal(ticketToVevent(future(), STAMP), null)
  })

  test('填了開賣就自成一則，UID 不會撞到本體', () => {
    const e = future({ ticketDate: '2026-09-06', ticketUrl: 'https://ex.test/t' })
    const s = ticketToVevent(e, STAMP)
    assert.match(s, /UID:e47-ticket@/)
    assert.ok(!/UID:e47@/.test(s))
    assert.match(s, /DTSTART;VALUE=DATE:20260906/)
    assert.match(s, /DTEND;VALUE=DATE:20260907/)   // 全日事件的結束日不含當天
    assert.match(s, /SUMMARY:開賣：/)
    assert.match(s, /URL:https:\/\/ex\.test\/t/)
  })

  test('開賣提醒是前一天晚上與當天早上', () => {
    const s = ticketToVevent(future({ ticketDate: '2026-09-06' }), STAMP)
    assert.match(s, /TRIGGER:-PT4H/)
    assert.match(s, /TRIGGER:PT8H/)
  })

  test('日期格式不對就整則不要，不要生出壞檔案', () => {
    for (const bad of ['', '2026', '待公布', '2026-??-??', null]) {
      assert.equal(ticketToVevent(future({ ticketDate: bad }), STAMP), null)
    }
  })

  test('整份匯出時本體與開賣各一則', () => {
    const ics = buildIcs([future({ ticketDate: '2026-09-06' }), past()], STAMP)
    assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3)
    assert.equal((ics.match(/END:VEVENT/g) || []).length, 3)
  })

  test('UID 不重複 —— 重複會讓行事曆把兩則當成同一則', () => {
    const ics = buildIcs([future({ ticketDate: '2026-09-06' }), past()], STAMP)
    const uids = ics.match(/^UID:.*$/gm)
    assert.equal(new Set(uids).size, uids.length)
  })
})

describe('封面 srcset', () => {
  test('寬度描述子寫的是實際輸出寬，不是目標寬', () => {
    // 001 原圖 900 寬，產生器開了 withoutEnlargement，所以 lg 只有 900 不是 960。
    // 標成 960w 會讓瀏覽器以為挑到大圖，那比沒有 srcset 更糟。
    const s = coverSrcSet({ stableId: 1 }, 'avif')
    assert.match(s, /001-sm\.avif 420w/)
    assert.match(s, /001-lg\.avif 900w/)
  })

  test('原圖比 420 還小的時候只給一個候選', () => {
    // 040 原圖只有 201 寬，兩個尺寸縮出來像素一樣，給兩個候選只是讓瀏覽器亂選
    const s = coverSrcSet({ stableId: 40 }, 'jpg')
    assert.equal(s.split(',').length, 1)
    assert.match(s, /040-sm\.jpg 201w/)
  })

  test('沒有本地封面就不給 srcset', () => {
    assert.equal(coverSrcSet({ stableId: 999 }, 'avif'), undefined)
  })

  test('三種格式各自有自己的 srcset', () => {
    for (const ext of ['avif', 'webp', 'jpg']) {
      assert.match(coverSrcSet({ stableId: 1 }, ext), new RegExp(`\\.${ext} 420w`))
    }
  })
})

describe('加到行事曆的回話', () => {
  test('一場都沒有合法日期的時候不會假裝成功', async () => {
    const { addToCalendar } = await import('../src/utils/ics.js')
    const said = []
    await addToCalendar([{ id: 'x', title: '待定', startDate: '' }], 'x.ics', m => said.push(m))
    assert.deepEqual(said, ['這些場次都還沒有確定日期'])
  })

  test('單一場次與多場次的說法不一樣', async () => {
    const { addToCalendar } = await import('../src/utils/ics.js')
    const said = []
    await addToCalendar({ id: 'x', title: '待定', startDate: '' }, 'x.ics', m => said.push(m))
    assert.deepEqual(said, ['這場還沒有確定日期'])
  })
})
