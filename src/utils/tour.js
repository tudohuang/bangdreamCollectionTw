// 場館巡禮：把場次照時間排成一條飛行路線。
// 純函式，地圖那邊只負責飛 —— 「下一站是哪」「這根光柱多高」都在這裡算、有測試守著。
import { eventCoords, roughKm } from './geo.js'
import { venueKey, bestName } from './venues.js'
import { bandKey, BAND_META, primaryMeta } from './bands.js'

// 座標屬於場館不屬於場次：同一個場館只要任一列填過就算數
function coordsByVenue(events) {
  const map = new Map()
  for (const e of events) {
    const k = venueKey(e.venue)
    if (!k || map.has(k)) continue
    const c = eventCoords(e)
    if (c) map.set(k, c)
  }
  return map
}

const playedBy = (e, band) => (e.relatedGroups || []).some(g =>
  String(g).split(',').some(x => bandKey(x) === band))

// 一站 = 同一個場館「連續」的場次。隔了別的場館再回來，就是新的一站 ——
// 路線要照實畫出來回跑，不能把兩次世貿合成一次。
export function tourStops(events = [], { band = '', only = null } = {}) {
  const coords = coordsByVenue(events)
  const list = events
    .filter(e => e.startDate && coords.has(venueKey(e.venue)))
    .filter(e => !band || playedBy(e, band))
    .filter(e => !only || only.has(e.id))
    .slice()
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)) || (a.number || 0) - (b.number || 0))

  const stops = []
  for (const e of list) {
    const key = venueKey(e.venue)
    const last = stops[stops.length - 1]
    if (last && last.key === key) {
      last.events.push(e)
      last.names.add(String(e.venue).trim())
      continue
    }
    stops.push({ key, names: new Set([String(e.venue).trim()]), ...coords.get(key), events: [e] })
  }
  const visits = new Map()
  let odo = 0
  return stops.map((s, i) => {
    const first = s.events[0], last = s.events[s.events.length - 1]
    const prev = stops[i - 1]
    visits.set(s.key, (visits.get(s.key) || 0) + 1)
    const km = prev ? roughKm(prev, s) : 0
    odo += km
    return {
      visit: visits.get(s.key),
      gapDays: prev ? daysBetween(prev.events[prev.events.length - 1].endDate || prev.events[prev.events.length - 1].startDate, first.startDate) : null,
      km,
      odo,
      key: s.key,
      index: i,
      name: bestName(s.names),
      lat: s.lat,
      lng: s.lng,
      events: s.events,
      from: first.startDate,
      to: last.endDate || last.startDate,
      color: band ? BAND_META[band]?.color || primaryMeta(first).color : primaryMeta(first).color,
    }
  })
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
}

function gapText(days) {
  if (days <= 0) return '同一天'
  if (days === 1) return '隔天'
  if (days < 60) return `隔了 ${days} 天`
  const months = Math.round(days / 30.44)
  if (months < 12) return `隔了 ${months} 個月`
  const y = Math.floor(months / 12), m = months % 12
  return `隔了 ${y} 年${m ? ` ${m} 個月` : ''}`
}

// 每站一句話：只講資料說得出來的事
export function stopFact(stop) {
  if (stop.index === 0) return '一切從這裡開始'
  const where = stop.visit === 1 ? '第一次來這裡' : `第 ${stop.visit} 次回到這裡`
  return `${where} · ${gapText(stop.gapDays)}`
}

// 飛完的結算：去過幾個場館、總共飛多遠、跨了幾年、最常回去哪
export function tourSummary(stops = []) {
  if (!stops.length) return null
  const byVenue = new Map()
  for (const s of stops) {
    const v = byVenue.get(s.key) || { name: s.name, n: 0 }
    v.n += s.events.length
    byVenue.set(s.key, v)
  }
  const top = [...byVenue.values()].sort((a, b) => b.n - a.n)[0]
  const y0 = Number(String(stops[0].from).slice(0, 4))
  const y1 = Number(String(stops[stops.length - 1].to).slice(0, 4))
  return {
    venues: byVenue.size,
    events: stops.reduce((n, s) => n + s.events.length, 0),
    km: Math.round(stops[stops.length - 1].odo),
    years: y1 - y0 + 1,
    top: top.n > 1 ? top : null,
  }
}

// 篩選用：有座標的場次裡出現過哪些團，場次多的在前
export function tourBands(events = []) {
  const coords = coordsByVenue(events)
  const count = new Map()
  for (const e of events) {
    if (!coords.has(venueKey(e.venue))) continue
    const seen = new Set()
    for (const g of e.relatedGroups || []) {
      for (const x of String(g).split(',')) {
        const k = bandKey(x)
        if (k === 'other' || seen.has(k)) continue
        seen.add(k)
        count.set(k, (count.get(k) || 0) + 1)
      }
    }
  }
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, n]) => ({ key, n, name: BAND_META[key].name, color: BAND_META[key].color }))
}

// 光柱：每個場館一根，高度跟場次數走（開根號，不然世貿一根就把別人壓成地板）
export function venuePillars(stops, { base = 50, per = 75 } = {}) {
  const map = new Map()
  for (const s of stops) {
    if (!map.has(s.key)) map.set(s.key, { key: s.key, name: s.name, lat: s.lat, lng: s.lng, count: 0, first: s.index, color: s.color })
    const p = map.get(s.key)
    p.count += s.events.length
  }
  return [...map.values()].map(p => ({ ...p, height: Math.round(base + Math.sqrt(p.count) * per) }))
}

// 地圖上的圓柱是多邊形擠出來的；公尺換經緯度用等距近似，幾十公尺的尺度誤差看不出來
export function circleRing(lat, lng, radiusM, steps = 32) {
  const dLat = radiusM / 110574
  const dLng = radiusM / (111320 * Math.cos(lat * Math.PI / 180))
  const ring = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    ring.push([+(lng + Math.cos(t) * dLng).toFixed(7), +(lat + Math.sin(t) * dLat).toFixed(7)])
  }
  return ring
}

// 兩站之間的方位角（度），鏡頭朝著「從哪來」的反方向看，進場才有往前飛的感覺
export function bearingBetween(a, b) {
  const toRad = d => d * Math.PI / 180
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

// 落地看街景：Google Maps URL 是公開的深連結，不用 key、不收費，開在新分頁
export function streetViewUrl({ lat, lng }) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
}

