import { useEffect, useMemo, useRef, useState } from 'react'
import { splitByProximity, roughKm } from '../utils/geo.js'
import { tourStops, tourBands, tourSummary, stopFact, venuePillars, circleRing, bearingBetween, streetViewUrl } from '../utils/tour.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { photoUrl, coverOf } from '../utils/media.js'
import { coverSrc } from '../utils/cover.js'
import Icon from './Icon.jsx'
import Img from './Img.jsx'

// 場館巡禮：照時間順序，在真實的 3D 城市裡一站一站飛過去。
//
// 全部免費、免 key：
//   底圖  OpenFreeMap（OpenMapTiles 向量圖磚，建築有高度）
//   引擎  MapLibre GL（開源）
// maplibre 一包兩百多 KB，捲到這一區才載，不碰首屏。
//
// 順不順比好不好看重要。被說過「好卡」之後拿掉的東西：
//   地形      場館幾乎都在台北盆地，起伏看不出來，卻讓每一幀多算一層高程網格、飛行時狂抓 DEM 圖磚
//   高解析度  手機 DPR 3 等於畫 9 倍的像素，封頂 1.5
//   毛玻璃    資訊卡疊在每幀都在重畫的 canvas 上，backdrop-blur 每一幀都要重算
//   低縮放的建築  飛行途中拉遠時整個台北的建築都要擠出來，改成 14 級以上才畫

const STYLE = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' }
const DWELL = 5200        // 每站停多久（毫秒），鏡頭這段時間慢慢繞
const GOD_ZOOM = 14.2     // 上帝視角的高度。再拉遠 3D 建物就沒了：13 級圖磚的建物高度很粗、看起來是平的，12 級直接沒有建物資料
const PER_PHOTO = 2000    // 一站有好幾張照片時，每多一張多停這麼久（最多算到 4 張）
const ORBIT = 38          // 停留時繞多少度

// 站上的深淺模式是切 <html class="dark">，地圖跟著換底
function useDarkClass() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const ob = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => ob.disconnect()
  }, [])
  return dark
}

// 捲到附近才開始載 —— maplibre 與圖磚都不該讓沒看到這區的人付錢
function useNearViewport(ref) {
  const [near, setNear] = useState(false)
  useEffect(() => {
    if (near || !ref.current) return
    const io = new IntersectionObserver(([en]) => en.isIntersecting && setNear(true), { rootMargin: '300px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [near, ref])
  return near
}

// 拿 OpenFreeMap 的樣式來改：平面建築換成 3D、地名只留中文、深色底對齊站上的夜色
async function buildStyle(dark) {
  const style = await (await fetch(dark ? STYLE.dark : STYLE.light)).json()
  const layers = []
  for (const l of style.layers) {
    if (l['source-layer'] === 'building') continue
    if (l.paint?.['fill-pattern']) continue   // 材質貼圖（木紋之類）在 OpenFreeMap 的 sprite 裡缺圖，留著只會刷警告
    if (dark && l.id === 'background') l.paint = { ...l.paint, 'background-color': '#0b0a24' }
    const tf = l.layout?.['text-field']
    if (l.type === 'symbol' && tf && JSON.stringify(tf).includes('name')) {
      l.layout = { ...l.layout, 'text-field': ['coalesce', ['get', 'name:zh-Hant'], ['get', 'name:nonlatin'], ['get', 'name']] }
    }
    layers.push(l)
  }
  const firstSymbol = layers.findIndex(l => l.type === 'symbol')
  layers.splice(firstSymbol < 0 ? layers.length : firstSymbol, 0, {
    id: 'buildings-3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 14,
    paint: {
      'fill-extrusion-color': dark ? '#2b2752' : '#e9e4f0',
      'fill-extrusion-height': ['get', 'render_height'],
      'fill-extrusion-base': ['get', 'render_min_height'],
      'fill-extrusion-opacity': 1,
    },
  })
  style.layers = layers
  style.sky = dark
    ? { 'sky-color': '#0b0a24', 'horizon-color': '#3b2a6b', 'fog-color': '#0b0a24', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.4 }
    : { 'sky-color': '#cfd8ff', 'horizon-color': '#fde2f1', 'fog-color': '#f4f1fa', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.5 }
  return style
}

const pillarData = (pillars, at) => ({
  type: 'FeatureCollection',
  features: pillars.map(p => ({
    type: 'Feature',
    properties: { key: p.key, height: p.height, color: p.first <= at ? p.color : '#9a93b5' },
    geometry: { type: 'Polygon', coordinates: [circleRing(p.lat, p.lng, 12, 20)] },
  })),
})

// 拉遠時光柱細到看不見，改用圓點：場次越多越大，一樣是去過的亮、沒去的灰
const dotData = (pillars, at) => ({
  type: 'FeatureCollection',
  features: pillars.map(p => ({
    type: 'Feature',
    properties: { key: p.key, r: Math.round(5 + Math.sqrt(p.count) * 2.5), color: p.first <= at ? p.color : '#9a93b5' },
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  })),
})

const routeData = (stops, at) => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: stops.slice(0, Math.max(at + 1, 1)).map(s => [s.lng, s.lat]) },
})

// 這一站要秀的照片：每場的封面（本機 AVIF 優先）＋現場照，重複的拿掉
function stopPhotos(stop) {
  const out = [], seen = new Set()
  for (const e of stop.events) {
    const cover = coverOf(e)
    if (cover && !seen.has(cover)) { seen.add(cover); out.push({ key: `${e.id}-c`, src: coverSrc(e, 'sm'), event: e }) }
    for (const p of e.photos || []) {
      const url = photoUrl(p)
      if (seen.has(url)) continue
      seen.add(url)
      out.push({ key: `${e.id}-${out.length}`, src: url })
    }
  }
  return out
}

const fmtDate = (s) => String(s || '').replace(/-/g, '.')

export default function VenueTour({ events, attended, onSelectEvent }) {
  const bands = useMemo(() => tourBands(events), [events])
  // band：'' 全部｜團的 key｜'mine' 只飛自己標過「我有去」的
  const [band, setBand] = useState('')
  const mineCount = useMemo(() => attended?.size ? tourStops(events, { only: attended }).length : 0, [events, attended])
  const stops = useMemo(() => band === 'mine'
    ? tourStops(events, { only: attended })
    : tourStops(events, { band }), [events, band, attended])
  const pillars = useMemo(() => venuePillars(stops), [stops])
  const summary = useMemo(() => tourSummary(stops), [stops])
  const photos = useMemo(() => stops.map(stopPhotos), [stops])
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [done, setDone] = useState(false)   // 飛完最後一站：拉遠看全部、出結算卡
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState('')

  const dark = useDarkClass()
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)')
  const boxRef = useRef(null)
  const wrapRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const near = useNearViewport(boxRef)

  // 換團就從頭飛
  useEffect(() => { setAt(0); setPlaying(false); setDone(false) }, [band])

  // 建地圖。換深淺色整張重建 —— 比逐層改色簡單，也不會漏
  useEffect(() => {
    if (!near || !boxRef.current) return
    let map, cancelled = false
    setReady(false)
    ;(async () => {
      try {
        const [ml, { default: workerUrl }] = await Promise.all([
          import('maplibre-gl'),
          import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
          import('maplibre-gl/dist/maplibre-gl.css'),
        ])
        ml.setWorkerUrl(workerUrl)
        const style = await buildStyle(dark)
        if (cancelled) return
        map = new ml.Map({
          container: boxRef.current,
          style,
          center: [121.53, 25.04], zoom: 10.6, pitch: 50, bearing: -12,
          maxPitch: 78,
          pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
          attributionControl: false,
          // 地圖夾在長頁面中間：手機兩指才拖、桌機 Ctrl + 滾輪才縮放，不然整頁會卡在地圖上捲不過去
          cooperativeGestures: true,
          locale: {
            'CooperativeGesturesHandler.WindowsHelpText': '按住 Ctrl 再滾動滑鼠來縮放地圖',
            'CooperativeGesturesHandler.MacHelpText': '按住 ⌘ 再滾動滑鼠來縮放地圖',
            'CooperativeGesturesHandler.MobileHelpText': '用兩指移動地圖',
          },
          localIdeographFontFamily: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
        })
        mapRef.current = map
        map.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-right')
        // 全螢幕連資訊卡一起帶進去，不然進去之後就不知道飛到哪了
        map.addControl(new ml.FullscreenControl({ container: wrapRef.current }), 'top-right')
        // 版權放右下收合：左下是資訊卡、左上（手機）與右上（桌機）是照片
        map.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right')

        // 外層給 maplibre 定位（它會改 transform），動畫做在裡面那層才不會打架
        const el = document.createElement('div')
        el.appendChild(document.createElement('span')).className = 'tour-pin'
        markerRef.current = new ml.Marker({ element: el, anchor: 'bottom', offset: [0, -6] }).setLngLat([121.53, 25.04])

        map.on('load', () => {
          if (cancelled) return
          map.addSource('tour-route', { type: 'geojson', data: routeData([], 0) })
          map.addSource('tour-pillars', { type: 'geojson', data: pillarData([], 0) })
          map.addSource('tour-dots', { type: 'geojson', data: dotData([], 0) })
          map.addLayer({
            id: 'tour-route', type: 'line', source: 'tour-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#f472b6', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2, 16, 6], 'line-opacity': 0.85 },
          })
          map.addLayer({
            id: 'tour-pillars', type: 'fill-extrusion', source: 'tour-pillars',
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.88,
            },
          })
          map.getContainer().querySelector('.maplibregl-compact-show')?.classList.remove('maplibregl-compact-show')
          map.addLayer({
            id: 'tour-dots', type: 'circle', source: 'tour-dots', maxzoom: 15.5,
            paint: {
              'circle-color': ['get', 'color'],
              'circle-radius': ['get', 'r'],
              'circle-stroke-color': dark ? '#0b0a24' : '#ffffff',
              'circle-stroke-width': 2.5,
              'circle-opacity': ['interpolate', ['linear'], ['zoom'], 14.6, 1, 15.4, 0],
              'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 14.6, 1, 15.4, 0],
            },
          })
          for (const l of ['tour-pillars', 'tour-dots']) {
            map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer' })
            map.on('mouseleave', l, () => { map.getCanvas().style.cursor = '' })
          }
          setReady(true)
        })
        // 使用者自己動手拖、轉，就是想自己逛 —— 自動播放讓位
        const userMoved = (e) => { if (e.originalEvent) setPlaying(false) }
        map.on('dragstart', userMoved)
        map.on('rotatestart', userMoved)
        map.on('pitchstart', userMoved)
        map.on('error', (e) => { if (e?.error?.message?.includes('WebGL')) setFailed('webgl') })
      } catch (err) {
        if (!cancelled) setFailed(String(err?.message || err).includes('WebGL') ? 'webgl' : 'load')
      }
    })()
    return () => {
      cancelled = true
      markerRef.current?.remove()
      map?.remove()
      mapRef.current = null
    }
  }, [near, dark])

  // 光柱、航線跟著目前站數更新：去過的亮、還沒去的灰
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.getSource('tour-pillars')?.setData(pillarData(pillars, at))
    map.getSource('tour-dots')?.setData(dotData(pillars, at))
    map.getSource('tour-route')?.setData(routeData(stops, at))
  }, [ready, pillars, stops, at])

  // 點光柱或光點：跳到那個場館「下一次」出現的那一站（沒有下一次就回第一次）
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const onClick = (e) => {
      const key = e.features?.[0]?.properties?.key
      if (!key) return
      const next = stops.find(s => s.key === key && s.index > at) || stops.find(s => s.key === key)
      if (next) { setPlaying(false); setAt(next.index) }
    }
    const layers = ['tour-pillars', 'tour-dots']
    for (const l of layers) map.on('click', l, onClick)
    return () => { for (const l of layers) map.off('click', l, onClick) }
  }, [ready, stops, at])

  // 飛行：到站 → 慢慢繞一圈 → 播放中就往下一站
  useEffect(() => {
    const map = mapRef.current
    const stop = stops[at]
    if (!ready || !map || !stop || done) return
    const prev = stops[at - 1]
    const bearing = prev && (prev.lat !== stop.lat || prev.lng !== stop.lng)
      ? bearingBetween(prev, stop) : map.getBearing()
    // padding 歸零：上帝視角為了避開結算卡設過左側 padding，flyTo 的 padding 會一直留在地圖上
    const target = { center: [stop.lng, stop.lat], zoom: 15.8, pitch: 62, bearing, padding: { left: 0, top: 0, right: 0, bottom: 0 } }

    markerRef.current?.setLngLat(target.center).addTo(map)
    const pin = markerRef.current?.getElement().firstChild
    if (pin) {
      pin.textContent = stop.name
      pin.style.setProperty('--pin', stop.color)
      pin.classList.remove('pop'); void pin.offsetWidth; pin.classList.add('pop')   // 重播到站的彈跳
    }

    let timer, raf, alive = true
    const dwell = () => {
      // 到站再對一次名牌：飛行中途被打斷過的話，maplibre 偶爾會留著舊的位置
      markerRef.current?.setLngLat(target.center)
      if (!alive || !playing) return
      // 不能在 moveend 裡直接接下一段動畫：maplibre 發完 moveend 才收尾，會把新動畫的狀態清掉
      const n = Math.min(photos[at]?.length || 0, 4)
      const stay = (reduce ? 2600 : DWELL) + Math.max(0, n - 1) * PER_PHOTO
      if (!reduce) raf = requestAnimationFrame(() => alive && map.easeTo({ bearing: bearing + ORBIT, duration: stay, easing: t => t }))
      timer = setTimeout(() => {
        if (!alive) return
        if (at + 1 < stops.length) setAt(at + 1)
        else { setPlaying(false); setDone(true) }
      }, stay)
    }
    if (reduce) { map.jumpTo(target); dwell() }
    else {
      // 順序不能反：flyTo 會先中斷還在繞的上一段，當場發一次 moveend。
      // 先掛監聽的話會被那一次誤觸發，馬上開始繞圈，反過來把剛起飛的 flyTo 打斷
      map.flyTo({ ...target, speed: 1.1, curve: 1.2, essential: true })
      map.once('moveend', dwell)
    }
    return () => {
      alive = false
      clearTimeout(timer)
      cancelAnimationFrame(raf)
      map.off('moveend', dwell)
    }
  }, [ready, stops, photos, at, playing, reduce, done])

  // 先把下一站的第一張照片抓下來，到站時才不會空一格再彈出來
  useEffect(() => {
    const next = photos[at + 1]?.[0]
    if (next) new Image().src = next.src
  }, [photos, at])

  // 飛完：上帝視角 —— 升高、斜斜俯瞰台北，3D 建物與點亮的光柱一起入鏡，再慢慢繞一段。
  // 只看台北核心（12 km 內）；林口、桃園、高雄落在畫面外沒關係。
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !done || !stops.length) return
    markerRef.current?.remove()
    // 站太少時中位數不可靠（一站台北一站高雄會框在中間的海上），改成以最後一站為準
    const last = stops[stops.length - 1]
    const near = stops.length >= 3 ? splitByProximity(stops, 12).near : stops.filter(s => roughKm(s, last) <= 12)
    const lngs = near.map(s => s.lng), lats = near.map(s => s.lat)
    const wide = map.getContainer().clientWidth >= 640
    const bearing = -25
    // 高度固定在看得到建物的 14 級，所以框不進全部場館 —— 對準台北核心的中心，
    // 斜 65 度看出去，遠一點的光柱會從地平線上冒出來
    const center = [lngs.reduce((a, b) => a + b, 0) / lngs.length, lats.reduce((a, b) => a + b, 0) / lats.length]
    const target = { center, zoom: GOD_ZOOM, pitch: 65, bearing, padding: { left: wide ? 420 : 0, top: 0, right: 0, bottom: 0 } }
    let raf, alive = true
    const orbit = () => {
      if (!alive || reduce) return
      raf = requestAnimationFrame(() => alive && map.easeTo({ bearing: bearing + 120, duration: 30000, easing: t => t }))
    }
    if (reduce) map.jumpTo(target)
    else { map.flyTo({ ...target, speed: 0.8, curve: 1.3, essential: true }); map.once('moveend', orbit) }   // 順序同上
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      map.off('moveend', orbit)
    }
  }, [ready, done, stops, reduce])

  const stop = stops[at]
  const go = (i) => { setPlaying(false); setDone(false); setAt(Math.max(0, Math.min(stops.length - 1, i))) }
  const togglePlay = () => {
    if (!playing && at >= stops.length - 1) setAt(0)
    setDone(false)
    setPlaying(p => !p)
  }
  const replay = () => { setDone(false); setAt(0); setPlaying(true) }

  return (
    <div className="flex flex-col gap-3">
      {bands.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
          <BandChip active={!band} onClick={() => setBand('')} label="全部" />
          {mineCount > 0 && <BandChip active={band === 'mine'} onClick={() => setBand('mine')} label="我的足跡" icon="heart" />}
          {bands.map(b => (
            <BandChip key={b.key} active={band === b.key} onClick={() => setBand(b.key)} label={b.name} color={b.color} />
          ))}
        </div>
      )}

      {/* 手機：資訊卡放在地圖下面，地圖才看得到；桌機：浮在地圖左下 */}
      <div ref={wrapRef} className="tour-wrap relative rounded-2xl overflow-hidden border border-dream-line bg-dream-bg dark:border-white/10">
        <div className="tour-map relative bg-dream-line/30 h-[58vh] min-h-[360px] sm:h-[68vh] sm:min-h-[440px] max-h-[720px]">
          {/* inline style：maplibre 的 CSS 會把 .maplibregl-map 改成 position: relative，class 蓋不過它 */}
          <div ref={boxRef} style={{ position: 'absolute', inset: 0 }} />

          {!ready && !failed && (
            <div className="absolute inset-0 grid place-items-center text-[15px] text-dream-sub pointer-events-none">
              <span><Icon n="location-dot" className="mr-2" />{near ? '起飛準備中…' : '捲到這裡就會載入地圖'}</span>
            </div>
          )}
          {ready && !done && photos[at]?.length > 0 && (
            <StopPhotos key={stops[at].key + at} items={photos[at]} />
          )}
          {failed && (
            <div className="absolute inset-0 grid place-items-center px-6 text-center text-[15px] text-dream-sub">
              {failed === 'webgl' ? '這台裝置的瀏覽器沒有開 WebGL，3D 地圖跑不起來。' : '地圖載入失敗，晚點再試一次。'}
            </div>
          )}
        </div>
        {ready && done && summary && (
          <div className="p-4 border-t border-dream-line dark:border-white/10 sm:border sm:absolute sm:left-3 sm:bottom-3 sm:w-[400px] sm:rounded-2xl sm:bg-white sm:dark:bg-[#141233]">
            <div className="font-display font-bold text-[19px] text-dream-ink">
              {band === 'mine' ? '你的足跡飛完了' : '飛完了'}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[['場館', summary.venues], ['公里', summary.km], ['年', summary.years]].map(([l, n]) => (
                <div key={l} className="rounded-xl bg-dream-line/40 dark:bg-white/[.06] py-2.5">
                  <div className="font-display font-bold text-[24px] leading-none text-dream-ink tabular-nums">{n}</div>
                  <div className="mt-1 text-[14px] text-dream-sub">{l}</div>
                </div>
              ))}
            </div>
            {summary.top && (
              <div className="mt-3 text-[15px] text-dream-ink truncate">
                最常回去：{summary.top.name}，{summary.top.n} 場
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button className="btn-primary !px-4" onClick={replay}>重飛一次</button>
              <button className="btn-ghost" onClick={() => setDone(false)}>回到最後一站</button>
            </div>
          </div>
        )}
        {ready && stop && !done && (
          <div className="p-4 border-t border-dream-line dark:border-white/10 sm:border sm:absolute sm:left-3 sm:bottom-3 sm:w-[400px] sm:rounded-2xl sm:bg-white sm:dark:bg-[#141233]">
            <div className="flex items-center gap-2 text-[14px] text-dream-sub tabular-nums">
              <span className="band-dot" style={{ background: stop.color }} />
              第 {at + 1} / {stops.length} 站
              <span className="text-dream-faint">·</span>
              {fmtDate(stop.from)}{stop.to !== stop.from && ` – ${fmtDate(stop.to)}`}
            </div>
            <div className="mt-1 font-display font-bold text-[19px] leading-snug text-dream-ink truncate">{stop.name}</div>
            <div className="mt-0.5 text-[15px] text-bloom-rose truncate">{stopFact(stop)}</div>
            <ul className="mt-1.5 flex flex-col gap-1">
              {stop.events.slice(0, 2).map(e => (
                <li key={e.id}>
                  <button onClick={() => onSelectEvent?.(e)}
                    className="w-full text-left text-[15px] text-dream-ink hover:text-bloom-rose truncate">
                    {e.title}
                  </button>
                </li>
              ))}
              {stop.events.length > 2 && <li className="text-[14px] text-dream-sub">還有 {stop.events.length - 2} 場</li>}
            </ul>

            <div className="mt-3 flex items-center gap-2">
              <button className="icon-btn" onClick={() => go(at - 1)} disabled={at === 0} aria-label="上一站">
                <Icon n="chevron-left" />
              </button>
              <button className="btn-primary !px-4" onClick={togglePlay}>
                {playing ? '暫停' : at === 0 ? '開始巡禮' : at >= stops.length - 1 ? '重飛一次' : '繼續'}
              </button>
              <button className="icon-btn" onClick={() => go(at + 1)} disabled={at >= stops.length - 1} aria-label="下一站">
                <Icon n="chevron-right" />
              </button>
              <a className="btn-ghost ml-auto" href={streetViewUrl(stop)} target="_blank" rel="noopener noreferrer">
                <Icon n="location-dot" className="mr-1.5 text-[13px]" />街景
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 拍立得：到站時彈出來，一站好幾張就輪著換
function StopPhotos({ items }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (items.length < 2) return
    const t = setInterval(() => setI(x => (x + 1) % items.length), PER_PHOTO)
    return () => clearInterval(t)
  }, [items])
  const it = items[i]
  return (
    <div className="tour-photo absolute left-3 top-3 w-[46%] max-w-[300px] sm:left-auto sm:right-14 sm:top-3 sm:w-[300px] pointer-events-none">
      <div key={it.key} className="polaroid tour-photo-in">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-dream-line/40">
          <Img src={it.src} event={it.event} sizes="300px" className="absolute inset-0 w-full h-full object-cover" />
        </div>
      </div>
      {items.length > 1 && (
        <div className="mt-1.5 flex justify-center gap-1.5">
          {items.map((x, j) => <span key={x.key} className={`h-1.5 rounded-full transition-all ${j === i ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />)}
        </div>
      )}
    </div>
  )
}

function BandChip({ active, onClick, label, color, icon }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[15px] font-medium border transition-colors ${
        active
          ? 'bg-bloom-indigo border-bloom-indigo text-white'
          : 'border-dream-line text-dream-sub hover:text-dream-ink dark:border-white/15'}`}>
      {color && <span className="band-dot" style={{ background: color }} />}
      {icon && <Icon n={icon} className="text-[12px]" />}
      {label}
    </button>
  )
}
