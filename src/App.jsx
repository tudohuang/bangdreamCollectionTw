import { useEffect, useLayoutEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'

import { useEvents } from './hooks/useEvents.js'
import { usePulse } from './hooks/usePulse.js'
import { useSongMeta } from './hooks/useSongMeta.js'

// 首頁與圖鑑一定會用到的直接進主包，其餘按頁面切開
import ThisMonth from './components/ThisMonth.jsx'
import ArchivePage from './components/ArchivePage.jsx'
import AppHeader from './components/AppHeader.jsx'
import UrgentBar from './components/UrgentBar.jsx'
import Reveal from './components/Reveal.jsx'
import Footer from './components/Footer.jsx'
import Icon from './components/Icon.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ProfileRoute from './components/ProfileRoute.jsx'
import { PageFallback, BottomNav, PullToRefresh, DataStatus, Analytics } from './components/Chrome.jsx'

import { readHash, writeHash } from './utils/url.js'
import { milestoneMap } from './utils/milestones.js'
import { rememberSeen } from './utils/lastSeen.js'
import { urgentEvents } from './utils/urgency.js'
import { getAttended, saveAttended } from './utils/attended.js'
import { tap, done } from './utils/haptics.js'
import { loadWebFonts } from './utils/webfonts.js'
import {
  DEFAULT_FILTERS, applyFiltersDetailed, orderEvents,
  filtersToParams, paramsToFilters,
} from './utils/filters.js'

const EventDetail = lazy(() => import('./components/EventDetail.jsx'))
const PeoplePage = lazy(() => import('./components/PeoplePage.jsx'))
const LabsPage = lazy(() => import('./components/LabsPage.jsx'))
const MePage = lazy(() => import('./components/MePage.jsx'))
const SongsPage = lazy(() => import('./components/SongsPage.jsx'))
const FriendsPage = lazy(() => import('./components/FriendsPage.jsx'))
const StatsPanel = lazy(() => import('./components/StatsPanel.jsx'))
const VenueMap = lazy(() => import('./components/VenueMap.jsx'))
const OtherHalf = lazy(() => import('./components/OtherHalf.jsx'))
const YearWall = lazy(() => import('./components/YearWall.jsx'))
const YearTimeline = lazy(() => import('./components/YearTimeline.jsx'))
const ChangeLogSection = lazy(() => import('./components/ChangeLogSection.jsx'))
const Contribute = lazy(() => import('./components/Contribute.jsx'))

// 主導覽只有四個分頁，各自只負責一件事：
//   本月＝現在有什麼、資料庫＝查與考古、索引＝人／團／場館、統計＝整體輪廓。
// 「我的」在頁首的圖示；歌曲、Labs、好站連結從頁尾進（網址都還在，舊連結照樣打得開）。
const PAGE_TABS = [
  ['home', '本月', 'calendar-days'],
  ['collection', '資料庫', 'table'],
  ['people', '索引', 'users'],
  ['stats', '統計', 'chart-simple'],
]
const SIMPLE_PAGES = ['people', 'stats', 'me', 'labs', 'songs', 'links']
// 舊連結（#/pulse）還在外面流通，靜靜導到 Labs
const PAGE_ALIAS = { pulse: 'labs' }
// 統計頁的區塊，由上而下：結論與圖表 → 年度時間軸 → 場館 → 只來過一次 → 封面牆 → 更新日誌 → 投稿
const STATS_SECTIONS = [StatsPanel, YearTimeline, VenueMap, OtherHalf, YearWall, ChangeLogSection, Contribute]

const scrollToTop = () =>
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))

export default function App() {
  const { events, source, updatedAt, retry } = useEvents()
  const { roster, pulse, source: pulseSource } = usePulse()
  // Sheet 的「歌曲」分頁（選填）：歌本身的資料，沒建那張表就是空的 Map
  const songMeta = useSongMeta()

  const [page, setPage] = useState('home')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [detailId, setDetailId] = useState(null)
  const [profile, setProfile] = useState(null)          // { kind: 'person' | 'band', value }
  // 頁首的搜尋框（⌘K 與 / 都跳到這裡）
  const searchRef = useRef(null)
  const [attended, setAttended] = useState(getAttended)
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
  const headerRef = useRef(null)

  const urgent = useMemo(() => urgentEvents(events), [events])
  // detailed 會告訴我們這批結果是不是靠錯字容錯撈回來的 ——
  // 撈回來卻不講，使用者會以為自己打對了
  const result = useMemo(
    () => applyFiltersDetailed(events, filters, attended),
    [events, filters, attended])
  const filtered = useMemo(
    () => orderEvents(result.list, filters.order),
    [result, filters.order])
  // 里程碑要對全部場次算，用篩選後的算會得到假的名次
  const milestones = useMemo(() => milestoneMap(events), [events])
  const detailEvent = useMemo(
    () => (detailId ? events.find(e => e.id === detailId) : null),
    [detailId, events])

  // 詳情浮層的 ← → 是在目前的篩選結果裡移動
  const neighbors = useMemo(() => {
    const i = detailId ? filtered.findIndex(e => e.id === detailId) : -1
    if (i === -1) return { prevId: null, nextId: null }
    return { prevId: filtered[i - 1]?.id || null, nextId: filtered[i + 1]?.id || null }
  }, [detailId, filtered])

  // 字型等第一個畫面畫出來再載，原因寫在 utils/webfonts.js
  useEffect(() => { loadWebFonts() }, [])

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
      if (['person', 'band', 'org', 'venue', 'series', 'song'].includes(h.route)) {
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
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
        e.preventDefault()
        searchRef.current?.focus()
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

  const openDetail = (id) => openOverlay(() => {
    setDetailId(id)
    writeHash('event', { id })
    // 記住看到哪，回訪時不用從頭滾。只存在瀏覽器裡（見 utils/lastSeen.js）
    rememberSeen(id)
  })

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

  // 頁首搜尋：在哪一頁打字都直接帶到資料庫，條件從乾淨的開始
  const searchFromHeader = (q) => {
    if (page === 'collection' && !profile) return updateFilters({ search: q })
    pushedOverlay.current = false
    setProfile(null)
    setPage('collection')
    const next = { ...DEFAULT_FILTERS, search: q }
    setFilters(next)
    writeHash('collection', { params: filtersToParams(next) })
    scrollMem.current.set('collection', 0)
  }

  // 從本月頁跳到資料庫，帶著一組條件（例如「只看即將舉行」）
  const browse = (patch = {}) => {
    pushedOverlay.current = false
    setProfile(null)
    setPage('collection')
    const next = { ...DEFAULT_FILTERS, ...patch }
    setFilters(next)
    writeHash('collection', { params: filtersToParams(next) })
    scrollMem.current.set('collection', 0)
    scrollToTop()
  }


  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <PullToRefresh onRefresh={retry} />

      {/* 跳轉鍵不能靠 href 的 hash：這站的 hash 就是路由，#wall／#main 都會被當成「回首頁」。
         所以自己接：擋掉預設行為，直接把焦點放到 <main>（每一頁都有）再捲過去 */}
      <a href="#main"
        onClick={(ev) => {
          ev.preventDefault()
          const el = document.getElementById('main')
          if (!el) return
          el.focus({ preventScroll: true })
          el.scrollIntoView({ block: 'start' })
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-bloom-indigo focus:text-white focus:text-[14px]">
        跳到主要內容
      </a>

      <header ref={headerRef} className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-dream-line/70 dark:bg-[#0b0a24]/75 dark:border-white/10">
        <AppHeader
          tabs={PAGE_TABS}
          page={page}
          title={profile ? profile.value : ''}
          onGo={goPage}
          onBack={profile ? closeProfile : null}
          search={page === 'collection' && !profile ? filters.search : ''}
          onSearch={searchFromHeader}
          inputRef={searchRef}
          meOn={page === 'me' && !profile}
          onMe={() => goPage('me')}
          linksOn={page === 'links' && !profile}
          onLinks={() => goPage('links')}
          dark={dark}
          onToggleDark={toggleDark}
        />
        <DataStatus source={source} updatedAt={updatedAt} onRetry={retry} />
        <UrgentBar events={urgent} onSelect={openDetail} />
      </header>

      <main id="main" tabIndex={-1} key={viewKey} className="outline-none view-enter relative z-10 max-w-6xl xl:max-w-[1400px] 2xl:max-w-[1560px] w-full mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-28 sm:pb-24 flex-1">
        {profile ? (
          <ProfileRoute
            profile={profile}
            events={events}
            attended={attended}
            sheetRoster={roster}
            songMeta={songMeta}
            onToggleAttended={toggleAttended}
            onSelect={openDetail}
            onClose={closeProfile}
            fallback={<PageFallback h={520} />}
          />

        ) : page === 'collection' ? (
          <ErrorBoundary>
            <ArchivePage
              events={events}
              filtered={filtered}
              fuzzy={result.fuzzy}
              filters={filters}
              onChange={updateFilters}
              onReset={resetFilters}
              onSelect={openDetail}
              attended={attended}
              onToggleAttended={toggleAttended}
              milestones={milestones}
            />
          </ErrorBoundary>

        ) : page === 'people' ? (
          <ErrorBoundary><Suspense fallback={<PageFallback h={520} />}>
            <PeoplePage events={events} onSelect={openDetail} sheetRoster={roster} />
          </Suspense></ErrorBoundary>

        ) : page === 'labs' ? (
          <ErrorBoundary><Suspense fallback={<PageFallback h={520} />}>
            <LabsPage roster={roster} pulse={pulse} events={events} attended={attended}
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

        ) : page === 'songs' ? (
          <ErrorBoundary><Suspense fallback={<PageFallback h={520} />}>
            <SongsPage events={events} songMeta={songMeta} onClose={() => goPage('stats')} />
          </Suspense></ErrorBoundary>

        ) : page === 'links' ? (
          <ErrorBoundary><Suspense fallback={<PageFallback h={420} />}>
            <FriendsPage />
          </Suspense></ErrorBoundary>

        ) : page === 'me' ? (
          <ErrorBoundary><Suspense fallback={<PageFallback h={420} />}>
            <MePage events={events} attended={attended}
              onToggleAttended={toggleAttended} onReplaceAttended={replaceAttended}
              onSelect={openDetail} onBrowse={() => goPage('collection')} />
          </Suspense></ErrorBoundary>

        ) : (
          <>
            <ErrorBoundary><ThisMonth events={events} onSelect={openDetail} onBrowse={browse} /></ErrorBoundary>
          </>
        )}
      </main>

      <Footer source={source} updatedAt={updatedAt} onRetry={retry} />
      <BottomNav tabs={PAGE_TABS} page={profile ? null : page} onGo={goPage} />
      <Analytics />

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
            sheetRoster={roster}
          />
        </Suspense>
      )}
    </div>
  )
}
