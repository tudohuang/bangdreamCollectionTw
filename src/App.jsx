import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { useEvents } from './hooks/useEvents.js'
import Hero from './components/Hero.jsx'
import MonthlyDigest from './components/MonthlyDigest.jsx'
import Highlights from './components/Highlights.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import PeoplePage from './components/PeoplePage.jsx'
import MePage from './components/MePage.jsx'
import OnThisDay from './components/OnThisDay.jsx'
import FilterPanel from './components/FilterPanel.jsx'
import EventWall from './components/EventWall.jsx'
import StatsPanel from './components/StatsPanel.jsx'
import YearReview from './components/YearReview.jsx'
import Contribute from './components/Contribute.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import Reveal from './components/Reveal.jsx'
import Footer from './components/Footer.jsx'
import Icon from './components/Icon.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { readHash, writeHash } from './utils/url.js'
import { rootGroup } from './utils/bands.js'
import { eventCharacters, detectCity } from './utils/derive.js'
import { coverOf } from './utils/media.js'
import { matchSearch } from './utils/search.js'
import { eventStatus, todayStr } from './utils/datetime.js'
import { getAttended, saveAttended } from './utils/attended.js'

const EventDetail = lazy(() => import('./components/EventDetail.jsx'))

const VIEW_SET = ['cards', 'timeline', 'table']

const DEFAULT_FILTERS = {
  year: 'all',
  groups: [], people: [], characters: [], types: [], venues: [], cities: [],
  category: 'all',     // all / 本體 / 擦邊
  fullBand: 'all',     // all / full
  attended: 'all',     // all / yes
  photos: 'all',       // all / yes（有封面/照片）
  timeframe: 'all',    // all / upcoming / past / thisYear / thisMonth
  search: '',
  view: 'cards',       // cards / timeline / table
  order: 'date-asc',   // date-asc / date-desc / attendance / number
}

const ARRAY_KEYS = ['groups', 'people', 'characters', 'types', 'venues', 'cities']
const PAGE_TABS = [
  ['home', '首頁', 'house'],
  ['collection', '圖鑑', 'grid'],
  ['people', '聲優', 'microphone'],
  ['stats', '數據', 'chart-simple'],
  ['me', '我的', 'circle-check'],
]

function applyFilters(events, f, attended) {
  const today = todayStr()
  const now = new Date()
  return events.filter(e => {
    if (f.year !== 'all' && e.year !== Number(f.year)) return false
    if (f.groups.length && !f.groups.some(g => (e.relatedGroups || []).some(rg => rootGroup(rg) === g))) return false
    if (f.people.length && !f.people.some(p => (e.people || []).includes(p))) return false
    if (f.characters.length && !f.characters.some(c => eventCharacters(e).includes(c))) return false
    if (f.types.length && !f.types.includes(e.type)) return false
    if (f.venues.length && !f.venues.includes(e.venue)) return false
    if (f.cities.length && !f.cities.includes(detectCity(e))) return false
    if (f.category !== 'all' && e.category !== f.category) return false
    if (f.fullBand === 'full' && !e.isFullBand) return false
    if (f.attended === 'yes' && !attended.has(e.id)) return false
    if (f.photos === 'yes' && !coverOf(e)) return false
    if (f.timeframe !== 'all') {
      const st = eventStatus(e, today)
      if (f.timeframe === 'upcoming' && !(st === 'upcoming' || st === 'ongoing')) return false
      if (f.timeframe === 'past' && st !== 'past') return false
      if (f.timeframe === 'thisYear' && e.year !== now.getFullYear()) return false
      if (f.timeframe === 'thisMonth' && (e.year !== now.getFullYear() || e.month !== now.getMonth() + 1)) return false
    }
    if (!matchSearch(e, f.search)) return false
    return true
  })
}

// 無日期的活動（如「日期未定」）一律排到最後，不要因空字串頂到列表最前
const byDate = (dir) => (x, y) => {
  const dx = x.startDate || '', dy = y.startDate || ''
  if (!dx && !dy) return 0
  if (!dx) return 1
  if (!dy) return -1
  return dir === 'desc' ? dy.localeCompare(dx) : dx.localeCompare(dy)
}

function orderEvents(events, order) {
  const a = [...events]
  if (order === 'date-desc') a.sort(byDate('desc'))
  else if (order === 'attendance') a.sort((x, y) => (y.attendanceCount || 0) - (x.attendanceCount || 0))
  else if (order === 'number') a.sort((x, y) => (x.number || 0) - (y.number || 0))
  else a.sort(byDate('asc'))
  return a
}

// 篩選 <-> URL 參數（陣列用逗號串）
function filtersToParams(f) {
  const p = {}
  for (const k of ARRAY_KEYS) if (f[k]?.length) p[k] = f[k].join(',')
  for (const k of ['year', 'category', 'fullBand', 'attended', 'photos', 'timeframe', 'search', 'view', 'order']) {
    if (f[k] && f[k] !== DEFAULT_FILTERS[k]) p[k] = f[k]
  }
  return p
}
function paramsToFilters(params) {
  const f = {}
  for (const k of ARRAY_KEYS) if (params[k]) f[k] = params[k].split(',').filter(Boolean)
  for (const k of ['year', 'category', 'fullBand', 'attended', 'photos', 'timeframe', 'search', 'view', 'order']) {
    if (params[k] != null) f[k] = params[k]
  }
  // 舊網址的 gallery / year / calendar 檢視已合併，一律退回卡片
  if (f.view && !VIEW_SET.includes(f.view)) f.view = 'cards'
  return f
}

export default function App() {
  const { events, source, updatedAt, retry } = useEvents()
  const [page, setPage] = useState('home')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [detailId, setDetailId] = useState(null)
  const [profile, setProfile] = useState(null)  // {kind:'person'|'band', value} | null
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [attended, setAttended] = useState(() => getAttended())
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const sync = () => {
      const h = readHash()
      if (h.route === 'event') {
        setDetailId(h.id)   // 詳情用浮層蓋在現有頁面上，不動 page/profile
      } else if (h.route === 'person' || h.route === 'band') {
        setDetailId(null)
        setProfile({ kind: h.route, value: h.value })
        scrollToTop()
      } else if (h.route === 'collection') {
        setDetailId(null); setProfile(null)
        setPage('collection')
        setFilters({ ...DEFAULT_FILTERS, ...paramsToFilters(h.params) })
      } else if (h.route === 'people' || h.route === 'stats' || h.route === 'me') {
        setDetailId(null); setProfile(null)
        setPage(h.route)
        scrollToTop()
      } else {
        setDetailId(null); setProfile(null)
        setPage('home')
      }
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const toggleDark = () => {
    setDark(d => {
      const next = !d
      document.documentElement.classList.toggle('dark', next)
      try { localStorage.setItem('bdtw-theme', next ? 'dark' : 'light') } catch {}
      return next
    })
  }

  const toggleAttended = (id) => {
    setAttended(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveAttended(next)
      return next
    })
  }

  const filtered = useMemo(
    () => orderEvents(applyFilters(events, filters, attended), filters.order),
    [events, filters, attended])
  const detailEvent = useMemo(
    () => (detailId ? events.find(e => e.id === detailId) : null),
    [detailId, events])
  const neighbors = useMemo(() => {
    if (!detailId) return { prevId: null, nextId: null }
    const i = filtered.findIndex(e => e.id === detailId)
    if (i === -1) return { prevId: null, nextId: null }
    return { prevId: filtered[i - 1]?.id || null, nextId: filtered[i + 1]?.id || null }
  }, [detailId, filtered])

  // #18 動態標題
  useEffect(() => {
    const base = '邦邦來台圖鑑'
    document.title = detailEvent
      ? `#${String(detailEvent.number).padStart(3, '0')} ${detailEvent.title}｜${base}`
      : `${base} · Taiwan BanG Dream! Event Collection`
  }, [detailEvent])

  // ⌘K / Ctrl+K 開啟快速搜尋
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const goPage = (p) => {
    setProfile(null); setDetailId(null)
    setPage(p)
    if (p === 'collection') setFilters(DEFAULT_FILTERS)
    const hash = p === 'home' ? '#/' : `#/${p}`
    if (window.location.hash !== hash) history.pushState(null, '', hash)
    scrollToTop()
  }

  const handleOpenDetail = (id) => { setDetailId(id); writeHash('event', { id }) }
  const handleRandom = () => {
    if (!events.length) return
    handleOpenDetail(events[Math.floor(Math.random() * events.length)].id)
  }
  const handleCloseDetail = () => {
    setDetailId(null)
    // 從某個圖鑑頁點開的，關閉後回到那一頁；否則回原頁
    if (profile) writeHash(profile.kind, { value: profile.value })
    else if (window.location.hash.startsWith('#/event/')) {
      history.pushState(null, '', page === 'home' ? '#/' : `#/${page}`)
    }
  }
  const handleCloseProfile = () => {
    setProfile(null)
    history.pushState(null, '', page === 'home' ? '#/' : `#/${page}`)
    scrollToTop()
  }
  const handleYearJump = (year) => {
    setPage('collection')
    setFilters({ ...DEFAULT_FILTERS, year: year === 'all' ? 'all' : String(year) })
    writeHash('collection', { params: year === 'all' ? {} : { year: String(year) } })
    scrollToTop()
  }

  const updateFilters = (patch) => {
    // 搜尋是即時輸入：用 replaceState，避免每打一個字就塞一筆瀏覽器歷史
    const replace = 'search' in patch
    setFilters(f => {
      const next = { ...f, ...patch }
      writeHash('collection', { params: filtersToParams(next) }, { replace })
      return next
    })
  }
  const resetFilters = () => { setFilters(DEFAULT_FILTERS); history.pushState(null, '', '#/collection') }

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <ScrollProgress />

      <a href="#wall"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-bloom-indigo focus:text-white focus:text-[13px]">
        跳到活動圖鑑
      </a>

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-dream-line/70 dark:bg-[#0b0a24]/75 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-3">
          <a href="#/" onClick={(e) => { e.preventDefault(); goPage('home') }} className="flex items-center gap-2.5 group shrink-0">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-bloom-rose to-bloom-indigo text-white text-[13px] shadow-sm dark:shadow-[0_0_14px_-2px_rgba(217,70,239,0.6)]"><Icon n="music" /></span>
            <span className="font-display font-bold text-[16px] text-dream-ink group-hover:text-bloom-indigo transition-colors hidden min-[380px]:block">
              邦邦來台圖鑑
            </span>
          </a>
          <nav className="flex items-center gap-1 sm:gap-1.5 text-[13px] min-w-0">
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
              {PAGE_TABS.map(([p, label, icon]) => {
                const active = page === p && !profile
                return (
                  <button key={p} onClick={() => goPage(p)}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors ${
                      active
                        ? 'bg-bloom-indigo text-white shadow-sm'
                        : 'text-dream-sub hover:text-dream-ink hover:bg-dream-line/60 dark:hover:bg-white/10'}`}>
                    <Icon n={icon} className="text-[11px] hidden sm:inline" />
                    {label}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="快速搜尋"
              className="inline-flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:px-3.5 rounded-full border border-dream-line bg-white/60 text-dream-sub hover:text-dream-ink hover:border-bloom-sky hover:bg-white transition-colors dark:bg-white/[.06] dark:border-white/15 dark:hover:bg-white/10"
            >
              <Icon n="magnifying-glass" className="text-[12px]" />
              <kbd className="hidden sm:inline text-[11px] text-dream-faint font-sans">⌘K</kbd>
            </button>
            <button onClick={toggleDark} aria-label="切換夜場模式" title={dark ? '切回淺色' : '夜場模式'} className="icon-btn">
              <Icon n={dark ? 'sun' : 'moon'} />
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-24 flex-1">
        {profile ? (
          <ErrorBoundary>
            <ProfilePage
              kind={profile.kind}
              value={profile.value}
              events={events}
              attended={attended}
              onToggleAttended={toggleAttended}
              onSelect={handleOpenDetail}
              onClose={handleCloseProfile}
            />
          </ErrorBoundary>
        ) : page === 'collection' ? (
          <section id="wall" className="scroll-mt-20">
            <ErrorBoundary>
              <FilterPanel
                events={events}
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
                resultCount={filtered.length}
              />
              <EventWall
                events={filtered}
                view={filters.view}
                attended={attended}
                onToggleAttended={toggleAttended}
                onSelect={handleOpenDetail}
                onReset={resetFilters}
              />
            </ErrorBoundary>
          </section>
        ) : page === 'people' ? (
          <ErrorBoundary><PeoplePage events={events} /></ErrorBoundary>
        ) : page === 'stats' ? (
          <>
            <ErrorBoundary><OnThisDay events={events} onSelect={handleOpenDetail} /></ErrorBoundary>
            <Reveal as="section" className="mt-14 sm:mt-20">
              <ErrorBoundary><StatsPanel events={events} /></ErrorBoundary>
            </Reveal>
            <Reveal as="section" className="mt-14 sm:mt-20">
              <ErrorBoundary><YearReview events={events} /></ErrorBoundary>
            </Reveal>
            <Reveal as="section" className="mt-14 sm:mt-20">
              <ErrorBoundary><Contribute /></ErrorBoundary>
            </Reveal>
          </>
        ) : page === 'me' ? (
          <ErrorBoundary>
            <MePage events={events} attended={attended}
              onToggleAttended={toggleAttended} onSelect={handleOpenDetail}
              onBrowse={() => goPage('collection')} />
          </ErrorBoundary>
        ) : (
          <>
            <Hero events={events} onSelect={handleOpenDetail} onYearJump={handleYearJump} />
            <ErrorBoundary><MonthlyDigest events={events} onSelect={handleOpenDetail} /></ErrorBoundary>
            <Reveal><ErrorBoundary><Highlights events={events} onSelect={handleOpenDetail} /></ErrorBoundary></Reveal>
          </>
        )}
      </main>

      <Footer source={source} updatedAt={updatedAt} onRetry={retry} />
      <RandomButton onClick={handleRandom} />
      <BackToTop />
      <Analytics />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        events={events}
        onSelectEvent={handleOpenDetail}
      />

      {detailEvent && (
        <Suspense fallback={null}>
          <EventDetail
            event={detailEvent}
            allEvents={events}
            attended={attended}
            onToggleAttended={toggleAttended}
            onClose={handleCloseDetail}
            prevId={neighbors.prevId}
            nextId={neighbors.nextId}
            onNavigate={handleOpenDetail}
          />
        </Suspense>
      )}
    </div>
  )
}

function scrollToTop() {
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}

function ScrollProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      setP(max > 0 ? (h.scrollTop / max) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-[3px] pointer-events-none">
      <div className="h-full bg-gradient-to-r from-bloom-sky via-bloom-indigo to-bloom-rose transition-[width] duration-100"
        style={{ width: `${p}%` }} />
    </div>
  )
}

function BackToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!show) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="回到頂部"
      className="fixed bottom-[76px] right-5 sm:right-6 z-40 grid place-items-center w-11 h-11 rounded-full text-white bg-bloom-indigo hover:bg-bloom-violet transition-colors shadow-lg shadow-bloom-indigo/30 animate-pop"
    >
      <Icon n="arrow-up" />
    </button>
  )
}

// 隨機跳一場活動
function RandomButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="隨機抽一場"
      title="隨機抽一場"
      className="group fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 grid place-items-center w-11 h-11 rounded-full bg-white border border-dream-line text-bloom-indigo shadow-lg shadow-bloom-indigo/15 hover:text-white hover:bg-bloom-indigo hover:border-bloom-indigo transition-colors dark:bg-white/10 dark:border-white/15"
    >
      <Icon n="wand-magic-sparkles" className="transition-transform group-hover:rotate-12 group-active:scale-90" />
    </button>
  )
}
