import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { useEvents } from './hooks/useEvents.js'
import Hero from './components/Hero.jsx'
import OnThisDay from './components/OnThisDay.jsx'
import Upcoming from './components/Upcoming.jsx'
import LatestAdded from './components/LatestAdded.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import YearChapterMap from './components/YearChapterMap.jsx'
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
import { matchSearch } from './utils/search.js'
import { eventStatus, todayStr } from './utils/datetime.js'
import { getAttended, saveAttended } from './utils/attended.js'

const EventDetail = lazy(() => import('./components/EventDetail.jsx'))

const DEFAULT_FILTERS = {
  year: 'all',
  groups: [], people: [], characters: [], types: [], venues: [], cities: [],
  category: 'all',     // all / 本體 / 擦邊
  fullBand: 'all',     // all / full
  attended: 'all',     // all / yes
  timeframe: 'all',    // all / upcoming / past / thisYear / thisMonth
  search: '',
  view: 'cards',       // cards / timeline / year / table / calendar
  order: 'date-asc',   // date-asc / date-desc / attendance / number
}

const ARRAY_KEYS = ['groups', 'people', 'characters', 'types', 'venues', 'cities']

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
  for (const k of ['year', 'category', 'fullBand', 'attended', 'timeframe', 'search', 'view', 'order']) {
    if (f[k] && f[k] !== DEFAULT_FILTERS[k]) p[k] = f[k]
  }
  return p
}
function paramsToFilters(params) {
  const f = {}
  for (const k of ARRAY_KEYS) if (params[k]) f[k] = params[k].split(',').filter(Boolean)
  for (const k of ['year', 'category', 'fullBand', 'attended', 'timeframe', 'search', 'view', 'order']) {
    if (params[k] != null) f[k] = params[k]
  }
  return f
}

export default function App() {
  const { events, source, updatedAt, retry } = useEvents()
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
        setDetailId(h.id)   // 詳情用浮層蓋在現有頁面上，不動 profile
      } else if (h.route === 'year') {
        setDetailId(null); setProfile(null)
        setFilters(f => ({ ...f, year: String(h.year) }))
        scrollToWall()
      } else if (h.route === 'person') {
        setDetailId(null)
        setProfile({ kind: 'person', value: h.value })
        scrollToTop()
      } else if (h.route === 'band') {
        setDetailId(null)
        setProfile({ kind: 'band', value: h.value })
        scrollToTop()
      } else if (h.route === 'filter') {
        setDetailId(null); setProfile(null)
        setFilters({ ...DEFAULT_FILTERS, ...paramsToFilters(h.params) })
      } else {
        setDetailId(null); setProfile(null)
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

  const handleOpenDetail = (id) => { setDetailId(id); writeHash('event', { id }) }
  const handleRandom = () => {
    if (!events.length) return
    handleOpenDetail(events[Math.floor(Math.random() * events.length)].id)
  }
  const handleCloseDetail = () => {
    setDetailId(null)
    // 從某個圖鑑頁點開的，關閉後回到那一頁；否則回首頁
    if (profile) writeHash(profile.kind, { value: profile.value })
    else if (window.location.hash.startsWith('#/event/')) history.pushState(null, '', '#/')
  }
  const handleCloseProfile = () => {
    setProfile(null)
    history.pushState(null, '', '#/')
    scrollToTop()
  }
  const handleYearJump = (year) => {
    setFilters(f => ({ ...f, year: year === 'all' ? 'all' : String(year) }))
    writeHash('year', { year })
  }

  const updateFilters = (patch) => {
    // 搜尋是即時輸入：用 replaceState，避免每打一個字就塞一筆瀏覽器歷史
    const replace = 'search' in patch
    setFilters(f => {
      const next = { ...f, ...patch }
      const params = filtersToParams(next)
      if (Object.keys(params).length === 0) {
        if (window.location.hash !== '' && window.location.hash !== '#/') {
          history[replace ? 'replaceState' : 'pushState'](null, '', '#/')
        }
      } else {
        writeHash('filter', { params }, { replace })
      }
      return next
    })
  }
  const resetFilters = () => { setFilters(DEFAULT_FILTERS); history.pushState(null, '', '#/') }

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <ScrollProgress />

      <header className="sticky top-0 z-30 bg-white border-b border-dream-line dark:bg-[#16122b]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-2.5 group">
            <span className="grid place-items-center w-7 h-7 rounded bg-bloom-indigo text-white text-[12px]"><Icon n="music" /></span>
            <span className="font-display font-bold text-[16px] text-dream-ink group-hover:text-bloom-indigo transition-colors">
              邦邦來台圖鑑
            </span>
          </a>
          <nav className="flex items-center gap-3 text-[13px] text-dream-sub">
            <a href="#chapters" className="hover:text-dream-ink hover:underline transition-colors hidden sm:block">章節</a>
            <a href="#wall" className="hover:text-dream-ink hover:underline transition-colors hidden sm:block">圖鑑</a>
            <a href="#stats" className="hover:text-dream-ink hover:underline transition-colors hidden sm:block">收藏</a>
            <a href="#review" className="hover:text-dream-ink hover:underline transition-colors hidden sm:block">回顧</a>
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="快速搜尋"
              className="inline-flex items-center gap-2 rounded border border-dream-line px-2.5 h-8 text-dream-sub hover:text-dream-ink transition-colors"
            >
              <Icon n="magnifying-glass" className="text-[12px]" />
              <kbd className="hidden sm:inline text-[11px] text-dream-faint">⌘K</kbd>
            </button>
            <button
              onClick={toggleDark}
              aria-label="切換深淺色"
              className="grid place-items-center w-8 h-8 rounded border border-dream-line text-dream-sub hover:text-dream-ink transition-colors"
            >
              <Icon n={dark ? 'sun' : 'moon'} />
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-24 flex-1">
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
        ) : (
          <>
            <Hero events={events} onSelect={handleOpenDetail} />
            <Reveal><ErrorBoundary><OnThisDay events={events} onSelect={handleOpenDetail} /></ErrorBoundary></Reveal>
            <Reveal><ErrorBoundary><Upcoming events={events} onSelect={handleOpenDetail} /></ErrorBoundary></Reveal>
            <Reveal><ErrorBoundary><LatestAdded events={events} onSelect={handleOpenDetail} /></ErrorBoundary></Reveal>

            <Reveal as="section" id="chapters" className="mt-16 sm:mt-24 scroll-mt-20">
              <ErrorBoundary>
                <YearChapterMap events={events} activeYear={filters.year} onSelectYear={handleYearJump} />
              </ErrorBoundary>
            </Reveal>

            <Reveal as="section" id="wall" className="mt-16 sm:mt-24 scroll-mt-20">
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
                />
              </ErrorBoundary>
            </Reveal>

            <Reveal as="section" id="stats" className="mt-20 sm:mt-28 scroll-mt-20">
              <ErrorBoundary><StatsPanel events={events} /></ErrorBoundary>
            </Reveal>

            <Reveal as="section" id="review" className="mt-20 sm:mt-28 scroll-mt-20">
              <ErrorBoundary><YearReview events={events} /></ErrorBoundary>
            </Reveal>

            <Reveal as="section" className="mt-20 sm:mt-28">
              <ErrorBoundary><Contribute /></ErrorBoundary>
            </Reveal>
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

function scrollToWall() {
  requestAnimationFrame(() => {
    document.getElementById('wall')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
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
    <div className="fixed top-0 left-0 right-0 z-40 h-1 pointer-events-none">
      <div className="h-full bg-bloom-indigo transition-[width] duration-100" style={{ width: `${p}%` }} />
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
      className="fixed bottom-20 right-6 z-40 grid place-items-center w-11 h-11 rounded-md text-white bg-bloom-indigo hover:bg-bloom-violet transition-colors"
    >
      <Icon n="arrow-up" />
    </button>
  )
}

// 抽一張回憶：隨機跳一場活動，轉蛋感
function RandomButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="抽一張回憶"
      title="抽一張回憶"
      className="group fixed bottom-6 right-6 z-40 grid place-items-center w-11 h-11 rounded-md bg-white border border-dream-line text-bloom-indigo hover:text-white hover:bg-bloom-indigo transition-colors dark:bg-white/10"
    >
      <Icon n="wand-magic-sparkles" className="transition-transform group-hover:rotate-12 group-active:scale-90" />
    </button>
  )
}
