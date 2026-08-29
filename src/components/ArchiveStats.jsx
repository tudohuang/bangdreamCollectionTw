import { useMemo } from 'react'
import { priceHistory } from '../utils/archive.js'
import { songIndex, setlistStats } from '../utils/songs.js'
import { primaryMeta } from '../utils/bands.js'
import Icon from './Icon.jsx'

// 史料層的兩個彙總：票價的變化、被唱最多次的歌。
//
// 這兩支函式（priceHistory、songIndex）早就寫好了，但站上只有詳情頁在用
// songIndex 算「台灣第幾次」，priceHistory 一個地方都沒接 ——
// 「2018 的 FMT 800 塊 → 2026 的 LIVE 4800」那條線算得出來卻沒人看得到。
//
// 現在票價與曲目都是 0/59，所以整塊不會出現。Sheet 一填就會長出來 ——
// 跟詳情頁的史料層同一個規矩：沒資料就不留空殼。
export default function ArchiveStats({ events, onSelect }) {
  const prices = useMemo(() => priceHistory(events), [events])
  const songs = useMemo(() => songIndex(events), [events])
  const sl = useMemo(() => setlistStats(events), [events])
  if (!prices.length && !songs.length) return null

  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-6">
      {prices.length > 0 && <PriceTrend rows={prices} onSelect={onSelect} />}
      {songs.length > 0 && <TopSongs rows={songs} onSelect={onSelect} />}
      {sl && sl.shows > 1 && <SetlistShape s={sl} />}
    </div>
  )
}

// 票價隨年份。點一格跳到那場。
function PriceTrend({ rows, onSelect }) {
  const max = Math.max(...rows.map(r => r.price.high))
  const first = rows[0], last = rows[rows.length - 1]
  const times = first.price.high ? (last.price.high / first.price.high) : 0

  return (
    <div className="glass p-6">
      <h3 className="font-display font-bold text-[16px] text-dream-ink">票價這些年</h3>
      <p className="mt-1 text-[14px] text-dream-sub">
        有票價紀錄的 {rows.length} 場。
        {rows.length > 1 && times > 0 && (
          <>最早 {first.event.year} 年最高 {first.price.high.toLocaleString('zh-TW')}，
          最近 {last.event.year} 年最高 {last.price.high.toLocaleString('zh-TW')}
          （{times.toFixed(1)} 倍）。</>
        )}
      </p>

      <ul className="mt-4 space-y-2">
        {rows.map(({ event: e, price }) => {
          const m = primaryMeta(e)
          return (
            <li key={e.id}>
              <button onClick={() => onSelect(e.id)} className="w-full text-left group">
                <div className="flex items-baseline gap-3 text-[14px]">
                  <span className="w-10 shrink-0 text-dream-faint tabular-nums">{e.year}</span>
                  <span className="flex-1 h-2.5 rounded-full bg-dream-line dark:bg-white/10 overflow-hidden">
                    <span className="block h-full rounded-full"
                      style={{ width: `${(price.high / max) * 100}%`, background: m.color, opacity: .8 }} />
                  </span>
                  <span className="shrink-0 font-round font-bold tabular-nums" style={{ color: m.color }}>
                    {price.high.toLocaleString('zh-TW')}
                  </span>
                </div>
                <div className="ml-[52px] truncate text-[14px] text-dream-faint group-hover:text-dream-sub">
                  {e.title}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// 曲目的整體樣貌。這幾個數字全部從曲目本身算出來，不用任何額外欄位 ——
// 「哪一首最常拿來開場」是問得出來但沒地方查的那種問題。
function SetlistShape({ s }) {
  return (
    <div className="glass p-6">
      <h3 className="font-display font-bold text-[16px] text-dream-ink">曲目的樣子</h3>
      <p className="mt-1 text-[14px] text-dream-sub">
        {s.shows} 場有曲目紀錄，平均一場 {s.avg} 首（{s.min}–{s.max}）。
      </p>
      <div className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-4">
        <Rank title="最常拿來開場" rows={s.openers} />
        <Rank title="最常拿來收尾" rows={s.closers} />
      </div>
    </div>
  )
}

function Rank({ title, rows }) {
  if (!rows.length) return null
  return (
    <div>
      <div className="text-[14px] font-bold text-dream-faint mb-2">{title}</div>
      <ul className="space-y-1">
        {rows.map(([t, n]) => (
          <li key={t} className="flex items-baseline gap-2 text-[14px]">
            <span className="min-w-0 flex-1 truncate text-dream-ink">{t}</span>
            <span className="shrink-0 text-dream-faint tabular-nums">{n} 次</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// 在台灣被唱最多次的歌。Setlist.fm 沒有台灣的邦邦場次，所以這是別的地方查不到的。
function TopSongs({ rows, onSelect }) {
  const top = rows.slice(0, 12)
  const repeated = rows.filter(s => s.count > 1).length

  return (
    <div className="glass p-6">
      <h3 className="font-display font-bold text-[16px] text-dream-ink">在台灣唱過最多次的歌</h3>
      <p className="mt-1 text-[14px] text-dream-sub">
        {rows.length} 首有紀錄，其中 {repeated} 首唱過不只一次。
      </p>

      <ol className="mt-4 space-y-1.5">
        {top.map((s, i) => (
          <li key={s.title} className="flex items-baseline gap-3 text-[14px]">
            <span className="w-5 shrink-0 text-right font-round font-bold text-dream-faint tabular-nums">
              {i + 1}
            </span>
            <a href={`#/song/${encodeURIComponent(s.key)}`}
              className="min-w-0 flex-1 truncate text-dream-ink hover:text-bloom-violet transition-colors">
              {s.title}
            </a>
            <span className="shrink-0 text-dream-faint tabular-nums">{s.count} 次</span>
            <button onClick={() => onSelect(s.events[s.events.length - 1].id)}
              aria-label={`看最近唱這首的場次：${s.title}`}
              className="shrink-0 text-dream-faint hover:text-bloom-violet transition-colors">
              <Icon n="chevron-right" className="text-[10px]" />
            </button>
          </li>
        ))}
      </ol>
      <a href="#/songs"
        className="mt-3 inline-flex items-center gap-1.5 text-[14px] text-bloom-violet hover:underline">
        {rows.length > top.length ? `看全部 ${rows.length} 首` : '看曲目總表'}
        <Icon n="arrow-right" className="text-[9px]" />
      </a>
    </div>
  )
}
