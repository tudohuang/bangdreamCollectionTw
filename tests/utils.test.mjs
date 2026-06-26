import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bandKey, parseGroup, rootGroup, isPersonal } from '../src/utils/bands.js'
import { parseCsvToEvents, mergeWithBundled } from '../src/utils/parseEvents.js'
import { normalizeImageUrl } from '../src/utils/media.js'
import { eventStatus, daysUntil, weekday } from '../src/utils/datetime.js'
import { detectCity, eventCharacters, buildRoster } from '../src/utils/derive.js'
import { matchSearch } from '../src/utils/search.js'

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
