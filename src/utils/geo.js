// 場館座標：從 Sheet 的「座標」欄（或「緯度」「經度」兩欄）讀出來，聚合成地圖上的點。
// 座標屬於「場館」不是「場次」，所以同一個場館只要在任一列填一次就夠了。
import { primaryMeta } from './bands.js'
import { detectCity } from './derive.js'

export const COORD_KEYS = ['座標', '經緯度', 'coords', 'latlng']
export const LAT_KEYS = ['緯度', 'lat', 'latitude']
export const LNG_KEYS = ['經度', 'lng', 'lon', 'longitude']

const pick = (extras, keys) => {
  for (const k of keys) {
    const v = typeof extras?.[k] === 'string' ? extras[k].trim() : ''
    if (v) return v
  }
  return ''
}

const inTaiwan = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat > 21 && lat < 26.5 && lng > 118 && lng < 123

// 「25.033964, 121.564468」或 緯度/經度 兩欄，都吃。超出台灣範圍視為填錯，回 null。
export function eventCoords(event) {
  const ex = event?.extras || {}
  const combined = pick(ex, COORD_KEYS)
  if (combined) {
    const m = combined.match(/(-?\d+(?:\.\d+)?)\s*[,，/\s]\s*(-?\d+(?:\.\d+)?)/)
    if (m) {
      const lat = Number(m[1]), lng = Number(m[2])
      if (inTaiwan(lat, lng)) return { lat, lng }
    }
    return null
  }
  const lat = Number(pick(ex, LAT_KEYS))
  const lng = Number(pick(ex, LNG_KEYS))
  return inTaiwan(lat, lng) ? { lat, lng } : null
}

// 依場館聚合：座標取該場館第一個填了的場次，場次數與樂團色一起算出來
export function venuePoints(events = []) {
  const map = new Map()
  for (const e of events) {
    const v = (e.venue || '').trim()
    if (!v) continue
    if (!map.has(v)) {
      map.set(v, { venue: v, city: detectCity(e), count: 0, years: new Set(), bands: {}, lat: null, lng: null })
    }
    const row = map.get(v)
    row.count += 1
    if (e.year) row.years.add(e.year)
    const m = primaryMeta(e)
    row.bands[m.name] = (row.bands[m.name] || 0) + 1
    if (row.lat == null) {
      const c = eventCoords(e)
      if (c) { row.lat = c.lat; row.lng = c.lng }
    }
  }
  return [...map.values()]
    .map(r => {
      const top = Object.entries(r.bands).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
      const ys = [...r.years].sort((a, b) => a - b)
      return {
        ...r,
        years: ys,
        span: ys.length ? (ys.length > 1 ? `${ys[0]}–${ys[ys.length - 1]}` : `${ys[0]}`) : '',
        topBand: top ? top[0] : '',
      }
    })
    .sort((a, b) => b.count - a.count || a.venue.localeCompare(b.venue))
}

export function locatedVenues(events) {
  return venuePoints(events).filter(v => v.lat != null)
}

export function unlocatedVenues(events) {
  return venuePoints(events).filter(v => v.lat == null)
}

// 場館全擠在西門／信義，旗子一定會疊。
// 作法：真實落點不動，只把「旗子」互相推開，再用一條細線連回落點 —— 位置仍然是誠實的。
// 純函式、無隨機，同一份輸入永遠得到同一個版面。
export function relaxMarkers(nodes, { iterations = 160, gap = 6, pull = 0.03, bounds } = {}) {
  const out = nodes.map(n => ({ ...n, fx: n.x, fy: n.y }))
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i], b = out[j]
        const dx = b.fx - a.fx, dy = b.fy - a.fy
        const ox = (a.w + b.w) / 2 + gap - Math.abs(dx)
        const oy = (a.h + b.h) / 2 + gap - Math.abs(dy)
        if (ox <= 0 || oy <= 0) continue          // 沒重疊
        // 推開成本較低的那一軸；完全重合時用索引決定方向，才不會卡住
        if (ox < oy) {
          const s = (dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx)) * ox / 2
          a.fx -= s; b.fx += s
        } else {
          const s = (dy === 0 ? (i % 2 ? 1 : -1) : Math.sign(dy)) * oy / 2
          a.fy -= s; b.fy += s
        }
      }
    }
    for (const n of out) {                         // 微弱地拉回真實位置
      n.fx += (n.x - n.fx) * pull
      n.fy += (n.y - n.fy) * pull
    }
  }
  if (bounds) {
    for (const n of out) {
      n.fx = Math.min(bounds.maxX - n.w / 2, Math.max(bounds.minX + n.w / 2, n.fx))
      n.fy = Math.min(bounds.maxY - n.h / 2, Math.max(bounds.minY + n.h / 2, n.fy))
    }
  }
  return out
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b)
  const i = Math.floor(s.length / 2)
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2
}

// 兩點大約距離（公里）。小範圍用等距近似就夠，不需要 haversine。
export function roughKm(a, b) {
  const meanLat = ((a.lat + b.lat) / 2) * Math.PI / 180
  const dx = (b.lng - a.lng) * Math.cos(meanLat) * 111.32
  const dy = (b.lat - a.lat) * 110.57
  return Math.sqrt(dx * dx + dy * dy)
}

// 台灣的資料實際上九成擠在大台北，一兩個在中南部。
// 全部畫在同一張圖 → 主要區域縮成一團、畫布八成是空的。
// 所以：離中位數 radiusKm 以內的畫在圖上，其餘另外列出來，不要犧牲主圖的可讀性。
export function splitByProximity(points, radiusKm = 60) {
  if (points.length < 3) return { near: points, far: [] }
  const center = { lat: median(points.map(p => p.lat)), lng: median(points.map(p => p.lng)) }
  const near = [], far = []
  for (const p of points) (roughKm(center, p) <= radiusKm ? near : far).push(p)
  return near.length >= 2 ? { near, far } : { near: points, far: [] }
}

// 等距圓柱投影 + 依緯度修正 x，小範圍夠準，也不會被拉扁。
// 回傳把 {lat,lng} 換算成 viewBox 座標的函式與畫布尺寸。
export function makeProjection(points, width = 1000, pad = 56) {
  if (!points.length) return null
  const lats = points.map(p => p.lat), lngs = points.map(p => p.lng)
  const meanLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const kx = Math.cos((meanLat * Math.PI) / 180)

  const xs = lngs.map(l => l * kx)
  const ys = lats.map(l => -l)
  let minX = Math.min(...xs), maxX = Math.max(...xs)
  let minY = Math.min(...ys), maxY = Math.max(...ys)

  // 只有一個點（或全部擠在一起）時給一個最小跨度，免得除以零
  const MIN_SPAN = 0.01
  if (maxX - minX < MIN_SPAN) { const c = (minX + maxX) / 2; minX = c - MIN_SPAN / 2; maxX = c + MIN_SPAN / 2 }
  if (maxY - minY < MIN_SPAN) { const c = (minY + maxY) / 2; minY = c - MIN_SPAN / 2; maxY = c + MIN_SPAN / 2 }

  const inner = width - pad * 2
  const scale = inner / (maxX - minX)
  const height = (maxY - minY) * scale + pad * 2

  return {
    width,
    height: Math.round(height),
    project: ({ lat, lng }) => ({
      x: pad + (lng * kx - minX) * scale,
      y: pad + (-lat - minY) * scale,
    }),
  }
}
