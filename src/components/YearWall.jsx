import { useMemo } from 'react'
import { yearWall, yearTiles, wallGaps } from '../utils/review.js'
import { downloadWrapped } from '../utils/wrappedImage.js'
import Icon from './Icon.jsx'

// 年度結算牆：一場一格，用該場的封面拼成一面牆，由新到舊排下來。
// 只收有封面的場次；場次總數與封面張數標在抬頭，不會讓人以為那年只有這幾場。
export default function YearWall({ events, onSelect }) {
  const years = useMemo(() => yearWall(events), [events])
  const gaps = useMemo(() => wallGaps(events), [events])
  if (!years.length) return null

  // 空白年份接在「它下面那個有資料的年份」前面，捲下去時斷層才在對的位置
  const gapsAfter = new Map()
  for (const g of gaps) {
    const next = years.filter(y => y.year < g).map(y => y.year)[0]
    if (next == null) continue
    if (!gapsAfter.has(next)) gapsAfter.set(next, [])
    gapsAfter.get(next).push(g)
  }

  return (
    <div>
      <div className="mb-6">
        <div className="eyebrow"><Icon n="images" className="text-[10px]" /> Encore</div>
        <h2 className="section-h mt-2">年度結算牆</h2>
        <p className="mt-2 text-[14px] text-dream-sub">
          一年一格一場，用該場的封面拼成一面牆。點任一張進那場的詳情。
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {years.map(y => (
          <div key={y.year}>
            <YearSection s={y} events={events} onSelect={onSelect} />
            {(gapsAfter.get(y.year) || []).length > 0 && <GapNote years={gapsAfter.get(y.year)} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function YearSection({ s, events, onSelect }) {
  const tiles = useMemo(() => yearTiles(events, s.year), [events, s.year])
  const accent = s.topBands[0]?.color || '#8b5cf6'
  const withPhoto = tiles.filter(t => t.url).length

  return (
    <section>
      <div className="flex items-baseline gap-3 flex-wrap mb-3">
        <a href={`#/collection?year=${s.year}`}
          className="font-display font-extrabold leading-none hover:opacity-80 transition-opacity"
          style={{ fontSize: 'clamp(34px,5vw,50px)', color: accent }}>
          {s.year}
        </a>
        <span className="font-display font-bold text-[18px] text-dream-ink">{s.total} 場</span>
        <span className="text-[14px] text-dream-faint">{withPhoto} 張封面</span>
        {s.delta != null && s.delta !== 0 && (
          <span className={`text-[14px] font-bold ${s.delta > 0 ? 'text-bloom-indigo' : 'text-dream-faint'}`}>
            {s.delta > 0 ? '▲' : '▼'} {Math.abs(s.delta)} 比 {s.year - 1}
          </span>
        )}
        <button onClick={() => downloadWrapped(events, s.year)}
          className="ml-auto pill !py-1 !px-3 !text-[14px]" title="存成回顧卡">
          <Icon n="star" className="text-[10px]" /> 回顧卡
        </button>
      </div>

      {/* 封面牆：多欄磚牆。封面多半是直式海報或橫式 banner，
          切成方格會把主視覺裁掉一大半，所以保留原比例讓它們自己疊 */}
      <div className={`${columnsFor(tiles.length)} gap-2`}>
        {tiles.map(t => <Tile key={t.key} tile={t} onSelect={onSelect} />)}
      </div>

      {/* 一年的關鍵字：牆下面一行，看圖之外還知道發生了什麼 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[
          s.topBands[0] && `${s.topBands[0].name} ${s.topBands[0].n} 場`,
          s.topPeople[0] && `${s.topPeople[0].name} ${s.topPeople[0].n} 次`,
          s.topCity && `主場 ${s.topCity}`,
          s.fullBand > 0 && `全團 ${s.fullBand} 場`,
          s.attendance > 0 && `${s.attendance} 人次`,
        ].filter(Boolean).map(t => (
          <span key={t} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[14px] font-medium"
            style={{ background: `${accent}1a`, color: accent }}>{t}</span>
        ))}
      </div>
    </section>
  )
}

// 場次少的年份用少一點欄，封面才不會小到看不出是什麼
function columnsFor(n) {
  if (n <= 3) return 'columns-2 sm:columns-3'
  if (n <= 8) return 'columns-2 sm:columns-3 lg:columns-4'
  return 'columns-3 sm:columns-4 lg:columns-6'
}

function Tile({ tile, onSelect }) {
  const { url, event } = tile
  const label = `${event.startDate ? event.startDate.slice(5).replace('-', '/') : ''} ${event.title}`

  return (
    <button
      onClick={() => onSelect?.(event.id)}
      title={label}
      aria-label={label}
      className="group relative block w-full mb-2 break-inside-avoid overflow-hidden rounded-lg
        ring-1 ring-black/[.06] dark:ring-white/10 hover:ring-bloom-violet transition-shadow"
    >
      <img src={url} alt="" loading="lazy" decoding="async"
        className="block w-full h-auto transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transform-none" />

      {/* 滑過才浮出標題，平常讓封面自己說話 */}
      <span className="absolute inset-x-0 bottom-0 p-2 text-left text-[14px] leading-tight text-white
        bg-gradient-to-t from-black/85 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="line-clamp-2">{event.title}</span>
      </span>
    </button>
  )
}

// 整年沒有場次的年份，在牆上留一段虛線，斷層才看得出來
function GapNote({ years }) {
  const label = years.length === 1 ? `${years[0]}` : `${Math.min(...years)} – ${Math.max(...years)}`
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-dream-line dark:border-white/15 px-5 py-4">
      <div className="font-display font-bold text-[18px] text-dream-faint tracking-wide">{label}</div>
      <p className="mt-1 font-hand text-[16px] text-dream-sub">整整 {years.length} 年，一場都沒有。</p>
    </div>
  )
}
