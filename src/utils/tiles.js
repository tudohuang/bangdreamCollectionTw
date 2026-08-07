// Web Mercator 與 OpenStreetMap 圖磚計算。
// 自己算，不裝 Leaflet：整張地圖就是一堆 <image> 疊在 SVG 裡，旗子用同一套投影疊上去。
//
// 圖磚來自 OpenStreetMap，授權 ODbL —— 使用時必須標註出處，畫面上那行不能拿掉。
export const TILE_SIZE = 256
export const OSM_ATTRIBUTION = '© OpenStreetMap 貢獻者'
export const OSM_ATTRIBUTION_URL = 'https://www.openstreetmap.org/copyright'

// 經緯度 → 該縮放層級下的「世界像素座標」
export function project(lat, lng, z) {
  const scale = TILE_SIZE * Math.pow(2, z)
  const s = Math.max(-0.9999, Math.min(0.9999, Math.sin((lat * Math.PI) / 180)))
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  }
}

// 找出能把所有點塞進 width×height 的最大縮放層級（越大越近）
export function fitZoom(points, width, height, { minZoom = 2, maxZoom = 17, pad = 90 } = {}) {
  if (points.length < 2) return 14
  const w = Math.max(32, width - pad * 2)
  const h = Math.max(32, height - pad * 2)
  for (let z = maxZoom; z >= minZoom; z--) {
    const pts = points.map(p => project(p.lat, p.lng, z))
    const dx = Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x))
    const dy = Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y))
    if (dx <= w && dy <= h) return z
  }
  return minZoom
}

// 依點集算出畫布設定：縮放層級、原點偏移、以及一個把經緯度換成畫布座標的函式
export function makeTileView(points, width = 1000, height = 560, opts = {}) {
  if (!points.length) return null
  const z = opts.zoom ?? fitZoom(points, width, height, opts)
  const pts = points.map(p => project(p.lat, p.lng, z))
  const cx = (Math.min(...pts.map(p => p.x)) + Math.max(...pts.map(p => p.x))) / 2
  const cy = (Math.min(...pts.map(p => p.y)) + Math.max(...pts.map(p => p.y))) / 2
  const originX = cx - width / 2
  const originY = cy - height / 2
  return {
    z, width, height, originX, originY,
    project: ({ lat, lng }) => {
      const w = project(lat, lng, z)
      return { x: w.x - originX, y: w.y - originY }
    },
  }
}

// 這個畫布需要哪些圖磚（含各自要擺的位置）
export function tilesFor(view) {
  if (!view) return []
  const { z, originX, originY, width, height } = view
  const n = Math.pow(2, z)
  const x0 = Math.floor(originX / TILE_SIZE)
  const x1 = Math.floor((originX + width) / TILE_SIZE)
  const y0 = Math.floor(originY / TILE_SIZE)
  const y1 = Math.floor((originY + height) / TILE_SIZE)
  const out = []
  for (let ty = y0; ty <= y1; ty++) {
    if (ty < 0 || ty >= n) continue                    // 超出世界上下緣就沒有圖磚
    for (let tx = x0; tx <= x1; tx++) {
      const wrapped = ((tx % n) + n) % n                // 經度方向會繞回來
      out.push({
        key: `${z}/${wrapped}/${ty}`,
        url: `https://tile.openstreetmap.org/${z}/${wrapped}/${ty}.png`,
        x: tx * TILE_SIZE - originX,
        y: ty * TILE_SIZE - originY,
      })
    }
  }
  return out
}
