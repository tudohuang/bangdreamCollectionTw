import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bandKey, parseGroup, rootGroup, isPersonal } from '../src/utils/bands.js'
import { parseCsvToEvents, mergeWithBundled } from '../src/utils/parseEvents.js'
import { normalizeImageUrl, photoCredit } from '../src/utils/media.js'
import { eventStatus, daysUntil, weekday } from '../src/utils/datetime.js'
import { detectCity, eventCharacters, buildRoster } from '../src/utils/derive.js'
import { matchSearch } from '../src/utils/search.js'
import { eventCoords, venuePoints, splitByProximity, relaxMarkers } from '../src/utils/geo.js'
import { project, makeTileView, tilesFor } from '../src/utils/tiles.js'
import { pickTier, passStats } from '../src/utils/passImage.js'
import { yearGaps, bandsWithoutCore, peopleFrequency, siteInsights } from '../src/utils/insights.js'
import { milestoneMap } from '../src/utils/milestones.js'
import { buildIcs, eventToVevent } from '../src/utils/ics.js'
import { formatDateRangeCompact } from '../src/utils/share.js'
import { sortChrono, eventContext, typeTags, agoLabel, daysBetween } from '../src/utils/context.js'

test('bandKey 對應主要樂團', () => {
  assert.equal(bandKey("Poppin'Party"), 'ppp')
  assert.equal(bandKey('Roselia／湊友希那'), 'roselia')
  assert.equal(bandKey('Ave Mujica／sumimi／純田真奈'), 'ave')
  assert.equal(bandKey('不存在的團'), 'other')
})

test('parseGroup 拆樂團與角色', () => {
  assert.deepEqual(parseGroup('Roselia／湊友希那'), { band: 'Roselia', parts: ['湊友希那'] })
  assert.deepEqual(parseGroup('Ave Mujica／sumimi／純田真奈'), { band: 'Ave Mujica', parts: ['sumimi', '純田真奈'] })
  assert.equal(rootGroup('Pastel＊Palettes／白鷺千聖'), 'Pastel＊Palettes')
})

test('isPersonal 區分本體/擦邊', () => {
  assert.equal(isPersonal({ category: '擦邊' }), true)
  assert.equal(isPersonal({ category: '本體' }), false)
})

test('parseCsvToEvents 正規化 ASCII 斜線並拆清單', () => {
  const csv = '年份,開始日期,結束日期,月份,活動名稱,類型,人物,團體／關聯,本體／擦邊,全團,人次\n' +
    '2023,2023-07-29,2023-07-29,7,測試,FMT,加藤英美里,Afterglow/上原緋瑪麗,擦邊,否,1\n' +
    '2018,2018-08-18,2018-08-18,8,見面會,FMT,前島亞美、工藤晴香,"Pastel＊Palettes、Hello, Happy World!、Roselia",本體,否,4'
  const ev = parseCsvToEvents(csv)
  assert.equal(ev.length, 2)
  assert.equal(ev[0].relatedGroups[0], 'Afterglow／上原緋瑪麗') // ASCII / → 全形／
  assert.deepEqual(ev[1].people, ['前島亞美', '工藤晴香'])
  assert.deepEqual(ev[1].relatedGroups, ['Pastel＊Palettes', 'Hello, Happy World!', 'Roselia']) // 半形逗號不拆
})

test('parseCsvToEvents 用「編號」欄當穩定 key（插列不錯位）', () => {
  const csv = '編號,年份,活動名稱,本體／擦邊,備註\n' +
    '5,2023,第五場,本體,測試備註\n' +
    '2,2018,第二場,本體,'
  const ev = parseCsvToEvents(csv)
  assert.equal(ev[0].number, 5)
  assert.equal(ev[0].id, 'evt-005')
  assert.equal(ev[0].notes, '測試備註')
  assert.equal(ev[1].number, 2)
  assert.equal(ev[1].id, 'evt-002')
})

test('normalizeImageUrl 轉換 Drive / Dropbox 分享連結', () => {
  const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz12345'
  assert.equal(normalizeImageUrl(`https://drive.google.com/file/d/${id}/view?usp=sharing`),
    `https://drive.google.com/thumbnail?id=${id}&sz=w2000`)
  assert.equal(normalizeImageUrl(`https://drive.google.com/open?id=${id}`),
    `https://drive.google.com/thumbnail?id=${id}&sz=w2000`)
  assert.equal(normalizeImageUrl('https://www.dropbox.com/s/abc/pic.jpg?dl=0'),
    'https://dl.dropboxusercontent.com/s/abc/pic.jpg')
  assert.equal(normalizeImageUrl('https://i.imgur.com/x.jpg'), 'https://i.imgur.com/x.jpg')
})

test('mergeWithBundled 保留手動欄位', () => {
  const sheet = [{ number: 1, title: 'A', photos: [], venue: '' }]
  const bundled = [{ number: 1, title: 'old', photos: ['x.jpg'], impression: '讚' }]
  const m = mergeWithBundled(sheet, bundled)
  assert.deepEqual(m[0].photos, ['x.jpg'])
  assert.equal(m[0].impression, '讚')
  assert.equal(m[0].title, 'A') // 核心欄用 sheet
})

test('eventStatus 過去/即將', () => {
  assert.equal(eventStatus({ startDate: '2020-01-01', endDate: '2020-01-01' }, '2026-06-12'), 'past')
  assert.equal(eventStatus({ startDate: '2099-01-01', endDate: '2099-01-01' }, '2026-06-12'), 'upcoming')
  assert.equal(eventStatus({ startDate: '2026-06-10', endDate: '2026-06-15' }, '2026-06-12'), 'ongoing')
  assert.equal(eventStatus({ startDate: '2026-09-??' }, '2026-06-12'), 'unknown')
})

test('daysUntil 與 weekday', () => {
  assert.equal(daysUntil('2026-06-15', '2026-06-12'), 3)
  assert.equal(weekday('2026-06-12'), '週五')
})

test('detectCity / eventCharacters', () => {
  assert.equal(detectCity({ title: 'ANISAMA in TAIPEI', venue: '台北流行音樂中心' }), '台北')
  assert.deepEqual(eventCharacters({ relatedGroups: ['Roselia／湊友希那', 'MyGO!!!!!'] }), ['湊友希那'])
})

test('buildRoster 推測聲優角色', () => {
  const roster = buildRoster([{ people: ['上坂堇'], relatedGroups: ['Pastel＊Palettes／白鷺千聖'] }])
  assert.equal(roster['上坂堇'].char, '白鷺千聖')
})

test('matchSearch 別名容錯', () => {
  const e = { title: 'AIMI LIVE', people: ['愛美'], relatedGroups: ["Poppin'Party"] }
  assert.equal(matchSearch(e, 'aimi'), true)
  assert.equal(matchSearch(e, 'roselia'), false)
})

// ---------- 脈絡（第幾次 / 隔多久 / 同一天） ----------
const CTX_EVENTS = [
  { id: 'a', number: 1, year: 2023, startDate: '2023-01-01', type: 'FMT', people: ['愛美'], relatedGroups: ["Poppin'Party"], venue: 'TICC', organizer: 'X' },
  { id: 'b', number: 2, year: 2023, startDate: '2023-01-01', type: 'LIVE', people: ['上坂菫'], relatedGroups: ['Roselia／白鷺千聖'], venue: 'TICC', organizer: 'X' },
  { id: 'c', number: 3, year: 2024, startDate: '2024-03-15', type: 'EXPO／Talk／上映會', people: ['愛美', '大塚紗英'], relatedGroups: ["Poppin'Party"], venue: '世貿一館', organizer: 'Y' },
]

test('sortChrono 依日期排序、同日用編號決勝', () => {
  const out = sortChrono([CTX_EVENTS[2], CTX_EVENTS[1], CTX_EVENTS[0]]).map(e => e.id)
  assert.deepEqual(out, ['a', 'b', 'c'])
})

test('eventContext 算出樂團第幾次與距上次天數', () => {
  const ctx = eventContext(CTX_EVENTS[2], CTX_EVENTS, '2026-03-15')
  assert.equal(ctx.band, "Poppin'Party")
  assert.equal(ctx.bandNth, 2)
  assert.equal(ctx.bandTotal, 2)
  assert.equal(ctx.prevBandEvent.id, 'a')
  assert.equal(ctx.daysSinceLastBand, daysBetween('2023-01-01', '2024-03-15'))
  assert.equal(ctx.index, 2)
  assert.equal(ctx.total, 3)
  assert.equal(ctx.prevChrono.id, 'b')
  assert.equal(ctx.nextChrono, null)
  assert.equal(ctx.ago, '2 年前')
})

test('eventContext 標記聲優首次來台、場館與年度序位', () => {
  const ctx = eventContext(CTX_EVENTS[2], CTX_EVENTS)
  assert.deepEqual(ctx.people, [
    { name: '愛美', nth: 2, total: 2, isFirst: false },
    { name: '大塚紗英', nth: 1, total: 1, isFirst: true },
  ])
  assert.equal(ctx.venueNth, 1)
  assert.equal(ctx.venueTotal, 1)
  assert.equal(ctx.yearNth, 1)
  assert.equal(ctx.yearTotal, 1)
  assert.equal(ctx.organizerTotal, 1)
})

test('eventContext 抓出同一天的其他場次', () => {
  const ctx = eventContext(CTX_EVENTS[0], CTX_EVENTS)
  assert.deepEqual(ctx.sameDay.map(e => e.id), ['b'])
  assert.equal(ctx.daysSinceLastBand, null)
  assert.equal(ctx.prevChrono, null)
  assert.equal(ctx.venueNth, 1)
  assert.equal(ctx.venueTotal, 2)
})

test('typeTags 拆多重類型、agoLabel 只講過去', () => {
  assert.deepEqual(typeTags(CTX_EVENTS[2]), ['EXPO', 'Talk', '上映會'])
  assert.deepEqual(typeTags({ type: 'LIVE/FMT' }), ['LIVE', 'FMT'])
  assert.deepEqual(typeTags({}), [])
  assert.equal(agoLabel(400), '1 年前')
  assert.equal(agoLabel(45), '1 個月前')
  assert.equal(agoLabel(3), '3 天前')
  assert.equal(agoLabel(0), null)
  assert.equal(agoLabel(-5), null)
})

test('formatDateRangeCompact 同月只留日、跨月留月日', () => {
  assert.equal(formatDateRangeCompact('2026-08-01', '2026-08-02'), '2026.08.01 → 02')
  assert.equal(formatDateRangeCompact('2026-04-28', '2026-05-03'), '2026.04.28 → 05.03')
  assert.equal(formatDateRangeCompact('2025-12-30', '2026-01-02'), '2025.12.30 → 2026.01.02')
  assert.equal(formatDateRangeCompact('2026-08-01', '2026-08-01'), '2026.08.01')
  assert.equal(formatDateRangeCompact('2026-08-01', ''), '2026.08.01')
  assert.equal(formatDateRangeCompact('2026-??-??', ''), '2026-??-??')
  assert.equal(formatDateRangeCompact('', ''), '')
})

// ---------- 敘事觀點：空白年份 / 樂團出席 / 聲優分布 ----------
const INS_EVENTS = [
  { id: 'a', number: 1, year: 2018, startDate: '2018-02-03', category: '本體', people: ['愛美'], relatedGroups: ["Poppin'Party"], attendanceCount: 3 },
  { id: 'b', number: 2, year: 2019, startDate: '2019-01-21', category: '擦邊', people: ['相羽あいな'], relatedGroups: ['Roselia／今井莉莎'], attendanceCount: 1 },
  { id: 'c', number: 3, year: 2023, startDate: '2023-07-29', category: '本體', people: ['愛美', '大塚紗英'], relatedGroups: ["Poppin'Party"], attendanceCount: 5 },
]

test('yearGaps 找出中間完全沒場次的年份', () => {
  assert.deepEqual(yearGaps(INS_EVENTS), [{ after: 2019, before: 2023, from: 2020, to: 2022, length: 3 }])
  assert.deepEqual(yearGaps([INS_EVENTS[0]]), [])
})

test('bandsWithoutCore 抓出只有個人來過的團', () => {
  assert.deepEqual(bandsWithoutCore(INS_EVENTS), ['Roselia'])
})

test('peopleFrequency 統計人數與只來一次的人', () => {
  const pf = peopleFrequency(INS_EVENTS)
  assert.equal(pf.total, 3)
  assert.deepEqual(pf.once.sort(), ['大塚紗英', '相羽あいな'])
  assert.deepEqual(pf.top[0], { name: '愛美', count: 2 })
})

test('siteInsights 只產出講得出口的事實', () => {
  const texts = siteInsights(INS_EVENTS).map(i => i.text)
  assert.ok(texts.some(t => t.includes('2020–2022 連續 3 年')))
  assert.ok(texts.some(t => t.includes('只來過一次')))
  assert.ok(texts.some(t => t.includes('Roselia')))
  assert.deepEqual(siteInsights([]), [])
})

test('milestoneMap 標出開始、回歸、首場官方場次、最多人次', () => {
  const m = milestoneMap(INS_EVENTS)
  assert.deepEqual(m.get('a').map(x => x.key), ['first-ever', 'first-core'])
  const c = m.get('c').map(x => x.key)
  assert.ok(c.includes('comeback'))
  assert.ok(c.includes('long-gap'))
  assert.ok(c.includes('biggest'))
  assert.equal(m.get('c')[0].key, 'comeback')   // 依重要性排序
  assert.equal(m.get('b'), undefined)
})

// ---------- 行事曆 ----------
test('buildIcs 產出合法的全日事件，DTEND 是隔天', () => {
  const ics = buildIcs([{ id: 'evt-001', number: 1, title: '測試, 分號; 場', startDate: '2026-08-01', endDate: '2026-08-02', venue: 'MOONDOG', people: ['愛美'], relatedGroups: ['MyGO!!!!!'] }], '20260805T000000Z')
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'))
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260801'))
  assert.ok(ics.includes('DTEND;VALUE=DATE:20260803'))     // 結束日 +1（不含）
  assert.ok(ics.includes(String.raw`SUMMARY:測試\, 分號\; 場`))   // 逗號分號要跳脫
  assert.ok(ics.includes('LOCATION:MOONDOG'))
  assert.ok(ics.trimEnd().endsWith('END:VCALENDAR'))
})

test('eventToVevent 遇到沒有合法日期就回 null', () => {
  assert.equal(eventToVevent({ id: 'x', startDate: '2026-??-??' }, '20260805T000000Z'), null)
  assert.equal(eventToVevent({ id: 'x' }, '20260805T000000Z'), null)
})

test('photoCredit 認得多種來源欄名，並判斷是否為網址', () => {
  assert.deepEqual(photoCredit({ extras: { '照片來源': '官方網站' } }),
    { label: '照片來源', value: '官方網站', isUrl: false })
  assert.equal(photoCredit({ extras: { '攝影': 'https://bang-dream.com/x' } }).isUrl, true)
  assert.equal(photoCredit({ extras: { '照片來源': '   ' } }), null)   // 空白視同沒填
  assert.equal(photoCredit({ extras: { '其他欄': '值' } }), null)
  assert.equal(photoCredit({}), null)
  assert.equal(photoCredit(null), null)
  // 多欄同時有值時，依 PHOTO_CREDIT_KEYS 的順序取第一個
  assert.equal(photoCredit({ extras: { '攝影': 'A', '照片來源': 'B' } }).value, 'B')
})

test('detectCity 用場館對照表補上名字裡沒有城市的場館', () => {
  // Sheet 的「城市」欄永遠優先
  assert.equal(detectCity({ venue: 'MOONDOG', city: '臺中' }), '台中')
  // 名字裡直接有城市
  assert.equal(detectCity({ venue: '台北世貿一館' }), '台北')
  assert.equal(detectCity({ venue: '新光三越高雄左營店 10F 舞台區' }), '高雄')
  // 名字裡沒有城市，靠對照表
  assert.equal(detectCity({ venue: 'MOONDOG' }), '台北')
  assert.equal(detectCity({ venue: '南港展覽館一館' }), '台北')
  assert.equal(detectCity({ venue: 'TICC' }), '台北')
  // 「新北」不能被 Taipei 通則吃掉
  assert.equal(detectCity({ venue: 'Zepp New Taipei' }), '新北')
  // 國體大正式地址在桃園
  assert.equal(detectCity({ venue: '國立體育大學綜合體育館／林口體育館' }), '桃園')
  // 真的不知道就留白，不要亂猜
  assert.equal(detectCity({ venue: 'WESTAR' }), '')
})

// ---------- 場館座標 ----------
test('eventCoords 吃「座標」單欄與 緯度/經度 兩欄，範圍外視為填錯', () => {
  assert.deepEqual(eventCoords({ extras: { '座標': '25.033964, 121.564468' } }), { lat: 25.033964, lng: 121.564468 })
  assert.deepEqual(eventCoords({ extras: { '座標': '25.0339 121.5644' } }), { lat: 25.0339, lng: 121.5644 })
  assert.deepEqual(eventCoords({ extras: { '緯度': '22.6823', '經度': '120.3073' } }), { lat: 22.6823, lng: 120.3073 })
  assert.equal(eventCoords({ extras: { '座標': '121.5644, 25.0339' } }), null)  // 經緯顛倒 → 落在台灣外
  assert.equal(eventCoords({ extras: { '座標': '台北市信義區' } }), null)
  assert.equal(eventCoords({}), null)
})

test('venuePoints 依場館聚合，座標只要任一列有填就算', () => {
  const evs = [
    { venue: 'A館', year: 2024, relatedGroups: ["Poppin'Party"], extras: {} },
    { venue: 'A館', year: 2025, relatedGroups: ["Poppin'Party"], extras: { '座標': '25.03, 121.56' } },
    { venue: 'B館', year: 2025, relatedGroups: ['Roselia'], extras: {} },
  ]
  const pts = venuePoints(evs)
  const a = pts.find(p => p.venue === 'A館')
  assert.equal(a.count, 2)
  assert.equal(a.lat, 25.03)
  assert.equal(a.span, '2024–2025')
  assert.equal(a.topBand, "Poppin'Party")
  assert.equal(pts.find(p => p.venue === 'B館').lat, null)
})

test('splitByProximity 把遠離主群的場館分出去', () => {
  const pts = [
    { venue: '台北A', lat: 25.03, lng: 121.56 },
    { venue: '台北B', lat: 25.05, lng: 121.61 },
    { venue: '桃園', lat: 24.97, lng: 121.30 },
    { venue: '高雄', lat: 22.68, lng: 120.30 },
  ]
  const { near, far } = splitByProximity(pts)
  assert.deepEqual(near.map(p => p.venue), ['台北A', '台北B', '桃園'])
  assert.deepEqual(far.map(p => p.venue), ['高雄'])
  // 點太少就不分，免得只剩一個點沒東西可畫
  assert.deepEqual(splitByProximity(pts.slice(0, 2)).far, [])
})

test('relaxMarkers 把重疊的旗子推開，且不動真實落點', () => {
  // 三個幾乎同一點的場館（西門那種狀況）
  const nodes = [
    { id: 'a', x: 500, y: 300, w: 50, h: 26 },
    { id: 'b', x: 505, y: 302, w: 50, h: 26 },
    { id: 'c', x: 500, y: 300, w: 50, h: 26 },
  ]
  const out = relaxMarkers(nodes)
  // 真實座標原封不動
  assert.deepEqual(out.map(n => [n.x, n.y]), [[500, 300], [505, 302], [500, 300]])
  // 兩兩之間不再重疊
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i], b = out[j]
      const apart = Math.abs(b.fx - a.fx) >= (a.w + b.w) / 2 - 1 ||
                    Math.abs(b.fy - a.fy) >= (a.h + b.h) / 2 - 1
      assert.ok(apart, `${a.id} 與 ${b.id} 仍重疊`)
    }
  }
  // 同輸入同輸出（沒有隨機）
  assert.deepEqual(relaxMarkers(nodes), out)
})

test('relaxMarkers 遵守畫布邊界', () => {
  const out = relaxMarkers(
    [{ x: 5, y: 5, w: 60, h: 26 }, { x: 8, y: 6, w: 60, h: 26 }],
    { bounds: { minX: 0, minY: 0, maxX: 400, maxY: 200 } })
  for (const n of out) {
    assert.ok(n.fx - n.w / 2 >= -0.01 && n.fx + n.w / 2 <= 400.01)
    assert.ok(n.fy - n.h / 2 >= -0.01 && n.fy + n.h / 2 <= 200.01)
  }
})

// ---------- 地圖圖磚（Web Mercator） ----------
test('project 的 Web Mercator 換算對得上已知值', () => {
  // z=0 時整個世界是一張 256px 圖磚，(0,0) 在正中央
  const o = project(0, 0, 0)
  assert.ok(Math.abs(o.x - 128) < 1e-6)
  assert.ok(Math.abs(o.y - 128) < 1e-6)
  // 經度 +180 在最右邊
  assert.ok(Math.abs(project(0, 180, 0).x - 256) < 1e-6)
  // 台北在北半球東側 → x 大於一半、y 小於一半
  const t = project(25.033, 121.5645, 0)
  assert.ok(t.x > 128 && t.y < 128)
  // 每加一級縮放，座標翻倍
  const a = project(25.033, 121.5645, 10), b = project(25.033, 121.5645, 11)
  assert.ok(Math.abs(b.x - a.x * 2) < 1e-6)
})

test('makeTileView 把點置中，fitZoom 讓所有點塞得下', () => {
  const pts = [{ lat: 25.033, lng: 121.5645 }, { lat: 25.0555, lng: 121.6171 }]
  const view = makeTileView(pts, 1000, 560)
  const xs = pts.map(p => view.project(p).x)
  const ys = pts.map(p => view.project(p).y)
  for (const x of xs) assert.ok(x > 0 && x < 1000)
  for (const y of ys) assert.ok(y > 0 && y < 560)
  // 中心點落在畫布正中
  assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - 500) < 1)
  assert.ok(Math.abs((Math.min(...ys) + Math.max(...ys)) / 2 - 280) < 1)
})

test('tilesFor 蓋滿畫布且圖磚索引不會超出世界範圍', () => {
  const view = makeTileView([{ lat: 25.033, lng: 121.5645 }, { lat: 25.0555, lng: 121.6171 }], 1000, 560)
  const tiles = tilesFor(view)
  assert.ok(tiles.length > 0)
  const n = Math.pow(2, view.z)
  for (const t of tiles) {
    const [z, x, y] = t.key.split('/').map(Number)
    assert.equal(z, view.z)
    assert.ok(x >= 0 && x < n, `圖磚 x 超出範圍：${x}`)
    assert.ok(y >= 0 && y < n, `圖磚 y 超出範圍：${y}`)
    assert.ok(t.url.startsWith('https://tile.openstreetmap.org/'))
  }
  // 左上角一定要被蓋到
  assert.ok(tiles.some(t => t.x <= 0 && t.y <= 0))
})

// ---------- 季票分級 ----------
test('pickTier 依走過的比例升級', () => {
  assert.equal(pickTier(0).key, 'paper')
  assert.equal(pickTier(14).key, 'paper')
  assert.equal(pickTier(15).key, 'silver')
  assert.equal(pickTier(34).key, 'silver')
  assert.equal(pickTier(35).key, 'gold')
  assert.equal(pickTier(59).key, 'gold')
  assert.equal(pickTier(60).key, 'black')
  assert.equal(pickTier(100).key, 'black')
})

test('passStats 算出團數、單年最多、最長連續年數', () => {
  const evs = [
    { id: 'a', number: 1, year: 2018, startDate: '2018-01-01', relatedGroups: ["Poppin'Party"], people: ['愛美'] },
    { id: 'b', number: 2, year: 2019, startDate: '2019-01-01', relatedGroups: ['Roselia'], people: ['愛美'] },
    { id: 'c', number: 3, year: 2020, startDate: '2020-01-01', relatedGroups: ['Roselia'], people: ['上坂菫'] },
    { id: 'd', number: 4, year: 2020, startDate: '2020-06-01', relatedGroups: ['Roselia'], people: [] },
    { id: 'e', number: 5, year: 2025, startDate: '2025-01-01', relatedGroups: ['MyGO!!!!!'], people: [] },
    { id: 'f', number: 6, year: 2026, startDate: '2026-01-01', relatedGroups: ['MyGO!!!!!'], people: [] },
  ]
  const s = passStats(evs, new Set(['a', 'b', 'c', 'd']))
  assert.equal(s.total, 4)
  assert.equal(s.all, 6)
  assert.equal(s.percent, 67)
  assert.equal(s.tier.key, 'black')          // 67% → 黑卡
  assert.equal(s.bandCount, 2)               // Poppin'Party + Roselia
  assert.deepEqual(s.bestYear, { year: 2020, count: 2 })
  assert.equal(s.streak, 3)                  // 2018→2019→2020
  assert.equal(s.topBand.name, 'Roselia')
  assert.equal(s.topPerson.name, '愛美')
  assert.equal(s.first.id, 'a')
  assert.equal(s.last.id, 'd')
})

test('passStats 對空收藏不會炸', () => {
  const s = passStats([{ id: 'a', number: 1, year: 2020, startDate: '2020-01-01', relatedGroups: [] }], new Set())
  assert.equal(s.total, 0)
  assert.equal(s.percent, 0)
  assert.equal(s.streak, 0)
  assert.equal(s.first, null)
})
