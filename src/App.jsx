import { useEffect, useLayoutEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'

import { useEvents } from './hooks/useEvents.js'
import { usePulse } from './hooks/usePulse.js'
import { useMediaQuery } from './hooks/useMediaQuery.js'

// 首頁與圖鑑一定會用到的直接進主包，其餘按頁面切開
import Hero from './components/Hero.jsx'
import MonthlyDigest from './components/MonthlyDigest.jsx'
import Highlights from './components/Highlights.jsx'
import OnThisDay from './components/OnThisDay.jsx'
import Primer from './components/Primer.jsx'
import FilterPanel from './components/FilterPanel.jsx'
import EventWall from './components/EventWall.jsx'
import ResultBar from './components/ResultBar.jsx'
import UrgentBar from './components/UrgentBar.jsx'
import Reveal from './components/Reveal.jsx'
import Footer from './components/Footer.jsx'
import Icon from './components/Icon.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { PageFallback, ScrollProgress, FloatingDock, BottomNav, MobileAppBar, PullToRefresh, InstallHint, Analytics } from './components/Chrome.jsx'

import { readHash, writeHash } from './utils/url.js'
import { todayStr, daysUntil } from './utils/datetime.js'
import { milestoneMap } from './utils/milestones.js'
import { urgentEvents } from './utils/urgency.js'
import { downloadIcs } from './utils/ics.js'
import { getAttended, saveAttended } from './utils/attended.js'
import { tap, done } from './utils/haptics.js'
import { CF_ANALYTICS_TOKEN } from './config.js'
import {
  DEFAULT_FILTERS, applyFilters, orderEvents,
  filtersToParams, paramsToFilters, buildAppliedChips,
} from './utils/filters.js'

const EventDetail = lazy(() => import('./components/EventDetail.jsx'))
const ProfilePage = lazy(() => import('./components/ProfilePage.jsx'))
const PeoplePage = lazy(() => import('./components/PeoplePage.jsx'))
const LabsPage = lazy(() => import('./components/LabsPage.jsx'))
const OrganizerPage = lazy(() => import('./components/OrganizerPage.jsx'))
const MePage = lazy(() => import('./components/MePage.jsx'))
const StatsPanel = lazy(() => import('./components/StatsPanel.jsx'))
const VenueMap = lazy(() => import('./components/VenueMap.jsx'))
const OtherHalf = lazy(() => import('./components/OtherHalf.jsx'))
const YearWall = lazy(() => import('./components/YearWall.jsx'))
const YearTimeline = lazy(() => import('./components/YearTimeline.jsx'))
const ChangeLogSection = lazy(() => import('./components/ChangeLogSection.jsx'))
const Contribute = lazy(() => import('./components/Contribute.jsx'))
const CommandPalette = lazy(() => import('./components/CommandPalette.jsx'))

// 六個分頁，各自只負責一件事：
// 首頁＝現在、活動＝歷史、人物＝人、統計＝故事、我的＝個人化、Labs＝實驗。
const PAGE_TABS = [
  ['home', '首頁', 'house'],
  ['collection', '活動', 'grid'],
  ['people', '人物', 'microphone'],
  ['stats', '統計', 'chart-simple'],
  ['me', '我的', 'circle-check'],
  ['labs', 'Labs', 'wand-magic-sparkles'],
]
const SIMPLE_PAGES = ['people', 'stats', 'me', 'labs']
// 舊連結（#/pulse）還在外面流通，靜靜導到 Labs
const PAGE_ALIAS = { pulse: 'labs' }
// 統計頁的區塊，由上而下：結論與圖表 → 年度時間軸 → 場館 → 只來過一次 → 封面牆 → 更新日誌 → 投稿
const STATS_SECTIONS = [StatsPanel, YearTimeline, VenueMap, OtherHalf, YearWall, ChangeLogSection, Contribute]

const scrollToTop = () =>
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))

export default function App() {
  const { events, source, updatedAt, retry } = useEvents()
  const { roster, pulse, source: pulseSource } = usePulse()

  const [page, setPage] = useState('home')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [detailId, setDetailId] = useState(null)
  const [profile, setProfile] = useState(null)          // { kind: 'person' | 'band', value }
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [attended, setAttended] = useState(getAttended)
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
  const headerRef = useRef(null)

  // 1024–1280 這段螢幕夠寬，橫條卻會拉得很長，所以側欄提前到 lg 就出現
  const wideLayout = useMediaQuery('(min-width: 1024px)')

  const urgent = useMemo(() => urgentEvents(events), [events])
  const filtered = useMemo(
    () => orderEvents(applyFilters(events, filters, attended), filters.order),
    [events, filters, attended])
  // 里程碑要對全部場次算，用篩選後的算會得到假的名次
  const milestones = useMemo(() => milestoneMap(events), [events])
  const appliedChips = useMemo(() => buildAppliedChips(filters), [filters])
  const detailEvent = useMemo(
    () => (detailId ? events.find(e => e.id === detailId) : null),
    [detailId, events])

  // 篩不到東西時拿來推薦：離今天最近的三場
  const nearest = useMemo(() => {
    const today = todayStr()
    return events
      .filter(e => e.startDate)
      .map(e => ({ event: e, distance: Math.abs(daysUntil(e.startDate, today) ?? Infinity) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(o => o.event)
  }, [events])

  // 詳情浮層的 ← → 是在目前的篩選結果裡移動
  const neighbors = useMemo(() => {
    const i = detailId ? filtered.findIndex(e => e.id === detailId) : -1
    if (i === -1) return { prevId: null, nextId: null }
    return { prevId: filtered[i - 1]?.id || null, nextId: filtered[i + 1]?.id || null }
  }, [detailId, filtered])

  useEffect(() => {
    document.documentElement.classList.toggle('urgent-mode', urgent.length > 0)
  }, [urgent.length])

  // 緊急橫幅會把頁首撐高，底下 sticky 的元件要跟著往下讓，所以量真實高度寫進 CSS 變數
  useEffect(() => {
    const el = headerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const sync = () =>
      document.documentElement.style.setProperty('--sticky-top', `${Math.round(el.offsetHeight)}px`)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 網址 hash 是唯一的路由來源；上一頁／下一頁與分享連結都靠它
  useEffect(() => {
    const sync = () => {
      const h = readHash()
      if (h.route === 'event') {
        setDetailId(h.id)                 // 詳情是浮層，不動底下的頁面
        return
      }
      setDetailId(null)
      if (h.route === 'person' || h.route === 'band' || h.route === 'org') {
        setProfile({ kind: h.route, value: h.value })
        return
      }
      // 回到一般頁面代表浮層已經退掉了
      pushedOverlay.current = false
      setProfile(null)
      const route = PAGE_ALIAS[h.route] || h.route
      if (route === 'collection') {
        setPage('collection')
        setFilters({ ...DEFAULT_FILTERS, ...paramsToFilters(h.params) })
      } else if (SIMPLE_PAGES.includes(route)) {
        setPage(route)
      } else {
        setPage('home')
      }
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    const base = '邦邦來台圖鑑'
    document.title = detailEvent
      ? `#${String(detailEvent.number).padStart(3, '0')} ${detailEvent.title}｜${base}`
      : `${base} · Taiwan BanG Dream! Event Collection`
  }, [detailEvent])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(open => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleDark = () => {
    setDark(prev => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      // 瀏覽器外框（Android 的網址列、iOS 加到主畫面後的狀態列）要跟著變，
      // 不然切了夜場模式，畫面是深的、上面那條還是白的
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.content = next ? '#07071a' : '#fdfaff'
      try { localStorage.setItem('bdtw-theme', next ? 'dark' : 'light') } catch {}
      return next
    })
  }

  const toggleAttended = (id) => {
    tap()
    setAttended(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveAttended(next)
      return next
    })
  }

  // 匯入備份碼：整份取代，不合併 —— 合併會讓「取消打卡」永遠救不回來
  const replaceAttended = (ids) => {
    done()
    const next = new Set(ids)
    saveAttended(next)
    setAttended(next)
  }

  // 每個畫面各自記住捲到哪，回來時放回去 —— App 都是這樣，網頁才會每次都彈回最上面。
  // 這個 effect 跑的時候頁面還沒被捲動，所以 window.scrollY 還是「舊畫面」的位置。
  const viewKey = profile ? `${profile.kind}:${profile.value}` : page
  const scrollMem = useRef(new Map())
  const prevView = useRef(viewKey)

  useLayoutEffect(() => {
    const from = prevView.current
    if (from === viewKey) return
    scrollMem.current.set(from, window.scrollY)
    prevView.current = viewKey
    const to = scrollMem.current.get(viewKey) ?? 0
    requestAnimationFrame(() => window.scrollTo({ top: to, behavior: 'auto' }))
  }, [viewKey])

  const goPage = (p) => {
    // 點的是目前這一頁 → 回到最上面，跟 App 的分頁列一樣
    if (p === page && !profile && !detailId) {
      scrollMem.current.set(p, 0)
      return scrollToTop()
    }
    pushedOverlay.current = false
    setProfile(null)
    setDetailId(null)
    setPage(p)
    if (p === 'collection') setFilters(DEFAULT_FILTERS)
    const hash = p === 'home' ? '#/' : `#/${p}`
    if (window.location.hash !== hash) history.pushState(null, '', hash)
  }

  // 浮層／子頁是「疊上去」的，關掉就該把它從歷史裡退掉，而不是再推一筆。
  // 不這樣做的話：開詳情 → 按 X → 按手機的返回鍵，詳情又跳出來。
  // 只有確定是自己推上去的才 back()，直接開分享連結進來的不能 back（會離開網站）。
  const pushedOverlay = useRef(false)

  const openOverlay = (fn) => { pushedOverlay.current = true; fn() }

  const closeOverlay = (fallback) => {
    if (pushedOverlay.current) {
      pushedOverlay.current = false
      history.back()          // hashchange 會接手把狀態改回來
    } else {
      fallback()
    }
  }

  const openDetail = (id) => openOverlay(() => { setDetailId(id); writeHash('event', { id }) })

  const closeDetail = () => closeOverlay(() => {
    setDetailId(null)
    // 直接開分享連結進來的：沒有上一頁可退，就退回它所屬的列表
    if (profile) writeHash(profile.kind, { value: profile.value }, { replace: true })
    else history.replaceState(null, '', page === 'home' ? '#/' : `#/${page}`)
  })

  const closeProfile = () => closeOverlay(() => {
    setProfile(null)
    history.replaceState(null, '', page === 'home' ? '#/' : `#/${page}`)
  })

  const jumpToYear = (year) => {
    setPage('collection')
    setFilters({ ...DEFAULT_FILTERS, year: year === 'all' ? 'all' : String(year) })
    writeHash('collection', { params: year === 'all' ? {} : { year: String(year) } })
    // 換條件＝換一批結果，記憶要作廢
    scrollMem.current.set('collection', 0)
    scrollToTop()
  }

  const updateFilters = (patch) => {
    // 搜尋是逐字輸入，用 replaceState 才不會每打一個字就多一筆瀏覽器歷史
    const replace = 'search' in patch
    setFilters(prev => {
      const next = { ...prev, ...patch }
      writeHash('collection', { params: filtersToParams(next) }, { replace })
      return next
    })
  }

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    history.pushState(null, '', '#/collection')
  }

  const openRandom = () => {
    if (events.length) openDetail(events[Math.floor(Math.random() * events.length)].id)
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <ScrollProgress />
      <PullToRefresh onRefresh={retry} />

      <a href="#wall"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-bloom-indigo focus:text-white focus:text-[13px]">
        跳到活動圖鑑
      </a>

      <header ref={headerRef} className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-dream-line/70 dark:bg-[#0b0a24]/75 dark:border-white/10">
        <MobileAppBar
          title={profile ? profile.value : (PAGE_TABS.find(([p]) => p === page)?.[1] || '邦邦來台圖鑑')}
          onBack={profile ? closeProfile : null}
          onSearch={() => setPaletteOpen(true)}
          onToggleDark={toggleDark}
          dark={dark}
        />
        <div className="hidden sm:flex max-w-6xl xl:max-w-[1400px] 2xl:max-w-[1560px] mx-auto px-4 sm:px-8 h-14 items-center justify-between gap-3">
          <a href="#/" onClick={(e) => { e.preventDefault(); goPage('home') }} className="flex items-center gap-2.5 group shrink-0">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-bloom-rose to-bloom-indigo text-white text-[13px] shadow-sm dark:shadow-[0_0_14px_-2px_rgba(217,70,239,0.6)]">
              <Icon n="music" />
            </span>
            <span className="font-display font-bold text-[16px] text-dream-ink group-hover:text-bloom-indigo transition-colors hidden min-[380px]:block">
              邦邦來台圖鑑
            </span>
          </a>

          <nav className="flex items-center gap-1 sm:gap-1.5 text-[13px] min-w-0 flex-1 sm:flex-none justify-end">
            <div className="hidden sm:flex items-center gap-0.5">
              {PAGE_TABS.map(([p, label, icon]) => (
                <button key={p} onClick={() => goPage(p)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors ${
                    page === p && !profile
                      ? 'bg-bloom-indigo text-white shadow-sm'
                      : 'text-dream-sub hover:text-dream-ink hover:bg-dream-line/60 dark:hover:bg-white/10'}`}>
                  <Icon n={icon} className="text-[11px] hidden sm:inline" />
                  {label}
                </button>
              ))}
            </div>
            {/* 分頁移到底部之後，手機頁首空出一整條 —— 搜尋直接攤開成主要入口 */}
            <button onClick={() => setPaletteOpen(true)} aria-label="快速搜尋"
              className="inline-flex items-center gap-2 h-9 flex-1 sm:flex-none px-3.5 sm:px-3.5 rounded-full border border-dream-line bg-white/60 text-dream-sub hover:text-dream-ink hover:border-bloom-sky hover:bg-white transition-colors dark:bg-white/[.06] dark:border-white/15 dark:hover:bg-white/10">
              <Icon n="magnifying-glass" className="text-[12px] shrink-0" />
              <span className="sm:hidden truncate text-[13px]">搜尋聲優、樂團、活動</span>
              <kbd className="hidden sm:inline text-[11px] text-dream-faint font-sans">⌘K</kbd>
            </button>
            <button onClick={toggleDark} aria-label="切換夜場模式" title={dark ? '切回淺色' : '夜場模式'} className="icon-btn">
              <Icon n={dark ? 'sun' : 'moon'} />
            </button>
          </nav>
        </div>
        <UrgentBar events={urgent} onSelect={openDetail} />
      </header>

      <main key={viewKey} className="view-enter relative z-10 max-w-6xl xl:max-w-[1400px] 2xl:max-w-[1560px] w-full mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-28 sm:pb-24 flex-1">
        {profile?.kind === 'org' ? (
          <ErrorBoundary><Suspense fallback={<PageFallback h={520} />}>
            <OrganizerPage
              value={profile.value}
              events={events}
              onSelect={openDetail}
              onClose={closeProfile}
            />
          </Suspense></ErrorBoundary>

        ) : profile ? (
          <ErrorBoundary><Suspense fallback={<PageFallback h={520} />}>
            <ProfilePage
              kind={profile.kind}
              value={profile.value}
              events={events}
              attended={attended}
              onToggleAttended={toggleAttended}
              onSelect={openDetail}
              onClose={closeProfile}
              sheetRoster={roster}
            />
          </Suspense></ErrorBoundary>

        ) : page === 'collection' ? (
          <section id="wall" className="scroll-mt-[var(--sticky-top)]">
            <ErrorBoundary>
              <div className="lg:grid lg:grid-cols-[254px_minmax(0,1fr)] xl:grid-cols-[268px_minmax(0,1fr)] lg:gap-6 xl:gap-8 lg:items-start">
                <div className="lg:sticky lg:top-[calc(var(--sticky-top)+16px)]">
                  <FilterPanel
                    events={events}
                    filters={filters}
                    onChange={updateFilters}
                    onReset={resetFilters}
                    resultCount={filtered.length}
                    variant={wideLayout ? 'sidebar' : 'bar'}
                    onExportIcs={() => downloadIcs(filtered, 'bangdream-tw.ics')}
                  />
                </div>

                {/* 有摘要條時，卡牆裡的年份站牌要再往下讓一條 */}
                <div className="min-w-0"
                  style={{ '--wall-top': appliedChips.length ? 'calc(var(--sticky-top) + 56px)' : 'var(--sticky-top)' }}>
                  <ResultBar
                    filters={filters}
                    onChange={updateFilters}
                    onReset={resetFilters}
                    count={filtered.length}
                    total={events.length}
                  />
                  <EventWall
                    events={filtered}
                    allEvents={events}
                    milestones={milestones}
                    view={filters.view}
                    attended={attended}
                    onToggleAttended={toggleAttended}
                    onSelect={openDetail}
                    onReset={resetFilters}
                    groupByYear={filters.order.startsWith('date')}
                    suggestions={nearest}
                    search={filters.search}
                  />
                </div>
              </div>
            </ErrorBoundary>
          </section>

        ) : page === 'people' ? (
          <ErrorBoundary><Suspense fallback={<PageFallback h={520} />}>
            <PeoplePage events={events} onSelect={openDetail} sheetRoster={roster} />
          </Suspense></ErrorBoundary>

        ) : page === 'labs' ? (
          <ErrorBoundary><Suspense fallback={<PageFallback h={520} />}>
            <LabsPage roster={roster} pulse={pulse} events={events}
              source={pulseSource} onSelectEvent={openDetail} />
          </Suspense></ErrorBoundary>

        ) : page === 'stats' ? (
          <Suspense fallback={<PageFallback h={560} />}>
            {STATS_SECTIONS.map((Section, i) => (
              <Reveal key={i} as="section" className="mt-14 sm:mt-20">
                <ErrorBoundary><Section events={events} onSelect={openDetail} /></ErrorBoundary>
              </Reveal>
            ))}
          </Suspense>

        ) : page === 'me' ? (
          <ErrorBoundary><Suspense fallback={<PageFallback h={420} />}>
            <MePage events={events} attended={attended}
              onToggleAttended={toggleAttended} onReplaceAttended={replaceAttended}
              onSelect={openDetail} onBrowse={() => goPage('collection')} />
          </Suspense></ErrorBoundary>

        ) : (
          <>
            <Hero events={events} onSelect={openDetail} onYearJump={jumpToYear} />
            <Primer />
            <ErrorBoundary><MonthlyDigest events={events} onSelect={openDetail} /></ErrorBoundary>
            <Reveal><ErrorBoundary><OnThisDay events={events} onSelect={openDetail} /></ErrorBoundary></Reveal>
            <Reveal><ErrorBoundary><Highlights events={events} onSelect={openDetail} /></ErrorBoundary></Reveal>
          </>
        )}
      </main>

      <Footer source={source} updatedAt={updatedAt} onRetry={retry} />
      <InstallHint />
      <BottomNav tabs={PAGE_TABS} page={profile ? null : page} onGo={goPage} />
      <FloatingDock onRandom={openRandom} />
      <Analytics token={CF_ANALYTICS_TOKEN} />

      <Suspense fallback={null}>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          events={events}
          onSelectEvent={openDetail}
        />
      </Suspense>

      {detailEvent && (
        <Suspense fallback={null}>
          <EventDetail
            event={detailEvent}
            allEvents={events}
            attended={attended}
            onToggleAttended={toggleAttended}
            onClose={closeDetail}
            prevId={neighbors.prevId}
            nextId={neighbors.nextId}
            milestones={milestones.get(detailEvent.id) || []}
            onNavigate={openDetail}
            pulse={pulse}
          />
        </Suspense>
      )}
    </div>
  )
}
