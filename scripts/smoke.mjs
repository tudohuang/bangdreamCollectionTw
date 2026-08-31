// 煙霧測試：拿真的 events.json 把每一個頁面／元件在 Node 裡 server render 一遍。
//   npm run smoke
//
// 單元測試只驗純函式，抓不到「頁面壞掉」——
// 例如檔案被改壞、少 import、render 時存取到 undefined。這支就是補那個洞。
// JSX 沒辦法被 Node 直接 import，所以先用 esbuild（vite 已經帶了）打包成一支暫存檔再跑。
import { build } from 'esbuild'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'node_modules', '.cache')
const OUT = join(OUT_DIR, 'smoke-bundle.mjs')

// 瀏覽器全域的最小替身。刻意不定義 window / document，
// 元件裡那些 `typeof window !== 'undefined'` 的守衛才會走到伺服器分支。
globalThis.location = { origin: 'https://example.tw', pathname: '/', hash: '', href: 'https://example.tw/' }
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }

const ENTRY = `
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import events from './src/data/events.json'

import Hero from './src/components/Hero.jsx'
import MonthlyDigest from './src/components/MonthlyDigest.jsx'
import Highlights from './src/components/Highlights.jsx'
import OnThisDay from './src/components/OnThisDay.jsx'
import FilterPanel from './src/components/FilterPanel.jsx'
import FilterSheet from './src/components/FilterSheet.jsx'
import ChangeLogSection from './src/components/ChangeLogSection.jsx'
import EventTable from './src/components/EventTable.jsx'
import Timeline from './src/components/Timeline.jsx'
import YearGlance from './src/components/YearGlance.jsx'
import PulseCalendar from './src/components/PulseCalendar.jsx'
import EmptyResult from './src/components/EmptyResult.jsx'
import EventRow from './src/components/EventRow.jsx'
import EventWall from './src/components/EventWall.jsx'
import EventCard from './src/components/EventCard.jsx'
import EventDetail from './src/components/EventDetail.jsx'
import PeoplePage from './src/components/PeoplePage.jsx'
import ProfilePage from './src/components/ProfilePage.jsx'
import MePage from './src/components/MePage.jsx'
import StatsPanel from './src/components/StatsPanel.jsx'
import OtherHalf from './src/components/OtherHalf.jsx'
import VenueMap from './src/components/VenueMap.jsx'
import YearWall from './src/components/YearWall.jsx'
import CollectionStrip from './src/components/CollectionStrip.jsx'
import Footer from './src/components/Footer.jsx'
import Contribute from './src/components/Contribute.jsx'
import CommandPalette from './src/components/CommandPalette.jsx'
import UrgentBar from './src/components/UrgentBar.jsx'
import ResultBar from './src/components/ResultBar.jsx'
import PulsePage from './src/components/PulsePage.jsx'
import LabsPage from './src/components/LabsPage.jsx'
import OrganizerPage from './src/components/OrganizerPage.jsx'
import VenuePage from './src/components/VenuePage.jsx'
import SeriesPage from './src/components/SeriesPage.jsx'
import SongPage from './src/components/SongPage.jsx'
import SongsPage from './src/components/SongsPage.jsx'
import { songMetaIndex } from './src/utils/parseSongs.js'
import { songKey } from './src/utils/songs.js'
import ResumeLine from './src/components/ResumeLine.jsx'
import InstallCard from './src/components/InstallCard.jsx'
import NewSince from './src/components/NewSince.jsx'
import OfficialLinks from './src/components/OfficialLinks.jsx'
import { seriesIndex } from './src/utils/series.js'
import ArchiveSection from './src/components/ArchiveSection.jsx'
import MissingLine from './src/components/MissingLine.jsx'
import YearRing from './src/components/YearRing.jsx'
import GapChart from './src/components/GapChart.jsx'
import CityBars from './src/components/CityBars.jsx'
import RelationBars from './src/components/RelationBars.jsx'
import ArchiveStats from './src/components/ArchiveStats.jsx'
import FirstsTable from './src/components/FirstsTable.jsx'
import { venueIndex } from './src/utils/venues.js'
import YearTimeline from './src/components/YearTimeline.jsx'
import StatsInsights from './src/components/StatsInsights.jsx'
import LifeTimeline from './src/components/LifeTimeline.jsx'
import Primer from './src/components/Primer.jsx'
import Chronicle from './src/components/Chronicle.jsx'
import { InstallHint, BottomNav, IOSInstallCard, PromptInstallCard, DataStatus } from './src/components/Chrome.jsx'
import { JustAnnounced, ChangeFeed } from './src/components/JustAnnounced.jsx'
import { parseRosterCsv, parsePulseCsv } from './src/utils/parsePulse.js'
import { milestoneMap } from './src/utils/milestones.js'
import { sortChrono } from './src/utils/context.js'

const noop = () => {}
// 曲目的替身資料：真資料是 0/59，但那幾頁的有資料狀態也要測
const songEvents = events.slice(0, 3).map((e, i) => ({
  ...e,
  setlist: i === 2 ? '1. STAR BEAT!' : ['1. STAR BEAT!' + (i ? '〜ホシノコドウ〜' : ''), '2. Returns', '安可', 'キズナミュージック'].join(String.fromCharCode(10)),
}))
// 歌曲主檔的三種樣子。實際資料在 Sheet 的「歌曲」分頁，這裡只是造形狀。
const songMetaRow = (over = {}) => ({
  // key 一定要用 songKey 算，不能手寫 —— 手寫錯了畫面照樣 render，
  // 只是主檔那塊靜靜對不上，測試永遠是綠的
  key: songKey('STAR BEAT!'), title: 'STAR BEAT!', band: "Poppin'Party",
  album: '', released: '', lyricist: '', composer: '', arranger: '',
  links: [], cover: '', aliases: [], note: '', ...over,
})
const songMetaFull = songMetaIndex([songMetaRow({
  album: "Poppin'Party Sings BanG Dream!", released: '2017-04-19',
  lyricist: '中村航', composer: 'Elements Garden',
  links: ['https://open.spotify.com/track/x', 'https://www.uta-net.com/song/1/',
    'https://music.apple.com/tw/album/1', 'https://bandori.party/'],
  cover: 'https://i.test/cover.jpg',
  note: '第一張專輯的開場曲。',
})])
const songMetaLinks = songMetaIndex([songMetaRow({ band: '', links: ['https://youtu.be/x'] })])
const songMetaBlank = songMetaIndex([songMetaRow({ band: '' })])

const attended = new Set(events.slice(0, 6).map(e => e.id))
const filters = {
  year: 'all', groups: [], people: [], characters: [], types: [], venues: [], cities: [],
  category: 'all', fullBand: 'all', attended: 'all', photos: 'all', urgent: 'all', timeframe: 'all',
  search: '', view: 'cards', order: 'date-asc',
}
const milestones = milestoneMap(events)
const chrono = sortChrono(events)
const one = events.find(e => e.venue && (e.people || []).length) || events[0]
// 緊急狀態（Sheet 標「非常」）：真資料裡不一定有，直接捏一場未來的來測那條分支
const urgentOne = { ...one, urgency: '非常', isUrgent: true, year: 2099, month: 1, startDate: '2099-01-01', endDate: '2099-01-01' }
const withUrgent = [urgentOne, ...events.filter(e => e.id !== one.id)]

// 動態頁的替身資料：真的 Sheet 抓不到（也不該在測試裡連網），用固定樣本
const pulseRoster = parseRosterCsv(
  '對象,類別,樂團,角色,追蹤中\\n' +
  "愛美,個人,Poppin'Party,戶山香澄,是\\n" +
  "伊藤彩沙,個人,Poppin'Party,市谷有咲,是\\n" +
  "Poppin'Party,團體,Poppin'Party,,是\\n" +
  '高尾奏音,個人,Ave Mujica,Mortis,是\\n' +
  'Ave Mujica,團體,Ave Mujica,,是\\n')
const pulseRows = parsePulseCsv(
  '日期,對象,類型,標題,地點,狀態,連結\\n' +
  '2026-8-16,愛美,LIVE/發售活動,「AIM STAR」發售紀念 Free Mini Live,日本,已公開,\\n' +
  '2026-08-30,愛美,公錄,#水曜日のD4DJ,東京,已公開,\\n' +
  '2026-9-19,高尾奏音,朗讀劇,朗讀劇 出演,新宿,已公開,\\n' +
  '2026-08-16,Ave Mujica,音樂祭,SUMMER SONIC 2026 TOKYO,ZOZO Marine Stadium,已公開,\\n')

// 每個案例都要碰到真實資料的分支，不能只 render 空狀態
export const CASES = [
  ['Hero', <Hero events={events} onSelect={noop} onYearJump={noop} />],
  ['MonthlyDigest', <MonthlyDigest events={events} onSelect={noop} />],
  ['Highlights', <Highlights events={events} onSelect={noop} />],
  ['OnThisDay', <OnThisDay events={events} onSelect={noop} />],
  ['FilterPanel(bar)', <FilterPanel events={events} filters={filters} onChange={noop} onReset={noop} resultCount={events.length} />],
  // 篩選抽屜要單獨測 —— 它只在點「全部篩選」之後才 render，
  // 所以 FilterPanel 過了不代表它會過。抽成獨立檔案時常數沒跟著搬，
  // 抽屜一打開就整塊掛掉，而煙霧測試完全沒抓到。
  // 這幾個以前完全沒被 render 過。FilterSheet 的教訓：沒進煙霧測試的元件
  // 壞掉不會有人發現，因為它們只在某個互動之後才出現。
  ['ChangeLogSection', <ChangeLogSection events={events} onSelect={noop} />, { mayBeEmpty: true }],
  ['EventTable', <EventTable events={events} attended={attended} onSelect={noop} />],
  ['EventTable(空)', <EventTable events={[]} attended={attended} onSelect={noop} />, { mayBeEmpty: true }],
  ['Timeline', <Timeline events={events} attended={attended} onSelect={noop} milestones={milestones} />],
  ['YearGlance', <YearGlance year={2026} byMonth={new Map([[4, events.slice(0, 2)]])} thisYear={2026} thisMonth={8} openMonth={null} onOpenMonth={noop} onSelect={noop} />],
  ['YearGlance(展開)', <YearGlance year={2026} byMonth={new Map([[4, events.slice(0, 2)]])} thisYear={2026} thisMonth={8} openMonth={4} onOpenMonth={noop} onSelect={noop} />],
  ['PulseCalendar', <PulseCalendar months={['2026-08', '2026-09']} roster={pulseRoster} pulse={pulseRows} events={events} onSelectEvent={noop} />],
  ['PulseCalendar(沒 months)', <PulseCalendar onSelectEvent={noop} />, { mayBeEmpty: true }],
  ['EmptyResult', <EmptyResult search="找不到的字" onReset={noop} suggestions={events.slice(0, 3)} onSelect={noop} />, { mayBeEmpty: true }],
  ['EventRow', <EventRow event={one} onSelect={noop} />],
  ['FilterSheet', <FilterSheet events={events} filters={filters} onChange={noop} onClose={noop} onReset={noop} resultCount={events.length} />],
  // 資料狀態列：一切正常時本來就該是空的，出事時才要有東西
  ['DataStatus(正常)', <DataStatus source="sheet" updatedAt={Date.now()} onRetry={noop} />, { mayBeEmpty: true }],
  ['DataStatus(抓不到)', <DataStatus source="error" updatedAt={Date.now()} onRetry={noop} />],
  ['DataStatus(抓不到且沒時間戳)', <DataStatus source="error" onRetry={noop} />],
  ['FilterSheet(空資料)', <FilterSheet events={[]} filters={filters} onChange={noop} onClose={noop} onReset={noop} resultCount={0} />],
  ['FilterPanel(sidebar)', <FilterPanel events={events} filters={filters} onChange={noop} onReset={noop} resultCount={events.length} variant="sidebar" onExportIcs={noop} />],
  ['EventWall(cards)', <EventWall events={events} view="cards" attended={attended} onToggleAttended={noop} onSelect={noop} onReset={noop} allEvents={events} milestones={milestones} />],
  ['EventWall(timeline)', <EventWall events={events} view="timeline" attended={attended} onSelect={noop} allEvents={events} milestones={milestones} />],
  ['EventWall(table)', <EventWall events={events} view="table" attended={attended} onSelect={noop} allEvents={events} milestones={milestones} />],
  ['EventWall(empty)', <EventWall events={[]} view="cards" attended={attended} onSelect={noop} onReset={noop} allEvents={events} />],
  ['EventCard', <EventCard event={one} attended onToggleAttended={noop} onClick={noop} milestone={{ key: 'x', label: '一切的開始' }} />],
  ['EventDetail', <EventDetail event={one} allEvents={events} attended={attended} onToggleAttended={noop} onClose={noop} onNavigate={noop} milestones={milestones.get(one.id) || []} />],
  ['PeoplePage', <PeoplePage events={events} onSelect={noop} />],
  ['ProfilePage(person)', <ProfilePage kind="person" value={(one.people || [])[0] || '愛美'} events={events} attended={attended} onToggleAttended={noop} onSelect={noop} onClose={noop} />],
  ['ProfilePage(band)', <ProfilePage kind="band" value="Poppin'Party" events={events} attended={attended} onToggleAttended={noop} onSelect={noop} onClose={noop} />],
  // 人物頁的曲目區塊：真資料是 0/59，靠 songEvents 才測得到
  ['ProfilePage(有曲目)', <ProfilePage kind="person" value={(songEvents[0].people || [])[0] || '愛美'} events={songEvents} attended={attended} onToggleAttended={noop} onSelect={noop} onClose={noop} />],
  ['ProfilePage(找不到)', <ProfilePage kind="person" value="不存在的人" events={events} attended={attended} onSelect={noop} onClose={noop} />],
  ['MePage(有紀錄)', <MePage events={events} attended={attended} onToggleAttended={noop} onSelect={noop} onBrowse={noop} />],
  ['MePage(空)', <MePage events={events} attended={new Set()} onToggleAttended={noop} onSelect={noop} onBrowse={noop} />],
  ['StatsPanel', <StatsPanel events={events} />],
  ['OtherHalf', <OtherHalf events={events} />],
  ['VenueMap(無座標)', <VenueMap events={events} />],
  ['VenueMap(有座標)', <VenueMap events={events.map((e, i) => i % 4 ? e : ({ ...e, extras: { ...(e.extras || {}), '座標': (25.02 + i * 0.004) + ', ' + (121.5 + i * 0.006) } }))} />],
  ['YearWall', <YearWall events={events} onSelect={noop} />],
  ['CollectionStrip', <CollectionStrip chrono={chrono} isOn={(e) => attended.has(e.id)} onNavigate={noop} />],
  ['Footer', <Footer source="sheet" updatedAt={Date.now()} onRetry={noop} />],
  // REPORT_URL 沒設時本來就不該顯示，空輸出是正確行為
  ['Contribute', <Contribute />, { mayBeEmpty: true }],
  ['CommandPalette', <CommandPalette open events={events} onClose={noop} onSelectEvent={noop} />],
  // 緊急狀態：橫幅本身，以及票根／卡片／詳情的紅色分支
  ['UrgentBar', <UrgentBar events={[urgentOne]} onSelect={noop} />],
  ['UrgentBar(無)', <UrgentBar events={[]} onSelect={noop} />, { mayBeEmpty: true }],
  ['Hero(緊急)', <Hero events={withUrgent} onSelect={noop} onYearJump={noop} />],
  ['EventCard(緊急)', <EventCard event={urgentOne} attended={false} onToggleAttended={noop} onClick={noop} />],
  ['EventDetail(緊急)', <EventDetail event={urgentOne} allEvents={withUrgent} attended={attended} onToggleAttended={noop} onClose={noop} onNavigate={noop} milestones={[]} />],
  ['EventWall(緊急時間軸)', <EventWall events={withUrgent} view="timeline" attended={attended} onSelect={noop} allEvents={withUrgent} milestones={milestones} />],
  // 卡牆分年 / 結果摘要條 / 空狀態帶推薦
  ['EventWall(分年卡牆)', <EventWall events={events} view="cards" attended={attended} onToggleAttended={noop} onSelect={noop} allEvents={events} milestones={milestones} groupByYear />],
  ['EventWall(空+推薦)', <EventWall events={[]} view="cards" attended={attended} onSelect={noop} onReset={noop} allEvents={events} suggestions={events.slice(0, 3)} />],
  ['ResultBar', <ResultBar filters={{ ...filters, year: '2026', people: ['愛美'], search: '見面會' }} onChange={noop} onReset={noop} count={3} total={events.length} />],
  ['ResultBar(無條件)', <ResultBar filters={filters} onChange={noop} onReset={noop} count={events.length} total={events.length} />, { mayBeEmpty: true }],
  // 聲優動態：名冊 + 動態兩張分頁的矩陣
  ['PulsePage', <PulsePage roster={pulseRoster} pulse={pulseRows} events={events} source="sheet" onSelectEvent={noop} />],
  ['PulsePage(沒資料)', <PulsePage roster={[]} pulse={[]} events={events} source="off" onSelectEvent={noop} />],
  ['LabsPage', <LabsPage roster={pulseRoster} pulse={pulseRows} events={events} source="sheet" onSelectEvent={noop} />],
  ['OrganizerPage', <OrganizerPage value={events.find(e => e.organizer)?.organizer?.split(/[、,，/／]/)[0] || '武士道'} events={events} onSelect={noop} onClose={noop} />],
  ['OrganizerPage(找不到)', <OrganizerPage value="不存在的主辦" events={events} onSelect={noop} onClose={noop} />],
  ['VenuePage', <VenuePage value={venueIndex(events)[0]?.key || ''} events={events} onSelect={noop} onClose={noop} />],
  ['VenuePage(找不到)', <VenuePage value="不存在的場館" events={events} onSelect={noop} onClose={noop} />],
  ['SeriesPage', <SeriesPage value={seriesIndex(events)[0]?.key || ''} events={events} onSelect={noop} onClose={noop} />],
  ['SeriesPage(找不到)', <SeriesPage value="不存在的系列" events={events} onSelect={noop} onClose={noop} />],
  ['SeriesPage(空資料)', <SeriesPage value="x" events={[]} onSelect={noop} onClose={noop} />],
  // 曲目現在是 0/59，所以總表要能好好講「還沒有人補」而不是空著唬人
  ['SongsPage(沒資料)', <SongsPage events={events} onClose={noop} />],
  ['SongsPage(有資料)', <SongsPage onClose={noop} events={songEvents} />],
  ['SongsPage(有歌曲主檔)', <SongsPage onClose={noop} events={songEvents} songMeta={songMetaFull} />],
  ['SongPage', <SongPage value="STAR BEAT!" events={songEvents} onSelect={noop} onClose={noop} />],
  ['SongPage(找不到)', <SongPage value="不存在的歌" events={songEvents} onSelect={noop} onClose={noop} />],
  // 歌曲主檔是選填的：三種狀態都要撐得住
  ['SongPage(有歌曲主檔)', <SongPage value="STAR BEAT!" events={songEvents} songMeta={songMetaFull} onSelect={noop} onClose={noop} />],
  ['SongPage(主檔只有連結)', <SongPage value="STAR BEAT!" events={songEvents} songMeta={songMetaLinks} onSelect={noop} onClose={noop} />],
  ['SongPage(主檔有這首但整列空白)', <SongPage value="STAR BEAT!" events={songEvents} songMeta={songMetaBlank} onSelect={noop} onClose={noop} />],
  // 兩天一列 + 暱稱分段 + 出處註記（#048 那種）
  ['ArchiveSection(兩天一列)', <ArchiveSection color="#8b5cf6" glow="139,92,246" allEvents={[]}
    event={{ id: 'x', people: ['小日向美香', '櫻川惠'], relatedGroups: ['MyGO!!!!!', 'Roselia'],
      setlist: ['【Day 1】', '合唱', '1. ray（BUMP OF CHICKEN 歌曲）', 'みか 部分', '2. 夢のみちしるべ',
        '安可', '3. Snow halation', '【Day 2】', '合唱', '1. ライオン', 'めぐ 部分', '2. キボウマイロード',
      ].join(String.fromCharCode(10)) }} />],
  // 雙團場：每一行標了團、有 MC、有安可、有台灣首唱
  ['ArchiveSection(雙團場全套)', <ArchiveSection color="#8b5cf6" glow="139,92,246"
    allEvents={songEvents}
    event={{ ...songEvents[0], relatedGroups: ['MyGO!!!!!', 'Ave Mujica'],
      setlist: ['1. 春日影／MyGO!!!!!', 'MC', '2. KiLLKiSS／Ave Mujica', '安可', '詩超絆／MyGO!!!!!'].join(String.fromCharCode(10)) }} />],
  // 沒有 localStorage 紀錄時本來就該整行不出現
  ['ResumeLine(沒紀錄)', <ResumeLine events={events} onSelect={noop} />, { mayBeEmpty: true }],
  // 伺服器端沒有 UA 也沒有 localStorage，所以這張卡在 render 當下是空的，
  // 等 mount 之後才決定要顯示哪一種。空輸出是正確行為。
  ['InstallCard(伺服器端)', <InstallCard />, { mayBeEmpty: true }],
  // 第一次來的人沒有基準，整塊不出現 —— 這是正確行為
  ['NewSince(第一次來)', <NewSince events={events} onSelect={noop} />, { mayBeEmpty: true }],
  ['OfficialLinks', <OfficialLinks links={['https://x.com/a', 'https://www.eventernote.com/actors/1', 'https://example.tw/']} />],
  ['OfficialLinks(沒連結)', <OfficialLinks links={[]} />, { mayBeEmpty: true }],
  ['YearRing', <YearRing events={events} onSelect={noop} />],
  ['GapChart', <GapChart events={events} onSelect={noop} />],
  ['CityBars', <CityBars events={events} />],
  ['FirstsTable', <FirstsTable events={events} onSelect={noop} />],
  // 空資料：新頁面最容易在「還沒載到資料」那一瞬間爆掉
  ['VenuePage(空資料)', <VenuePage value="x" events={[]} onSelect={noop} onClose={noop} />],
  ['YearRing(空資料)', <YearRing events={[]} onSelect={noop} />],
  ['GapChart(空資料)', <GapChart events={[]} onSelect={noop} />, { mayBeEmpty: true }],
  ['CityBars(空資料)', <CityBars events={[]} />, { mayBeEmpty: true }],
  ['RelationBars', <RelationBars events={events} />],
  ['RelationBars(空資料)', <RelationBars events={[]} />, { mayBeEmpty: true }],
  // 票價與曲目現在都沒資料，整塊不出現才是對的；有資料的情境自己造
  ['ArchiveStats(沒資料)', <ArchiveStats events={events} onSelect={noop} />, { mayBeEmpty: true }],
  ['ArchiveStats(有資料)', <ArchiveStats onSelect={noop} events={[
    { ...events[0], price: '800', setlist: '1. A' },
    { ...events[1], price: '4800', setlist: '1. A' },
  ]} />],
  // 史料層：現在 Sheet 還沒有這些欄，所以測試自己造一筆有資料的。
  // 注意整份 CASES 寫在上面 ENTRY 的 template literal 裡，字串的換行要多
  // 跳脫一層；連註解裡都不能出現落單的反斜線，不然註解會被截成半行。
  ['ArchiveSection', <ArchiveSection color="#8b5cf6" glow="139,92,246" allEvents={[]} event={{
    id: 'x', title: 'demo',
    setlist: ['1. STAR BEAT!〜ホシノコドウ', '2. 天下トーイツ A to Z☆', '安可', 'Returns'].join('\\n'),
    price: '搖滾區 3800 / 座位區 2800',
    goods: ['場刊 400', '台版限定壓克力立牌 800'].join('\\n'),
    keyVisual: '某某繪師 https://example.tw/kv',
  }} />],
  ['MissingLine', <MissingLine event={one} color="#8b5cf6" />],
  ['MissingLine(未來場次)', <MissingLine event={{ ...one, startDate: '2099-01-01' }} color="#8b5cf6" />, { mayBeEmpty: true }],
  ['ArchiveSection(沒資料)', <ArchiveSection event={{ id: 'x', title: 'demo' }} allEvents={[]} color="#8b5cf6" glow="139,92,246" />, { mayBeEmpty: true }],
  ['FirstsTable(空資料)', <FirstsTable events={[]} onSelect={noop} />],
  ['YearTimeline', <YearTimeline events={events} onSelect={noop} />],
  ['StatsInsights', <StatsInsights events={events} />],
  ['LifeTimeline', <LifeTimeline list={events} color="#8b5cf6" glow="139,92,246" onSelect={noop} />],
  ['Primer', <Primer />],
  ['InstallHint(沒觸發)', <InstallHint />, { mayBeEmpty: true }],
  ['IOSInstallCard', <IOSInstallCard onClose={noop} />],
  ['PromptInstallCard', <PromptInstallCard prompt={{ prompt: noop, userChoice: Promise.resolve() }} onClose={noop} />],
  ['BottomNav', <BottomNav tabs={[['home','首頁','house'],['collection','活動','grid'],['me','我的','circle-check']]} page="home" onGo={noop} />],
  ['Chronicle', <Chronicle event={events.find(e => e.startDate)} allEvents={events} pulse={pulseRows} color="#8b5cf6" glow="139,92,246" onNavigate={noop} />],
  ['Chronicle(沒資料)', <Chronicle event={{ id: 'x', title: '孤島活動' }} allEvents={[]} pulse={[]} color="#8b5cf6" glow="139,92,246" onNavigate={noop} />, { mayBeEmpty: true }],
  ['JustAnnounced', <JustAnnounced events={events} onSelect={noop} />],
  ['ChangeFeed', <ChangeFeed events={events} onSelect={noop} />],
]

export { renderToStaticMarkup }
`

mkdirSync(OUT_DIR, { recursive: true })
const result = await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, sourcefile: 'smoke-entry.jsx', loader: 'jsx' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  write: false,
  logLevel: 'silent',
  loader: { '.jsx': 'jsx', '.js': 'jsx' },
  // react 系列保持 external：react-dom/server 是 CJS 且會 require('stream')，
  // 打包進來會在 ESM 裡爆掉。交給 Node 自己解析就好。
  external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
})
writeFileSync(OUT, result.outputFiles[0].text)

let mod
try {
  mod = await import(pathToFileURL(OUT).href)
} finally {
  rmSync(OUT, { force: true })
}

const failures = []
for (const [name, el, opt = {}] of mod.CASES) {
  try {
    const html = mod.renderToStaticMarkup(el)
    if (!opt.mayBeEmpty && (!html || html.length < 20)) {
      throw new Error(`輸出過短（${html.length} bytes），可能整個沒 render`)
    }
    console.log(`  ✓ ${name.padEnd(22)} ${String(html.length).padStart(7)} bytes${opt.mayBeEmpty && !html ? '  （刻意留空）' : ''}`)
  } catch (e) {
    failures.push([name, e])
    console.log(`  ✗ ${name.padEnd(22)} ${e.message.split('\n')[0]}`)
  }
}

console.log(`\n煙霧測試 ${mod.CASES.length} 個畫面`)
if (failures.length) {
  console.error(`\n✗ ${failures.length} 個畫面 render 失敗`)
  for (const [name, e] of failures) console.error(`\n--- ${name} ---\n${e.stack}`)
  process.exit(1)
}
console.log('✓ 全部 render 成功')
