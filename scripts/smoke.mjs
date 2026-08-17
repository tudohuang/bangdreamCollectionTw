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
import EventWall from './src/components/EventWall.jsx'
import EventCard from './src/components/EventCard.jsx'
import EventDetail from './src/components/EventDetail.jsx'
import PeoplePage from './src/components/PeoplePage.jsx'
import ProfilePage from './src/components/ProfilePage.jsx'
import MePage from './src/components/MePage.jsx'
import StatsPanel from './src/components/StatsPanel.jsx'
import OtherHalf from './src/components/OtherHalf.jsx'
import VenueMap from './src/components/VenueMap.jsx'
import YearReview from './src/components/YearReview.jsx'
import CollectionStrip from './src/components/CollectionStrip.jsx'
import Footer from './src/components/Footer.jsx'
import Contribute from './src/components/Contribute.jsx'
import CommandPalette from './src/components/CommandPalette.jsx'
import UrgentBar from './src/components/UrgentBar.jsx'
import ResultBar from './src/components/ResultBar.jsx'
import PulsePage from './src/components/PulsePage.jsx'
import { parseRosterCsv, parsePulseCsv } from './src/utils/parsePulse.js'
import { milestoneMap } from './src/utils/milestones.js'
import { sortChrono } from './src/utils/context.js'

const noop = () => {}
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
  ['ProfilePage(找不到)', <ProfilePage kind="person" value="不存在的人" events={events} attended={attended} onSelect={noop} onClose={noop} />],
  ['MePage(有紀錄)', <MePage events={events} attended={attended} onToggleAttended={noop} onSelect={noop} onBrowse={noop} />],
  ['MePage(空)', <MePage events={events} attended={new Set()} onToggleAttended={noop} onSelect={noop} onBrowse={noop} />],
  ['StatsPanel', <StatsPanel events={events} />],
  ['OtherHalf', <OtherHalf events={events} />],
  ['VenueMap(無座標)', <VenueMap events={events} />],
  ['VenueMap(有座標)', <VenueMap events={events.map((e, i) => i % 4 ? e : ({ ...e, extras: { ...(e.extras || {}), '座標': (25.02 + i * 0.004) + ', ' + (121.5 + i * 0.006) } }))} />],
  ['YearReview', <YearReview events={events} />],
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
