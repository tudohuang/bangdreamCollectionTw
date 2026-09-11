import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCsvToEvents, reconcileStableIds, sheetHasIdColumn } from '../src/utils/parseEvents.js'

// 永久鍵對位：Sheet 沒有 ID 欄、中間插一列的時候，後面的場次不能整批換鍵。
// 這是 2026-09 真的踩到的：第 54 列插了一場，#55 就顯示 #54 的封面。

const HEADER = '年份,開始日期,結束日期,活動名稱,類型'
const row = (y, d, title) => `${y},${d},${d},${title},LIVE`

const bundled = [
  { stableId: 53, number: 53, id: 'evt-053', title: '林鼓子粉絲見面會 台北', startDate: '2026-09-27' },
  { stableId: 54, number: 54, id: 'evt-054', title: 'TSUMUGI RISA FAN MEETING 2026 in TAIPEI', startDate: '2026-10-17' },
  { stableId: 55, number: 55, id: 'evt-055', title: 'Ayasa首次臺北見面會', startDate: '2026-10-31' },
]

test('sheetHasIdColumn 只認 ID／id 表頭', () => {
  assert.equal(sheetHasIdColumn(HEADER), false)
  assert.equal(sheetHasIdColumn('ID,' + HEADER), true)
  assert.equal(sheetHasIdColumn('編號,' + HEADER), false)
})

test('中間插一列：舊的場次沿用原本的永久鍵，新的接在最後', () => {
  const csv = [
    HEADER,
    row(2026, '2026-09-27', '林鼓子粉絲見面會 台北'),
    row(2026, '2026-10-10', 'IEGP Special音樂祭 in Taipei'),           // 新插進來的
    row(2026, '2026-10-17', 'TSUMUGI RISA FAN MEETING 2026 in TAIPEI'),
    row(2026, '2026-10-31', 'Ayasa首次臺北見面會'),
  ].join('\n')
  const out = reconcileStableIds(parseCsvToEvents(csv), bundled, { hasIdColumn: false })
  assert.deepEqual(out.map(e => [e.number, e.stableId, e.id]), [
    [1, 53, 'evt-053'],
    [2, 56, 'evt-056'],     // 新場次：最大永久鍵 + 1
    [3, 54, 'evt-054'],
    [4, 55, 'evt-055'],
  ])
})

test('標題相同但日期改了，內建只有一場同名 → 仍然接得回來', () => {
  const csv = [HEADER, row(2026, '2026-11-01', 'Ayasa首次臺北見面會')].join('\n')
  const [e] = reconcileStableIds(parseCsvToEvents(csv), bundled)
  assert.equal(e.stableId, 55)
})

test('同名兩場（Bushiroad EXPO 兩天）靠日期分，不會互相搶', () => {
  const two = [
    { stableId: 30, number: 30, title: 'Bushiroad EXPO 2024', startDate: '2024-06-01' },
    { stableId: 31, number: 31, title: 'Bushiroad EXPO 2024', startDate: '2024-06-02' },
  ]
  const csv = [HEADER,
    row(2024, '2024-06-02', 'Bushiroad EXPO 2024'),
    row(2024, '2024-06-01', 'Bushiroad EXPO 2024'),
  ].join('\n')
  const out = reconcileStableIds(parseCsvToEvents(csv), two)
  assert.deepEqual(out.map(e => e.stableId), [31, 30])
})

test('標題比對不分全半形、空白、大小寫', () => {
  const csv = [HEADER, row(2026, '2026-10-17', 'tsumugi risa  fan meeting 2026 in taipei')].join('\n')
  const [e] = reconcileStableIds(parseCsvToEvents(csv), bundled)
  assert.equal(e.stableId, 54)
})

test('Sheet 有 ID 欄就完全尊重 Sheet', () => {
  const csv = ['ID,' + HEADER, '99,' + row(2026, '2026-10-17', 'TSUMUGI RISA FAN MEETING 2026 in TAIPEI')].join('\n')
  const parsed = parseCsvToEvents(csv)
  const [e] = reconcileStableIds(parsed, bundled, { hasIdColumn: sheetHasIdColumn(csv) })
  assert.equal(e.stableId, 99)
  assert.equal(e.id, 'evt-099')
})

test('沒有內建資料時原樣回傳', () => {
  const parsed = parseCsvToEvents([HEADER, row(2026, '2026-10-17', 'X')].join('\n'))
  assert.equal(reconcileStableIds(parsed, []), parsed)
})
