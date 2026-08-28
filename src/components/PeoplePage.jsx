import { useMemo, useState } from 'react'
import { bandMeta, rootGroup } from '../utils/bands.js'
import { personBandMap } from '../utils/derive.js'
import { eventStatus, daysUntil } from '../utils/datetime.js'
import Icon from './Icon.jsx'

const ORDERS = [
  ['次數', 'count'],
  ['最近來過', 'recent'],
  ['初登場', 'debut'],
  ['名字', 'name'],
]

// 聲優目錄：每張卡帶自己的最近一場，避免所有卡片內容雷同
import FirstsTable from './FirstsTable.jsx'

export default function PeoplePage({ events, onSelect, sheetRoster = [] }) {
  const [q, setQ] = useState('')
  const [order, setOrder] = useState('count')
  const [band, setBand] = useState('all')
  // 團／角色以「名冊」為準，活動表只補名冊沒有的人（見 derive.js 的說明）
  const roster = useMemo(() => personBandMap(events, sheetRoster), [events, sheetRoster])

  const people = useMemo(() => {
    const map = new Map()
    for (const e of events) {
      const st = eventStatus(e)
      const d = e.startDate || ''
      for (const p of (e.people || [])) {
        if (!map.has(p)) {
          map.set(p, { name: p, count: 0, first: '', last: '', bands: new Set(), lastEvent: null, next: null })
        }
        const r = map.get(p)
        r.count++
        if (d && !d.includes('?')) {
          if (!r.first || d < r.first) r.first = d
          if (!r.last || d > r.last) { r.last = d; r.lastEvent = e }
        }
        // 還沒發生的場次裡最近的那一場
        if ((st === 'upcoming' || st === 'ongoing') && d) {
          if (!r.next || d < r.next.startDate) r.next = e
        }
        for (const g of (e.relatedGroups || [])) r.bands.add(rootGroup(g))
      }
    }
    return [...map.values()]
  }, [events])

  // 樂團快篩只認「這個人自己的團」。用同台過的團去分類，會讓聯合場次
  // 把每個人都塞進所有團裡（愛美同時出現在 Roselia 的篩選結果）。
  const bandOf = (name) => roster.get(name)?.band || ''
  const bands = useMemo(() => {
    const c = {}
    for (const p of people) {
      const b = bandOf(p.name)
      if (b) c[b] = (c[b] || 0) + 1
    }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([b]) => b)
  }, [people, roster])

  // 依「場次」聚合，不然同一場的五個人會排出五張一模一樣的卡
  const upcoming = useMemo(() => {
    const map = new Map()
    for (const p of people) {
      if (!p.next) continue
      if (!map.has(p.next.id)) map.set(p.next.id, { event: p.next, names: [] })
      map.get(p.next.id).names.push(p.name)
    }
    return [...map.values()]
      .sort((a, b) => a.event.startDate.localeCompare(b.event.startDate))
      .slice(0, 4)
  }, [people])
  const upcomingCount = useMemo(() => people.filter(p => p.next).length, [people])
  const onceCount = useMemo(() => people.filter(p => p.count === 1).length, [people])
  const topPerson = useMemo(
    () => [...people].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0],
    [people])

  const shown = useMemo(() => {
    const nq = q.trim().toLowerCase()
    let list = people
    if (band !== 'all') list = list.filter(p => bandOf(p.name) === band)
    if (nq) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(nq) ||
        bandOf(p.name).toLowerCase().includes(nq) ||
        [...p.bands].some(b => b.toLowerCase().includes(nq)) ||
        (roster.get(p.name)?.char || '').toLowerCase().includes(nq))
    }
    const sorted = [...list]
    if (order === 'recent') sorted.sort((a, b) => (b.last || '').localeCompare(a.last || '') || b.count - a.count)
    else if (order === 'debut') sorted.sort((a, b) => (a.first || '9999').localeCompare(b.first || '9999') || b.count - a.count)
    else if (order === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
    else sorted.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    return sorted
  }, [people, q, band, order, roster])

  const maxCount = Math.max(1, ...people.map(p => p.count))
  const filtering = band !== 'all' || q.trim()

  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <div className="eyebrow"><Icon n="microphone" className="text-[10px]" /> Voice Actors</div>
          <h2 className="section-h mt-1.5">聲優目錄</h2>
          <p className="mt-2 text-[14px] text-dream-sub">
            <span className="font-bold text-dream-ink">{people.length}</span> 位來過台灣 ·
            其中 <span className="font-bold text-dream-ink">{onceCount}</span> 位只來過一次
            {topPerson && <> · 最常來的是 <span className="font-bold text-dream-ink">{topPerson.name}</span>（{topPerson.count} 次）</>}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dream-faint"><Icon n="magnifying-glass" /></span>
          <input type="search" className="dream-input !pl-10" placeholder="搜聲優 / 樂團 / 角色…"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {/* 快要來的人：排在最前面，這頁才不只是回顧 */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h3 className="flex items-center gap-2 font-display font-bold text-[16px] text-dream-ink mb-3">
            <span className="w-1.5 h-4 rounded bg-bloom-indigo" />
            即將來台
            <span className="text-[14px] font-normal text-dream-faint">{upcomingCount} 位</span>
          </h3>
          <ul className="space-y-2.5">
            {upcoming.map(({ event: e, names }) => {
              const m = bandMeta((e.relatedGroups || [])[0] || '')
              const dleft = daysUntil(e.startDate)
              return (
                <li key={e.id}
                  className="rounded-2xl border border-dream-line dark:border-white/10 bg-white/70 dark:bg-white/[.06] px-4 py-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[14px] font-bold text-white"
                      style={{ background: 'rgba(139,92,246,0.92)' }}>
                      {dleft <= 0 ? '就是這幾天' : `${dleft} 天後`}
                    </span>
                    <span className="font-round font-bold text-[14px]" style={{ color: m.color }}>
                      {e.startDate.replace(/-/g, '.')}
                    </span>
                    <button onClick={() => onSelect?.(e.id)}
                      className="min-w-0 flex-1 text-left font-display font-semibold text-[16px] text-dream-ink truncate hover:text-bloom-violet transition-colors">
                      {e.title}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {names.map(n => (
                      <a key={n} href={`#/person/${encodeURIComponent(n)}`}
                        className="rounded-full border border-dream-line dark:border-white/10 px-2.5 py-0.5 text-[14px] text-dream-sub hover:text-dream-ink hover:border-bloom-violet transition-colors">
                        {n}
                      </a>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* 排序 + 樂團快篩 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[14px] font-bold text-dream-faint mr-0.5">排序</span>
        {ORDERS.map(([l, v]) => (
          <button key={v} onClick={() => setOrder(v)}
            className={`pill !py-1 !px-3 !text-[14px] ${order === v ? 'pill-active' : ''}`}>{l}</button>
        ))}
        <span className="w-px h-5 bg-dream-line mx-1.5" />
        <button onClick={() => setBand('all')}
          className={`pill !py-1 !px-3 !text-[14px] ${band === 'all' ? 'pill-active' : ''}`}>全部樂團</button>
        {bands.map(b => {
          const m = bandMeta(b)
          const on = band === b
          return (
            <button key={b} onClick={() => setBand(on ? 'all' : b)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-medium transition-colors"
              style={on
                ? { background: m.color, color: '#fff', border: `1px solid ${m.color}` }
                : { background: `rgba(${m.glow},0.12)`, color: m.color, border: `1px solid rgba(${m.glow},0.28)` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? '#fff' : m.color }} />{b}
            </button>
          )
        })}
        {filtering && (
          <span className="ml-auto text-[14px] text-dream-faint">符合 {shown.length} 位</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
        {shown.map(p => {
          const info = roster.get(p.name)
          const mainBand = info?.band || [...p.bands][0] || ''
          const m = bandMeta(mainBand)
          const dleft = p.next ? daysUntil(p.next.startDate) : null
          return (
            <a key={p.name} href={`#/person/${encodeURIComponent(p.name)}`}
              className="event-card group p-4 flex flex-col gap-2.5"
              style={{ '--band': m.glow }}>
              {/* 名字 + 次數 */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-display font-bold text-[18px] text-dream-ink truncate group-hover:text-bloom-violet transition-colors">
                      {p.name}
                    </span>
                    {p.count >= 5 && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[14px] font-bold text-white" style={{ background: m.color }}>常客</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[14px] min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                    <span className="truncate" style={{ color: m.color }}>{mainBand || '—'}</span>
                    {info?.char && <span className="text-dream-faint truncate">／{info.char}</span>}
                  </div>
                </div>
                <span className="text-right shrink-0">
                  <span className="block font-display font-extrabold text-[24px] leading-none" style={{ color: m.color }}>{p.count}</span>
                  <span className="block text-[14px] text-dream-faint mt-0.5">{p.count === 1 ? '一期一會' : '次'}</span>
                </span>
              </div>

              {/* 來台次數的相對長度，一眼分出常客與過客 */}
              <span aria-hidden className="h-1.5 rounded-full bg-dream-line/70 overflow-hidden">
                <span className="block h-full rounded-full"
                  style={{ width: `${(p.count / maxCount) * 100}%`, background: m.color }} />
              </span>

              {/* 最近一場：每張卡都有自己的內容 */}
              {p.lastEvent && (
                <div className="min-w-0">
                  <div className="text-[14px] text-dream-faint">
                    最近 · {p.last.replace(/-/g, '.')}
                  </div>
                  <div className="text-[14px] text-dream-sub line-clamp-2 leading-snug mt-0.5">
                    {p.lastEvent.title}
                  </div>
                </div>
              )}

              {dleft != null && (
                <span className="inline-flex self-start items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[14px] font-bold text-white"
                  style={{ background: 'rgba(139,92,246,0.92)' }}>
                  <Icon n="calendar" className="text-[9px]" />
                  {dleft <= 0 ? '就是這幾天' : `${dleft} 天後再來`}
                </span>
              )}

              <div className="mt-auto pt-2.5 border-t border-dream-line text-[14px] text-dream-faint flex items-center justify-between gap-2">
                <span className="truncate">{p.first ? `${p.first.slice(0, 4)} 初登場` : '—'}</span>
                <Icon n="chevron-right" className="text-[10px] shrink-0 group-hover:text-bloom-violet transition-colors" />
              </div>
            </a>
          )
        })}
      </div>

      {shown.length === 0 && (
        <div className="glass px-6 py-16 text-center text-dream-sub text-[16px]">
          找不到符合的聲優{q && <>「{q}」</>}
        </div>
      )}

      {/* 目錄回答「有誰」，這張表回答「什麼時候」。搜尋中就收起來，
          免得上面篩了三個人、下面還列著四十個。 */}
      {!q && (
        <div className="mt-9">
          <FirstsTable events={events} onSelect={onSelect} />
        </div>
      )}
    </section>
  )
}
