// 場館巡禮的路線。飛錯站、合錯站，畫面會照樣很漂亮地騙人，所以規則要有測試。
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { tourStops, tourBands, tourSummary, stopFact, venuePillars, circleRing, bearingBetween, streetViewUrl } from '../src/utils/tour.js'

const ev = (id, startDate, venue, groups = ['Roselia'], coords = '') =>
  ({ id, startDate, endDate: startDate, venue, relatedGroups: groups, extras: coords ? { 座標: coords } : {} })

const TP = '25.0336, 121.5624'
const NG = '25.0567, 121.6181'

describe('tourStops', () => {
  test('照日期排，不照 Sheet 順序', () => {
    const s = tourStops([ev('b', '2024-05-01', '南港展覽館一館', undefined, NG), ev('a', '2023-01-01', '台北世貿一館', undefined, TP)])
    assert.deepEqual(s.map(x => x.events[0].id), ['a', 'b'])
  })

  test('連續同場館併成一站；中間隔了別處再回來是新的一站', () => {
    const s = tourStops([
      ev('1', '2023-01-01', '台北世貿一館', undefined, TP),
      ev('2', '2023-01-02', '世貿一館'),
      ev('3', '2023-06-01', '南港展覽館一館', undefined, NG),
      ev('4', '2024-01-01', '台北世貿一館'),
    ])
    assert.deepEqual(s.map(x => x.events.map(e => e.id)), [['1', '2'], ['3'], ['4']])
    assert.equal(s[0].to, '2023-01-02')
  })

  test('座標只要同場館任一列有填就算；完全沒座標的場館略過', () => {
    const s = tourStops([ev('1', '2023-01-01', '世貿一館'), ev('2', '2023-02-01', '台北世貿一館', undefined, TP), ev('3', '2023-03-01', '某個沒座標的地方')])
    assert.equal(s.length, 1)
    assert.equal(s[0].events.length, 2)
  })

  test('依團篩選，合演的兩團都算', () => {
    const evs = [
      ev('1', '2023-01-01', '台北世貿一館', ['MyGO!!!!!'], TP),
      ev('2', '2023-02-01', '南港展覽館一館', ['RAISE A SUILEN,Morfonica'], NG),
      ev('3', '2023-03-01', '台北世貿一館', ['Morfonica／二葉筑紫']),
    ]
    assert.deepEqual(tourStops(evs, { band: 'morfonica' }).flatMap(s => s.events.map(e => e.id)), ['2', '3'])
    assert.deepEqual(tourBands(evs).map(b => b.key).sort(), ['morfonica', 'mygo', 'ras'])
  })
})

test('光柱：同場館多站合成一根，場次越多越高', () => {
  const s = tourStops([
    ev('1', '2023-01-01', '台北世貿一館', undefined, TP),
    ev('2', '2023-06-01', '南港展覽館一館', undefined, NG),
    ev('3', '2024-01-01', '台北世貿一館'),
  ])
  const p = venuePillars(s)
  assert.equal(p.length, 2)
  const tp = p.find(x => x.name.includes('世貿'))
  assert.equal(tp.count, 2)
  assert.equal(tp.first, 0)
  assert.ok(tp.height > p.find(x => x !== tp).height)
})

test('圓柱多邊形是封閉的', () => {
  const r = circleRing(25, 121.5, 40, 16)
  assert.equal(r.length, 17)
  assert.deepEqual(r[0], r[16])
})

test('方位角：往北 0 度、往東約 90 度', () => {
  assert.ok(Math.abs(bearingBetween({ lat: 25, lng: 121 }, { lat: 25.1, lng: 121 })) < 0.01)
  assert.ok(Math.abs(bearingBetween({ lat: 25, lng: 121 }, { lat: 25, lng: 121.1 }) - 90) < 0.1)
})

test('街景連結是免 key 的 Google Maps URL', () => {
  assert.equal(streetViewUrl({ lat: 25.03, lng: 121.56 }),
    'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=25.03,121.56')
})

describe('每站一句話與結算', () => {
  const evs = [
    ev('1', '2023-01-01', '台北世貿一館', undefined, TP),
    ev('2', '2023-01-02', '南港展覽館一館', undefined, NG),
    ev('3', '2024-03-02', '台北世貿一館'),
    ev('4', '2024-03-02', '南港展覽館一館'),
  ]
  const s = tourStops(evs)

  test('第一站、第一次、回到這裡、隔多久', () => {
    assert.deepEqual(s.map(stopFact), [
      '一切從這裡開始',
      '第一次來這裡 · 隔天',
      '第 2 次回到這裡 · 隔了 1 年 2 個月',
      '第 2 次回到這裡 · 同一天',
    ])
  })

  test('結算：場館數、年數、累計公里、最常回去', () => {
    const sum = tourSummary(s)
    assert.equal(sum.venues, 2)
    assert.equal(sum.events, 4)
    assert.equal(sum.years, 2)
    assert.ok(sum.km > 15 && sum.km < 25, `三段世貿↔南港約 6 km，實際 ${sum.km}`)
    assert.equal(sum.top.n, 2)
    assert.equal(tourSummary([]), null)
  })

  test('只飛收藏過的場次', () => {
    const mine = tourStops(evs, { only: new Set(['1', '3']) })
    assert.deepEqual(mine.flatMap(x => x.events.map(e => e.id)), ['1', '3'])
    assert.equal(mine.length, 1, '收藏的兩場都在世貿，中間沒去別處，併成一站')
  })
})
