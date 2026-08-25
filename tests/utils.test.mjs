import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bandKey, parseGroup, rootGroup, isPersonal } from '../src/utils/bands.js'
import { parseCsvToEvents, mergeWithBundled } from '../src/utils/parseEvents.js'
import { canonicalVenue, uniqueVenues } from '../src/utils/derive.js'
import { milestones, around, elsewhereAround, beforeShowLabel } from '../src/utils/chronicle.js'
import { tap, done } from '../src/utils/haptics.js'
import { isIOS, isIOSSafari } from '../src/utils/platform.js'
import { DEFAULT_FILTERS, filtersToParams, paramsToFilters, applyFilters } from '../src/utils/filters.js'
import { isUrgent, urgentEvents } from '../src/utils/urgency.js'
import {
  normalizeDate, normalizeType, primaryType,
  parseRosterCsv, groupRoster, parsePulseCsv, buildPulseIndex, monthsIn, pulseMonths,
  monthGrid, monthLoad,
} from '../src/utils/parsePulse.js'
import { taiwanIndex, rankIndex, shiftYm } from '../src/utils/forecast.js'
import { parseEventernote, parseEplusArtist, parsePia, parseNewsSearch, guessType, TW_RE } from '../scripts/watch/sources.mjs'
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
import { renderMarkdown, parseFrontMatter } from '../src/utils/markdown.js'
import { countingSummary, sessionsOf } from '../src/utils/counting.js'
import { exportCode, importCode } from '../src/utils/backup.js'
import { relationOf, relationBreakdown } from '../src/utils/relation.js'
import { organizersOf, organizerProfile, organizerList } from '../src/utils/organizers.js'
import { conclusions } from '../src/utils/conclusions.js'
import { diffEvents, appendEntry } from '../scripts/changelog.mjs'
import { daysAgoLabel } from '../src/utils/changelog.js'

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

test('parseCsvToEvents 讀「緊急性」欄，只有「非常」算緊急', () => {
  const csv = '編號,年份,開始日期,活動名稱,緊急性\n' +
    '1,2026,2026-09-01,大爆炸,非常\n' +
    '2,2026,2026-09-02,普通場,普通\n' +
    '3,2026,2026-09-03,沒填,'
  const ev = parseCsvToEvents(csv)
  assert.equal(ev[0].isUrgent, true)
  assert.equal(ev[1].isUrgent, false)
  assert.equal(ev[2].isUrgent, false)
  assert.equal(ev[0].urgency, '非常')
  // 認得的表頭不會再被當成 extras 多印一行
  assert.deepEqual(ev[0].extras, {})
})

test('urgentEvents 只挑還沒結束的緊急場次，日期近的排前', () => {
  const mk = (n, startDate, urgency) => ({ id: `evt-${n}`, number: n, startDate, endDate: startDate, urgency, isUrgent: urgency === '非常' })
  const list = [
    mk(1, '2020-01-01', '非常'),   // 已結束 → 不進橫幅
    mk(2, '2099-05-05', '非常'),
    mk(3, '2099-01-01', '非常'),
    mk(4, '2099-02-02', '普通'),
  ]
  const out = urgentEvents(list, '2026-08-15')
  assert.deepEqual(out.map(e => e.number), [3, 2])
  assert.equal(isUrgent(list[3]), false)
})

test('動態表：日期補零、類型分隔符統一', () => {
  assert.equal(normalizeDate('2026-8-16'), '2026-08-16')   // Sheet 上手打常常少補零
  assert.equal(normalizeDate('2026-08-16'), '2026-08-16')
  assert.equal(normalizeDate('2026-9'), '2026-09-01')       // 只填到月 → 當月 1 號
  assert.equal(normalizeDate('未定'), '')
  assert.equal(normalizeType('LIVE/活動'), 'LIVE／活動')     // 半形斜線 → 全形
  assert.equal(normalizeType('LIVE／活動'), 'LIVE／活動')
  assert.equal(primaryType('LIVE／發售活動'), 'LIVE')
})

test('名冊解析與分組（團體列排在自己那組最前面）', () => {
  const csv = '對象,類別,樂團,角色,追蹤中\n' +
    '愛美,個人,Poppin\'Party,戶山香澄,是\n' +
    'Poppin\'Party,團體,Poppin\'Party,,是\n' +
    '退役太郎,個人,Poppin\'Party,,否\n'
  const roster = parseRosterCsv(csv)
  assert.equal(roster.length, 3)
  assert.equal(roster[1].kind, 'band')
  assert.equal(roster[2].tracked, false)
  const groups = groupRoster(roster)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].lead.name, "Poppin'Party")
  assert.deepEqual(groups[0].members.map(m => m.name), ['愛美'])  // 追蹤中=否 被排除
})

test('動態索引：日本行程與來台場次掛在同一格', () => {
  const pulseCsv = '日期,對象,類型,標題,地點,狀態,連結\n' +
    '2026-8-16,愛美,LIVE/發售活動,發售紀念 Mini Live,東京,已公開,\n' +
    '2026-09-02,Ave Mujica,音樂祭,夏日音樂祭,千葉,已公開,\n'
  const pulse = parsePulseCsv(pulseCsv)
  assert.equal(pulse.length, 2)
  assert.equal(pulse[0].date, '2026-08-16')
  assert.equal(pulse[0].mainType, 'LIVE')
  assert.deepEqual(monthsIn(pulse), ['2026-08', '2026-09'])

  const events = [{
    id: 'evt-001', number: 1, year: 2026, month: 8, startDate: '2026-08-02', endDate: '2026-08-02',
    title: 'Poppin’Party 聲優見面會', people: ['愛美'], relatedGroups: ['Ave Mujica'], venue: '台北',
  }]
  const roster = parseRosterCsv('對象,類別,樂團,角色,追蹤中\nAve Mujica,團體,Ave Mujica,,是\n')
  const idx = buildPulseIndex(pulse, events, roster)
  const aimi = idx.get('愛美|2026-08')
  assert.equal(aimi.length, 2)                                    // 日本 1 筆 + 來台 1 筆
  assert.deepEqual(aimi.map(x => x.where).sort(), ['jp', 'tw'])
  // 樂團名對得起來時，來台場次也掛到團體那一列
  assert.equal(idx.get('Ave Mujica|2026-08').some(x => x.where === 'tw'), true)
})

test('pulseMonths 補成連續月份，並延伸到之後的來台場次', () => {
  const pulse = parsePulseCsv(
    '日期,對象,類型,標題\n' +
    '2026-08-16,愛美,LIVE,A\n' +
    '2026-09-02,愛美,LIVE,B\n')
  // 動態只到 9 月，但 12 月有來台 → 中間的 10、11 月也要留欄，才看得出空了兩個月
  const events = [
    { startDate: '2026-12-05', people: ['愛美'] },
    { startDate: '2018-02-03', people: ['愛美'] },   // 動態開始之前的舊場次不算
  ]
  assert.deepEqual(pulseMonths(pulse, events),
    ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12'])
  assert.deepEqual(pulseMonths(pulse, []), ['2026-08', '2026-09'])
  assert.deepEqual(pulseMonths([], events), [])
  // 跨年也要接得起來
  const p2 = parsePulseCsv('日期,對象,類型,標題\n2026-11-01,愛美,LIVE,C\n')
  assert.deepEqual(pulseMonths(p2, [{ startDate: '2027-01-10', people: ['愛美'] }]),
    ['2026-11', '2026-12', '2027-01'])
})

test('shiftYm 跨年也算得對', () => {
  assert.equal(shiftYm('2026-12', 1), '2027-01')
  assert.equal(shiftYm('2026-01', -1), '2025-12')
  assert.equal(shiftYm('2026-08', -12), '2025-08')
})

test('來台指數：已公告直接標 100、其餘攤開因子', () => {
  const roster = parseRosterCsv(
    '對象,類別,樂團,角色,追蹤中\n' +
    '愛美,個人,Poppin\'Party,戶山香澄,是\n' +
    'Poppin\'Party,團體,Poppin\'Party,,是\n')
  const events = [
    { id: 'evt-1', startDate: '2026-09-05', month: 9, people: ['愛美'], relatedGroups: ["Poppin'Party"] },
    { id: 'evt-2', startDate: '2024-02-03', month: 2, people: ['愛美'], relatedGroups: ["Poppin'Party"] },
  ]
  const pulse = parsePulseCsv(
    '日期,對象,類型,標題\n' +
    '2026-08-10,愛美,LIVE,近況 A\n' +
    '2026-08-14,愛美,公錄,近況 B\n' +
    '2025-01-01,愛美,LIVE,很久以前\n')
  const opts = { events, pulse, roster, today: '2026-08-16' }

  // 9 月已經有公告的場次 → 不用猜
  const sep = taiwanIndex('愛美', { ...opts, targetYm: '2026-09' })
  assert.equal(sep.scheduled, true)
  assert.equal(sep.score, 100)
  assert.equal(sep.events[0].id, 'evt-1')

  // 10 月沒公告 → 給指數，且因子講得出來源
  const oct = taiwanIndex('愛美', { ...opts, targetYm: '2026-10' })
  assert.equal(oct.scheduled, false)
  assert.ok(oct.score > 0 && oct.score <= 96)
  const jp = oct.factors.find(f => f.label === '日本近況')
  assert.match(jp.detail, /2 筆/)              // 只算近 60 天，2025 那筆不算
  const gapF = oct.factors.find(f => f.label === '距上次來台')
  assert.match(gapF.detail, /2026-09/)         // 上次來台是 9 月
  assert.equal(oct.factors.reduce((s, f) => s + f.pts, 0), oct.score)

  // 排名把已公告的排前面
  const ranked = rankIndex(roster, { ...opts, targetYm: '2026-09' })
  assert.equal(ranked[0].score, 100)
})

test('看盤：eventernote 版面解析與台灣雷達', () => {
  // 真實頁面的結構縮影（欄位順序照抄）
  const html = `
    <li class="clearfix ">
      <div class="date"><p class="day6">2026-10-10 (<span class="wday6">土</span>)</p></div>
      <div class="event">
        <h4><a href="/events/477391">BanG Dream! 13th&#39;LIVE DAY1</a></h4>
        <div class="place"> 会場: <a href="/places/11813">東京ガーデンシアター</a></div>
        <div class="place"><span class="s">開場 16:30 開演 18:00</p></div>
        <div class="actor"><ul><li>出演者:</li>
          <li><a href="/actors/Poppin%27Party/14234">Poppin&#39;Party</a></li>
          <li><a href="/actors/%E6%84%9B%E7%BE%8E/2806">愛美</a></li>
        </ul></div>
      </div>
      <div class="note_count"><p title="参加者数">54</p></div>
    </li>
    <li class="clearfix ">
      <div class="date"><p class="day5">2026-10-17 (<span class="wday5">金</span>)</p></div>
      <div class="event">
        <h4><a href="/events/999">TSUMUGI RISA FAN MEETING in TAIPEI</a></h4>
        <div class="place"> 会場: <a href="/places/1">WESTAR</a></div>
      </div>
    </li>`
  const list = parseEventernote(html)
  assert.equal(list.length, 2)
  assert.equal(list[0].id, 'en-477391')
  assert.equal(list[0].date, '2026-10-10')
  assert.equal(list[0].title, "BanG Dream! 13th'LIVE DAY1")   // HTML escape 要還原
  assert.equal(list[0].venue, '東京ガーデンシアター')
  assert.equal(list[0].note, 54)
  assert.deepEqual(list[0].actors, ["Poppin'Party", '愛美'])

  // 台灣雷達：標題或會場出現台灣地名就要亮
  assert.equal(TW_RE.test(list[1].title + ' ' + list[1].venue), true)
  assert.equal(TW_RE.test(list[0].title + ' ' + list[0].venue), false)

  // 類型猜測（貼進「動態」分頁時少手動分類一次）
  assert.equal(guessType('朗読劇『コトバノコトバ』'), '朗讀劇')
  assert.equal(guessType('#水曜日のD4DJ 公開録音'), '公錄')
  assert.equal(guessType('Ave Mujica LIVE TOUR 2026'), 'LIVE')
  assert.equal(guessType('SUMMER SONIC 2026'), '音樂祭')
  assert.equal(guessType('謎の何か'), '')
})

test('看盤：e+ 藝人頁解析（含售票狀態）', () => {
  const html = `
    <a class="ticket-item ticket-item--kouen" href="/sf/detail/3884930005-P0030042P021002?P1=0175">
      <p class="ticket-item__date">
        <span class="ticket-item__yyyy">2026/</span><span class="ticket-item__mmdd">10/24(土)</span>
      </p>
      <h3 class="ticket-item__title"><span class="label-ticket">抽選</span>Ave Mujica 7th LIVE「Virtus」／&lt;DAY1&gt;プレオーダー受付</h3>
      <div class="ticket-item__venue"><p>京王アリーナ TOKYO（東京都）</p></div>
    </a>`
  const [e] = parseEplusArtist(html)
  assert.equal(e.date, '2026-10-24')
  assert.equal(e.status, '抽選')
  // 售票狀態的 span 要整段拆掉，不然標題會變成「抽選Ave Mujica…」
  assert.equal(e.title, 'Ave Mujica 7th LIVE「Virtus」／<DAY1>プレオーダー受付')
  assert.equal(e.venue, '京王アリーナ TOKYO（東京都）')
  assert.match(e.url, /^https:\/\/eplus\.jp\/sf\/detail\//)
})

test('看盤：ぴあ 區塊解析', () => {
  const html = `
    <li class="clearfix">
      <span class="list_02"><td class="img_status">
        <span class="status_icon_text" style="color:#FFF">一般発売</span></td></span>
      <span class="list_01"> 一般発売＜１２／１公演＞／ＥＶＡＮＥＳＣＥＮＣＥ</span>
      <span class="list_03"> 2026/12/1(火)</span>
      <span class="list_04"> ＳＧＣ ＨＡＬＬ ＡＲＩＡＫＥ(東京都)</span>
      <input type="hidden" class="eventCd" value="2623862"/>
    </li>`
  const [e] = parsePia(html)
  assert.equal(e.date, '2026-12-01')
  assert.equal(e.status, '一般発売')
  assert.equal(e.id, 'pia-2623862')
  assert.match(e.url, /eventCd=2623862/)
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

test('月曆格子補滿整週、當月忙碌統計', () => {
  // 2026-09-01 是星期二 → 前面補兩格空白
  const grid = monthGrid('2026-09')
  assert.equal(grid.length, 5)              // 30 天 + 前後空白 = 5 週
  assert.equal(grid[0][0], null)
  assert.equal(grid[0][2], '2026-09-01')
  assert.equal(grid.flat().filter(Boolean).length, 30)
  assert.equal(grid.flat().length % 7, 0)

  const pulse = parsePulseCsv(
    '日期,對象,類型,標題\n' +
    '2026-09-02,愛美,LIVE,A\n' +
    '2026-09-20,愛美,公錄,B\n' +
    '2026-09-11,高尾奏音,朗讀劇,C\n' +
    '2026-10-01,愛美,LIVE,別的月份\n')
  const load = monthLoad(pulse, '2026-09')
  assert.deepEqual(load.map(x => [x.name, x.count]), [['愛美', 2], ['高尾奏音', 1]])
  assert.equal(load[0].first, '2026-09-02')
  assert.equal(load[0].last, '2026-09-20')
  assert.deepEqual(monthLoad(pulse, '2026-12'), [])
})

test('monthLoad 把團體行程算到成員頭上', () => {
  const roster = parseRosterCsv(
    '對象,類別,樂團,角色,追蹤中\n' +
    "愛美,個人,Poppin'Party,戶山香澄,是\n" +
    "西本里美,個人,Poppin'Party,牛込里美,是\n" +
    "Poppin'Party,團體,Poppin'Party,,是\n")
  const pulse = parsePulseCsv(
    '日期,對象,類型,標題\n' +
    "2026-12-13,Poppin'Party,LIVE,京 Premium Live DAY2\n" +
    '2026-12-05,愛美,公錄,個人節目\n')

  // 團的那場要讓兩個成員都「沒空」，而不是只掛在團名下
  const load = monthLoad(pulse, '2026-12', roster)
  assert.deepEqual(load.map(x => x.name).sort(), ['愛美', '西本里美'])
  const aimi = load.find(x => x.name === '愛美')
  assert.equal(aimi.count, 2)      // 自己 1 + 團體 1
  assert.equal(aimi.own, 1)
  assert.equal(aimi.viaBand, 1)
  const rimi = load.find(x => x.name === '西本里美')
  assert.equal(rimi.own, 0)        // 只有團體行程 → UI 會標「團」
  assert.equal(rimi.viaBand, 1)

  // 沒給名冊時維持原樣：照「對象」欄逐字統計
  assert.deepEqual(monthLoad(pulse, '2026-12').map(x => x.name).sort(),
    ["Poppin'Party", '愛美'])
})

test('來台指數的「日本近況」把團體行程算進成員', () => {
  const roster = parseRosterCsv(
    '對象,類別,樂團,角色,追蹤中\n' +
    "西本里美,個人,Poppin'Party,牛込里美,是\n" +
    "Poppin'Party,團體,Poppin'Party,,是\n")
  const pulse = parsePulseCsv(
    '日期,對象,類型,標題\n' +
    "2026-08-10,Poppin'Party,LIVE,團體公演\n")
  const opts = { events: [], pulse, roster, today: '2026-08-16', targetYm: '2026-10' }
  const solo = taiwanIndex('西本里美', opts).factors.find(f => f.label === '日本近況')
  assert.match(solo.detail, /1 筆/)     // 團的那場要算到她身上
})

test('看盤：新聞關鍵字搜尋的兩層過濾', () => {
  // 華視搜尋結果的結構縮影：<a href> 裡包 <time> 與 <h2>
  const html = `
    <li><a href="https://news.cts.com.tw/cts/entertain/202608/1.html" class="search-news-card">
      <time class="search-news-date" datetime="2026-08-19 11:23:00">2026-08-19</time>
      <h2 class="search-news-title">聲優工藤晴香11月來台辦粉絲見面會！ 門票8月23日開賣</h2>
    </a></li>
    <li><a href="https://news.cts.com.tw/cts/general/202605/2.html" class="search-news-card">
      <time class="search-news-date" datetime="2026-05-15 08:00:00">2026-05-15</time>
      <h2 class="search-news-title">「小蘭姊姊」聲音成絕響 聲優山崎和佳奈病逝</h2>
    </a></li>
    <li><a href="https://news.cts.com.tw/cts/general/202601/3.html" class="search-news-card">
      <h2 class="search-news-title">怎敲都不裂？ 地瓜球品質「堅若磐石」 民眾：硬邦邦</h2>
    </a></li>`

  const items = parseNewsSearch(html)
  assert.equal(items.length, 3)
  assert.equal(items[0].date, '2026-08-19')
  assert.match(items[0].url, /^https:\/\/news\.cts\.com\.tw\//)
  assert.equal(items[0].title, '聲優工藤晴香11月來台辦粉絲見面會！ 門票8月23日開賣')

  // 第一層：標題要真的含關鍵字（搜「邦邦」會回「硬邦邦」，但那則不含「聲優」）
  // 第二層：像「聲優」這種很廣的字，還要再命中 require 才算
  const keep = (entry) => {
    const flat = (s) => s.replace(/\s+/g, '').toLowerCase()
    const kw = typeof entry === 'string' ? entry : entry.kw
    const req = (typeof entry === 'string' ? [] : entry.require || []).map(flat)
    return items.filter(i => {
      const t = flat(i.title)
      return t.includes(flat(kw)) && (!req.length || req.some(r => t.includes(r)))
    })
  }
  assert.equal(keep('聲優').length, 2)                                   // 見面會 + 病逝
  assert.equal(keep({ kw: '聲優', require: ['來台', '見面會'] }).length, 1)  // 只剩見面會那則

  // 「邦邦」會被「硬邦邦」命中 —— 只比對關鍵字不夠，這正是 require 存在的理由
  assert.equal(keep('邦邦').length, 1)
  assert.equal(keep({ kw: '邦邦', require: ['來台', '見面會', '公演'] }).length, 0)
})

// ---------------------------------------------------------------- markdown
test('renderMarkdown 支援心得會用到的語法', () => {
  const html = renderMarkdown([
    '## 表演',
    '',
    '開場就 **神**，但 *其他* 很爛。',
    '',
    '- 燈光',
    '- 音響',
    '',
    '> 反田葉月排到十樓',
    '',
    '看 [官網](https://example.com) 說明。',
  ].join('\n'))

  assert.match(html, /<h3>表演<\/h3>/)
  assert.match(html, /<strong>神<\/strong>/)
  assert.match(html, /<em>其他<\/em>/)
  assert.match(html, /<ul><li>燈光<\/li><li>音響<\/li><\/ul>/)
  assert.match(html, /<blockquote>反田葉月排到十樓<\/blockquote>/)
  assert.match(html, /<a href="https:\/\/example\.com" target="_blank"/)
})

test('renderMarkdown 不會讓 HTML 逃出來', () => {
  const html = renderMarkdown('<img src=x onerror=alert(1)> 還有 <b>粗體</b>')
  assert.ok(!html.includes('<img'))
  assert.ok(!html.includes('<b>'))
  assert.match(html, /&lt;img/)
})

test('parseFrontMatter 拆得出一句話與正文', () => {
  const { meta, body } = parseFrontMatter('---\n一句話: 表演神，其他全爛。\n---\n\n第一段。\n')
  assert.equal(meta['一句話'], '表演神，其他全爛。')
  assert.equal(body, '第一段。')

  const plain = parseFrontMatter('沒有前置資料')
  assert.deepEqual(plain.meta, {})
  assert.equal(plain.body, '沒有前置資料')
})

// ---------------------------------------------------------------- 統計口徑
test('countingSummary 把筆數、日數、場次分開算', () => {
  const events = [
    { number: 1, startDate: '2026-04-11', endDate: '2026-04-11', type: 'LIVE' },
    { number: 2, startDate: '2026-08-08', endDate: '2026-08-09', type: 'LIVE' },   // 雙日 = 2 場
    { number: 3, startDate: '2026-04-07', endDate: '2026-04-16', type: '快閃店' },  // 10 天 = 1 場
    { number: 4, startDate: '2026-04-11', endDate: '2026-04-11', type: 'FMT' },    // 與 #1 同一天
  ]
  const c = countingSummary(events)

  assert.equal(c.records, 4)
  assert.equal(c.sessions, 1 + 2 + 1 + 1)
  assert.equal(c.multiDay, 2)
  // 4/11 有兩筆，活動日只算一天；4/7–4/16 這 10 天已含 4/11，再加 8/8、8/9
  assert.equal(c.spanDays, 1 + 2 + 10 + 1)
  assert.equal(c.activeDays, 10 + 2)
})

test('sessionsOf 以 Sheet 標註的場次優先', () => {
  // 一天兩場（午場＋晚場）只有標註才看得出來
  assert.equal(sessionsOf({ startDate: '2026-04-12', endDate: '2026-04-12', type: 'LIVE', sessions: 2 }), 2)
  assert.equal(sessionsOf({ startDate: '2026-04-12', endDate: '2026-04-12', type: 'LIVE' }), 1)
  assert.equal(sessionsOf({ startDate: '2026-04-12', endDate: '2026-04-12', type: 'LIVE', extras: { 場次: '2' } }), 2)
})

// ---------------------------------------------------------------- 備份碼
test('備份碼可以來回還原', () => {
  const ids = new Set(['evt-001', 'evt-042', 'evt-043', 'evt-050'])
  const code = exportCode(ids)
  assert.match(code, /^BDTW:v2:[A-Za-z0-9_-]+$/)
  assert.deepEqual([...importCode(code).ids].sort(), [...ids].sort())
})

test('備份碼夠短，可以貼進聊天訊息', () => {
  const all = new Set(Array.from({ length: 59 }, (_, i) => `evt-${String(i + 1).padStart(3, '0')}`))
  assert.ok(exportCode(all).length < 30, exportCode(all))
})

test('備份碼認得出壞掉的輸入', () => {
  assert.equal(importCode(''), null)
  assert.equal(importCode('哈囉'), null)
  assert.equal(importCode('BDTW:v1:AgEA'), null)          // 版本不符
  assert.equal(importCode('BDTW:v2:AgEAAAAABgIA'), null)  // 校驗碼被改掉
  assert.equal(exportCode(new Set()), '')
})

// ---------------------------------------------------------------- 關聯程度
test('relationOf 把「擦邊」拆成強關聯與弱關聯', () => {
  const solo = { category: '擦邊', type: 'FMT', people: ['工藤晴香'], title: '工藤晴香 Fan Meeting 2026 in Taipei' }
  const festival = { category: '擦邊', type: 'LIVE／音樂祭', people: ['愛美'], title: 'リスアニ！LIVE TAIPEI 2025' }
  const expo = { category: '擦邊', type: 'EXPO', people: ['西尾夕香'], title: 'Bushiroad EXPO 2024' }
  const otherIp = { category: '擦邊', type: 'FMT', people: ['加藤英美里'], title: '《SPY×FAMILY 間諜家家酒》聲優見面會' }
  const core = { category: '本體', type: 'LIVE', people: ['愛美'], title: 'DREAMS GO ON' }

  assert.deepEqual(relationOf(solo), { tier: 'strong', context: 'solo', source: 'inferred' })
  assert.equal(relationOf(festival).tier, 'weak')
  assert.equal(relationOf(expo).context, 'convention')
  assert.equal(relationOf(otherIp).context, 'other_ip')
  assert.deepEqual(relationOf(core), { tier: 'official', context: 'bandori', source: 'inferred' })
})

test('Sheet 的「關聯」欄可以蓋掉推論', () => {
  const e = { category: '擦邊', type: 'FMT', people: ['A'], title: 'A 見面會', relation: '弱關聯' }
  assert.deepEqual(relationOf(e), { tier: 'weak', context: 'solo', source: 'sheet' })
  assert.equal(relationOf({ ...e, relation: '', extras: { 關聯: '官方本體' } }).tier, 'official')
})

test('relationBreakdown 會回報有幾筆是猜的', () => {
  const b = relationBreakdown([
    { category: '本體', type: 'LIVE', title: 'x' },
    { category: '擦邊', type: 'FMT', people: ['A'], title: 'A 見面會', relation: '強關聯' },
  ])
  assert.equal(b.total, 2)
  assert.equal(b.inferred, 1)
  assert.equal(b.confirmed, 1)
})

// ---------------------------------------------------------------- 主辦
test('organizersOf 拆得開一場多主辦', () => {
  assert.deepEqual(organizersOf({ organizer: '宝島制作委員会、移動怪獸' }), ['宝島制作委員会', '移動怪獸'])
  assert.deepEqual(organizersOf({ organizer: ' ATC Taiwan ' }), ['ATC Taiwan'])
  assert.deepEqual(organizersOf({}), [])
})

test('organizerProfile 算得出履歷', () => {
  const events = [
    { id: 'a', number: 1, year: 2025, startDate: '2025-01-01', organizer: '甲', venue: 'MOONDOG', category: '本體', type: 'LIVE', people: ['A'] },
    { id: 'b', number: 2, year: 2026, startDate: '2026-01-01', organizer: '甲、乙', venue: 'MOONDOG', category: '擦邊', type: 'FMT', people: ['B'] },
    { id: 'c', number: 3, year: 2026, startDate: '2026-02-01', organizer: '乙', venue: 'Zepp', category: '本體', type: 'LIVE', people: ['A'] },
  ]
  const p = organizerProfile(events, '甲')
  assert.equal(p.count, 2)
  assert.equal(p.core, 1)
  assert.equal(p.personal, 1)
  assert.equal(p.firstYear, 2025)
  assert.equal(p.lastYear, 2026)
  assert.deepEqual(p.venues[0], ['MOONDOG', 2])
  assert.equal(organizerProfile(events, '不存在'), null)

  const list = organizerList(events)
  assert.deepEqual(list.map(o => [o.name, o.count]), [['乙', 2], ['甲', 2]])
})

// ---------------------------------------------------------------- 統計結論
test('conclusions 抓得到「樂團出現 ≠ 本體來台」', () => {
  const events = [
    { id: 'a', number: 1, year: 2026, startDate: '2026-01-01', category: '擦邊', type: 'FMT', people: ['上坂菫'], relatedGroups: ['Pastel＊Palettes／白鷺千聖'], title: '上坂菫見面會' },
    { id: 'b', number: 2, year: 2026, startDate: '2026-02-01', category: '擦邊', type: 'LIVE／音樂祭', people: ['上坂菫'], relatedGroups: ['Pastel＊Palettes／白鷺千聖'], title: 'KING SUPER LIVE' },
    { id: 'c', number: 3, year: 2026, startDate: '2026-03-01', category: '擦邊', type: 'EXPO', people: ['上坂菫'], relatedGroups: ['Pastel＊Palettes／白鷺千聖'], title: '2026 漫畫博覽會' },
  ]
  const card = conclusions(events).find(c => c.key === 'band-inflation')
  assert.ok(card, '應該要有樂團虛胖那張卡')
  assert.equal(card.text, 'Pastel＊Palettes 出現在 3 筆活動，沒有一筆是本體')
})

test('conclusions 每一條都是一句話，沒有第二行小字', () => {
  const events = [{ id: 'a', number: 1, year: 2026, startDate: '2026-01-01', category: '本體', type: 'LIVE', title: 'x' }]
  const cards = conclusions(events)
  const card = cards.find(c => c.key === 'relation')
  assert.match(card.text, /全由規則推論$/)
  for (const c of cards) {
    assert.equal(typeof c.text, 'string')
    assert.ok(!('detail' in c), `${c.key} 不該還有第二行`)
  }
})

// ---------------------------------------------------------------- 更新日誌
test('diffEvents 只認得追蹤中的欄位', () => {
  const prev = [{ number: 1, title: 'A', startDate: '2026-01-01', venue: 'X', impression: '' }]
  const next = [
    { number: 1, title: 'A', startDate: '2026-01-02', venue: 'X', impression: '補了心得' },
    { number: 2, title: 'B', startDate: '2026-03-01' },
  ]
  const d = diffEvents(prev, next)
  assert.deepEqual(d.added.map(x => x.number), [2])
  assert.deepEqual(d.changed[0].fields, ['日期'])   // 心得改了不算異動
})

test('appendEntry 同一天只留一筆，會合併', () => {
  let log = appendEntry([], { added: [{ number: 1 }], changed: [] }, '2026-08-24')
  log = appendEntry(log, { added: [{ number: 2 }], changed: [] }, '2026-08-24')
  assert.equal(log.length, 1)
  assert.deepEqual(log[0].added.map(x => x.number), [2, 1])

  log = appendEntry(log, { added: [{ number: 3 }], changed: [] }, '2026-08-25')
  assert.deepEqual(log.map(e => e.date), ['2026-08-25', '2026-08-24'])
  assert.equal(appendEntry(log, { added: [], changed: [] }, '2026-08-26'), log)
})

test('daysAgoLabel 講人話', () => {
  const t = '2026-08-24'
  assert.equal(daysAgoLabel(null, t), '剛剛加入')
  assert.equal(daysAgoLabel('2026-08-24', t), '今天')
  assert.equal(daysAgoLabel('2026-08-23', t), '昨天')
  assert.equal(daysAgoLabel('2026-08-20', t), '4 天前')
  assert.equal(daysAgoLabel('2026-08-10', t), '2 週前')
  assert.equal(daysAgoLabel('2026-01-05', t), '26/01/05')
})

// ---------------------------------------------------------------- 永久鍵 vs 圖鑑序號
test('沒有 ID 欄時，永久鍵退回用編號（行為跟以前一樣）', () => {
  const [e] = parseCsvToEvents('編號,活動名稱,開始日期\n42,DREAMS GO ON,2026-04-12\n')
  assert.equal(e.number, 42)
  assert.equal(e.stableId, 42)
  assert.equal(e.id, 'evt-042')
})

test('有 ID 欄時，重排編號不會動到 id', () => {
  const before = parseCsvToEvents('ID,編號,活動名稱,開始日期\n42,42,DREAMS GO ON,2026-04-12\n')[0]
  // 中間插了一列，Sheet 把這場往後推成 #43，但 ID 沒動
  const after = parseCsvToEvents('ID,編號,活動名稱,開始日期\n42,43,DREAMS GO ON,2026-04-12\n')[0]

  assert.equal(after.number, 43, '圖鑑上的序號會跟著重排')
  assert.equal(after.id, before.id, '照片、心得、備份碼綁的 id 不能跟著動')
  assert.equal(after.stableId, 42)
})

test('重排編號不會被更新日誌當成異動', () => {
  const prev = [{ stableId: 42, number: 42, title: 'A', startDate: '2026-04-12' }]
  const next = [
    { stableId: 41, number: 42, title: '插進來的新場次', startDate: '2026-04-11' },
    { stableId: 42, number: 43, title: 'A', startDate: '2026-04-12' },
  ]
  const d = diffEvents(prev, next)
  assert.deepEqual(d.added.map(x => x.id), [41], '只有真的新增的那一筆算新增')
  assert.deepEqual(d.changed, [], '被推移編號的那一筆不算異動')
})

test('手動欄位靠永久鍵合併，不受重排影響', () => {
  const bundled = [{ stableId: 42, number: 42, impression: '寫過的心得', photos: ['a.jpg'] }]
  const sheet = [{ stableId: 42, number: 43, impression: '', photos: [] }]
  const [merged] = mergeWithBundled(sheet, bundled)
  assert.equal(merged.impression, '寫過的心得')
  assert.deepEqual(merged.photos, ['a.jpg'])
})

// ---------------------------------------------------------------- 場館別名
test('同一個場館的兩種寫法會合併', () => {
  assert.equal(canonicalVenue('南港展覽館一館'), '台北南港展覽館一館')
  assert.equal(canonicalVenue('台北南港展覽館一館 4 樓'), '台北南港展覽館一館')
  assert.equal(canonicalVenue('Clapper Studio'), '三創生活園區 CLAPPER STUDIO')
  assert.equal(canonicalVenue('MOONDOG'), 'MOONDOG')   // 沒別名的原樣回傳
  assert.equal(canonicalVenue(''), '')

  const events = [
    { venue: '南港展覽館一館' },
    { venue: '台北南港展覽館一館 4 樓' },
    { venue: 'MOONDOG' },
  ]
  assert.deepEqual(uniqueVenues(events), ['MOONDOG', '台北南港展覽館一館'])
})

// ---------------------------------------------------------------- 史料層
test('milestones 串得出「公布 → 開賣 → 演出」', () => {
  const event = { stableId: 59, number: 59, startDate: '2026-12-05', endDate: '2026-12-05', ticketDate: '2026-09-20' }
  const log = [{ date: '2026-08-24', added: [{ id: 59 }], changed: [] }]
  const m = milestones(event, log, '2026-08-24')

  assert.deepEqual(m.map(x => x.label), ['公布', '開賣', '演出'])
  assert.equal(m[0].date, '2026-08-24')
  assert.ok(m[0].offset > 0, '公布在演出之前，offset 應為正')
})

test('只有演出一個點就不算時間線', () => {
  assert.deepEqual(milestones({ stableId: 1, startDate: '2026-12-05' }, [], '2026-08-24'), [])
})

test('beforeShowLabel 不會把前後講反', () => {
  assert.equal(beforeShowLabel(103), '演出前 3 個月')
  assert.equal(beforeShowLabel(-7), '演出後 1 週')
  assert.equal(beforeShowLabel(0), '當天')
})

test('around 只抓前後 45 天，並照時間排', () => {
  const target = { id: 'a', startDate: '2026-08-08' }
  const all = [
    target,
    { id: 'b', startDate: '2026-08-02' },   // 6 天前
    { id: 'c', startDate: '2026-09-27' },   // 50 天後，超出範圍
    { id: 'd', startDate: '2026-08-15' },   // 7 天後
  ]
  assert.deepEqual(around(target, all).map(x => x.event.id), ['b', 'd'])
})

test('elsewhereAround 只看這場的出演者', () => {
  const event = { id: 'a', startDate: '2026-12-05', people: ['愛美'] }
  const pulse = [
    { id: 'p1', name: '愛美', date: '2026-11-08', title: '香港公演' },
    { id: 'p2', name: '愛美', date: '2026-12-12', title: '京都公演' },
    { id: 'p3', name: '別人', date: '2026-12-06', title: '不該出現' },
    { id: 'p4', name: '愛美', date: '2026-06-01', title: '太遠了' },
  ]
  const out = elsewhereAround(event, pulse)
  assert.equal(out.length, 1)
  assert.equal(out[0].name, '愛美')
  assert.deepEqual(out[0].list.map(r => r.id), ['p1', 'p2'])
})

// ---------------------------------------------------------------- 觸覺回饋
// Node 的 navigator 是唯讀的，要換掉得重新定義這個屬性
const withNavigator = (value, fn) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true })
  try { fn() } finally { Object.defineProperty(globalThis, 'navigator', original) }
}

test('沒有 vibrate API 時不會炸掉', () => {
  // 桌機瀏覽器與 iOS Safari 都沒有 navigator.vibrate
  withNavigator({}, () => assert.doesNotThrow(() => { tap(); done() }))
})

test('有 vibrate 時才會震，而且長短分得出來', () => {
  const calls = []
  withNavigator({ vibrate: (p) => calls.push(p) }, () => { tap(); done() })

  assert.equal(calls.length, 2)
  assert.equal(typeof calls[0], 'number', '單次確認是一下短的')
  assert.ok(Array.isArray(calls[1]), '完成是一組節奏')
})

// ---------------------------------------------------------------- 平台判斷
const withUA = (ua, extra, fn) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: ua, ...extra }, configurable: true, writable: true,
  })
  try { fn() } finally { Object.defineProperty(globalThis, 'navigator', original) }
}

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

test('認得出 iPhone 上的 Safari', () => {
  withUA(IPHONE_SAFARI, {}, () => {
    assert.equal(isIOS(), true)
    assert.equal(isIOSSafari(), true)
  })
})

test('iOS 上的非 Safari 瀏覽器不給看教學（那邊按不到分享→加入主畫面）', () => {
  const cases = [
    ['CriOS', IPHONE_SAFARI.replace('Version/17.5', 'CriOS/126.0')],
    ['Firefox', IPHONE_SAFARI.replace('Version/17.5', 'FxiOS/127.0')],
    ['Line 內建', IPHONE_SAFARI + ' Line/14.0.0'],
    ['Facebook 內建', IPHONE_SAFARI + ' FBAN/FBIOS'],
  ]
  for (const [name, ua] of cases) {
    withUA(ua, {}, () => {
      assert.equal(isIOS(), true, name + ' 仍算 iOS')
      assert.equal(isIOSSafari(), false, name + ' 不該顯示 Safari 教學')
    })
  }
})

test('iPadOS 偽裝成 Mac 也要抓得到', () => {
  const macUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
  // 真的 Mac：沒有觸控點
  withUA(macUA, { maxTouchPoints: 0 }, () => assert.equal(isIOS(), false))
  // iPad：UA 一樣，但有觸控
  withUA(macUA, { maxTouchPoints: 5 }, () => assert.equal(isIOS(), true))
})

test('Android 不會被當成 iOS', () => {
  withUA('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36', {}, () => {
    assert.equal(isIOS(), false)
    assert.equal(isIOSSafari(), false)
  })
})

// ---------------------------------------------------------------- 階段 1：清單內搜尋
test('搜尋字串會進網址，返回清單時還原得回來', () => {
  const f = { ...DEFAULT_FILTERS, search: '愛美', year: '2026', groups: ['Roselia'] }
  const params = filtersToParams(f)
  assert.equal(params.search, '愛美', '搜尋字串必須寫進網址，否則返回就沒了')

  const back = { ...DEFAULT_FILTERS, ...paramsToFilters(params) }
  assert.equal(back.search, '愛美')
  assert.equal(back.year, '2026')
  assert.deepEqual(back.groups, ['Roselia'])
})

test('空搜尋不會污染網址', () => {
  assert.equal('search' in filtersToParams({ ...DEFAULT_FILTERS, search: '' }), false)
})

test('清單內搜尋跟全站快速搜尋互不干擾', () => {
  // 全站搜尋是「跳到某個頁面」，不會寫進 collection 的篩選條件；
  // 這裡確認 filters 只認得自己的 search 欄位。
  const f = { ...DEFAULT_FILTERS, search: '愛美' }
  const events = [
    { id: 'a', title: 'AIMI LIVE TOUR', people: ['愛美'], relatedGroups: [], year: 2026, startDate: '2026-04-25' },
    { id: 'b', title: 'Roselia 台北公演', people: ['相樂'], relatedGroups: [], year: 2025, startDate: '2025-12-26' },
  ]
  const got = applyFilters(events, f, new Set())
  assert.deepEqual(got.map(e => e.id), ['a'])

  // 清空搜尋就回到全部，不受其他狀態影響
  assert.equal(applyFilters(events, { ...f, search: '' }, new Set()).length, 2)
})

test('清除鈕會一起清掉搜尋與篩選', () => {
  // DEFAULT_FILTERS 是清除的目標，它必須包含空的 search
  assert.equal(DEFAULT_FILTERS.search, '')
  assert.deepEqual(filtersToParams(DEFAULT_FILTERS), {}, '重設之後網址不該留下任何條件')
})
