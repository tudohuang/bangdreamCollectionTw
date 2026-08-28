import { useMemo, useState } from 'react'
import { bandMeta } from '../utils/bands.js'
import { locatedVenues, unlocatedVenues, splitByProximity, relaxMarkers } from '../utils/geo.js'
import { makeTileView, tilesFor, OSM_ATTRIBUTION, OSM_ATTRIBUTION_URL, TILE_SIZE } from '../utils/tiles.js'
import Icon from './Icon.jsx'

// 場館插旗圖：底圖是 OpenStreetMap 圖磚，投影自己算（見 utils/tiles.js），未使用 Leaflet，
// 座標來自 Sheet。旗子會互相推開，但落點固定在真實位置，用細線連回去。
export default function VenueMap({ events }) {
  const [hover, setHover] = useState(null)
  const [tilesOk, setTilesOk] = useState(true)
  const allLocated = useMemo(() => locatedVenues(events), [events])
  const missing = useMemo(() => unlocatedVenues(events), [events])
  // 主圖只畫同一個都會區的，遠的另外列 —— 不然一個高雄就把整張台北縮成一團
  const { near: located, far } = useMemo(() => splitByProximity(allLocated), [allLocated])
  const proj = useMemo(() => makeTileView(located, 1000, 560), [located])
  const tiles = useMemo(() => tilesFor(proj), [proj])
  const maxCount = Math.max(1, ...located.map(v => v.count))

  // 旗子的最終位置：真實落點推開後的結果（純函式，同資料同版面）
  const markers = useMemo(() => {
    if (!proj) return []
    const nodes = located.map(v => {
      const p = proj.project(v)
      const w = 44 + Math.sqrt(v.count / maxCount) * 20
      return { venue: v.venue, count: v.count, color: bandMeta(v.topBand).color, x: p.x, y: p.y, w, h: 26 }
    })
    return relaxMarkers(nodes, {
      bounds: { minX: 6, minY: 6, maxX: proj.width - 6, maxY: proj.height - 6 },
    })
  }, [located, proj, maxCount])

  return (
    <div>
      <div className="eyebrow"><Icon n="location-dot" className="text-[10px]" /> Venues</div>
      <h2 className="section-h mt-2">插旗地圖</h2>
      <p className="mt-2.5 text-[16px] text-dream-sub">
        去過的場館 <span className="font-bold text-dream-ink">{allLocated.length + missing.length}</span> 個
        {allLocated.length > 0 && <>，其中 <span className="font-bold text-dream-ink">{allLocated.length}</span> 個有座標</>}
        。點大小是場次數，顏色是那裡最常來的團。
      </p>

      {located.length === 0 ? (
        <div className="glass mt-5 px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-bloom-indigo/10 text-bloom-indigo text-xl">
            <Icon n="location-dot" />
          </div>
          <div className="font-display font-bold text-[18px] text-dream-ink">還沒有場館座標</div>
          <p className="mt-2 text-[14px] text-dream-sub max-w-md mx-auto leading-relaxed">
            在 Sheet 加一欄「<span className="font-bold text-dream-ink">座標</span>」，
            從 Google Maps 右鍵複製的那串直接貼上（像 <code className="font-round">25.033964, 121.564468</code>）。
            同一個場館只要填一次，其他場次留空就好。
          </p>
        </div>
      ) : (
        <div className="glass mt-5 p-4 sm:p-6 relative overflow-hidden">
          <svg viewBox={`0 0 ${proj.width} ${proj.height}`} className="w-full h-auto"
            role="img" aria-label={`${located.length} 個場館的分布圖`}>
            <defs>
              {/* 圖磚載不出來時的備援底（離線、被擋） */}
              <pattern id="vm-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.1" fill="rgb(var(--c-faint))" opacity="0.28" />
              </pattern>
              <filter id="vm-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#3c285a" floodOpacity="0.32" />
              </filter>
              <clipPath id="vm-clip">
                <rect width={proj.width} height={proj.height} rx="14" />
              </clipPath>
            </defs>
            <rect width={proj.width} height={proj.height} fill="url(#vm-dots)" rx="14" />

            {/* 真的 OpenStreetMap 圖磚。降飽和是為了讓樂團色的旗子壓得住底圖 */}
            {tilesOk && (
              <g clipPath="url(#vm-clip)" className="vm-tiles">
                {tiles.map(t => (
                  <image key={t.key} href={t.url} x={t.x} y={t.y}
                    width={TILE_SIZE} height={TILE_SIZE}
                    onError={() => setTilesOk(false)} />
                ))}
              </g>
            )}

            {/* 先畫連接線，再畫旗子，線才不會壓在旗面上 */}
            {markers.map(k => (
              <g key={`l-${k.venue}`}>
                <ellipse cx={k.x} cy={k.y + 3} rx="6" ry="2.4" fill={k.color} opacity="0.2" />
                <line x1={k.x} y1={k.y} x2={k.fx} y2={k.fy + k.h / 2}
                  stroke={k.color} strokeWidth="1.5" opacity={hover === k.venue ? 0.9 : 0.5} />
                <circle cx={k.x} cy={k.y} r="3.4" fill={k.color} />
              </g>
            ))}

            {[...markers].sort((a, b) => a.fy - b.fy).map(k => {
              const on = hover === k.venue
              const fw = k.w, fh = k.h
              return (
                <g key={k.venue} transform={`translate(${k.fx - fw / 2},${k.fy - fh / 2})`}
                  onMouseEnter={() => setHover(k.venue)} onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}
                  onClick={() => { location.hash = `#/collection?venues=${encodeURIComponent(k.venue)}` }}>
                  {/* 旗面：尾巴有個缺口，看起來才像旗子不像標籤 */}
                  <path d={`M 0 0 H ${fw} l -8 ${fh / 2} l 8 ${fh / 2} H 0 Z`}
                    fill={k.color} opacity={on ? 1 : 0.92} filter="url(#vm-shadow)" />
                  <text x={(fw - 8) / 2} y={fh / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                    className="font-round" fill="#fff" fontSize="14" fontWeight="700">
                    {k.count}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* ODbL 要求標註出處，這行不能拿掉 */}
          <div className="mt-2 text-right text-[14px] text-dream-faint">
            {tilesOk ? (
              <a href={OSM_ATTRIBUTION_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {OSM_ATTRIBUTION}
              </a>
            ) : '底圖載入失敗，只顯示相對位置'}
          </div>

          {/* 名稱另外列，疊在圖上會打架 */}
          <div className="mt-3 pt-4 border-t border-dream-line dark:border-white/10 flex flex-wrap gap-1.5">
            {located.map(v => {
              const m = bandMeta(v.topBand)
              const on = hover === v.venue
              return (
                <a key={v.venue} href={`#/collection?venues=${encodeURIComponent(v.venue)}`}
                  onMouseEnter={() => setHover(v.venue)} onMouseLeave={() => setHover(null)}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[14px] transition-colors"
                  style={on
                    ? { background: m.color, color: '#fff', border: `1px solid ${m.color}` }
                    : { background: `rgba(${m.glow},0.10)`, color: 'rgb(var(--c-sub))', border: '1px solid rgb(var(--c-line))' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? '#fff' : m.color }} />
                  {v.venue}
                  <span className={on ? 'text-white/80' : 'text-dream-faint'}>×{v.count}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {far.length > 0 && (
        <div className="mt-4 rounded-2xl border border-dream-line dark:border-white/10 px-5 py-4">
          <div className="text-[14px] font-bold text-dream-faint mb-2">
            離主要區域太遠，另外列 · {far.length} 個
          </div>
          <div className="flex flex-wrap gap-1.5">
            {far.map(v => {
              const m = bandMeta(v.topBand)
              return (
                <a key={v.venue} href={`#/collection?venues=${encodeURIComponent(v.venue)}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[14px] text-dream-sub border border-dream-line dark:border-white/10 hover:border-bloom-violet transition-colors"
                  style={{ background: `rgba(${m.glow},0.10)` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                  {v.city && <span className="text-dream-faint">{v.city}</span>}
                  {v.venue}<span className="text-dream-faint">×{v.count}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-dream-line dark:border-white/15 px-5 py-4">
          <div className="text-[14px] font-bold text-dream-faint mb-2">
            還沒有座標的場館 · {missing.length} 個
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missing.map(v => (
              <span key={v.venue} className="rounded-full border border-dream-line dark:border-white/10 px-2.5 py-1 text-[14px] text-dream-sub">
                {v.venue}<span className="text-dream-faint"> ×{v.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
