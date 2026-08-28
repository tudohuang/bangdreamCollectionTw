// URL hash state — 不需要 react-router 就能分享網址
// 頁面：#/ ｜ #/collection?year=2026&type=FMT ｜ #/people ｜ #/stats ｜ #/me ｜ #/labs
// 內容：#/event/evt-034 ｜ #/person/愛美 ｜ #/band/Roselia ｜ #/org/宝島制作委員会 ｜ #/venue/世貿一館
// 舊網址相容：#/filter?… → collection ｜ #/year/2026 → collection?year=2026 ｜ #/pulse → labs

const PAGES = new Set(['collection', 'people', 'stats', 'me', 'labs', 'pulse'])

export function readHash() {
  const raw = (window.location.hash || '').replace(/^#\/?/, '')
  if (!raw) return { route: 'home', params: {} }
  const [path, query = ''] = raw.split('?')
  const segments = path.split('/').filter(Boolean)
  const params = Object.fromEntries(new URLSearchParams(query))

  if (segments[0] === 'event' && segments[1]) {
    return { route: 'event', id: decodeURIComponent(segments[1]), params }
  }
  if (segments[0] === 'person' && segments[1]) {
    return { route: 'person', value: decodeURIComponent(segments[1]), params }
  }
  if (segments[0] === 'band' && segments[1]) {
    return { route: 'band', value: decodeURIComponent(segments[1]), params }
  }
  if (segments[0] === 'org' && segments[1]) {
    return { route: 'org', value: decodeURIComponent(segments[1]), params }
  }
  // 場館：segment 是 venueKey() 正規化後的 key，不是原始地點字串。
  // 這樣「南港展覽館一館」與「台北南港展覽館一館 4 樓」會指到同一個網址。
  if (segments[0] === 'venue' && segments[1]) {
    return { route: 'venue', value: decodeURIComponent(segments[1]), params }
  }
  // 系列：segment 是 utils/series.js 定的 key（bushiroad-expo 這種），
  // 用系列名稱也進得去 —— findSeries 兩種都認。
  if (segments[0] === 'series' && segments[1]) {
    return { route: 'series', value: decodeURIComponent(segments[1]), params }
  }
  if (PAGES.has(segments[0])) {
    return { route: segments[0], params }
  }
  // 舊網址相容
  if (segments[0] === 'year' && segments[1]) {
    return { route: 'collection', params: { ...params, year: segments[1] } }
  }
  if (segments[0] === 'filter') {
    return { route: 'collection', params }
  }
  return { route: 'home', params }
}

// replace=true 用 replaceState（給即時輸入類，例如搜尋邊打字邊更新網址，
// 不該每個按鍵都塞一筆瀏覽器歷史）。
export function writeHash(route, opts = {}, { replace = false } = {}) {
  let hash = '#/'
  if (route === 'event') hash = `#/event/${opts.id}`
  else if (route === 'person') hash = `#/person/${encodeURIComponent(opts.value)}`
  else if (route === 'band') hash = `#/band/${encodeURIComponent(opts.value)}`
  else if (route === 'venue') hash = `#/venue/${encodeURIComponent(opts.value)}`
  else if (route === 'series') hash = `#/series/${encodeURIComponent(opts.value)}`
  else if (route === 'year') hash = `#/collection?year=${opts.year}`
  else if (route === 'collection' || route === 'filter') {
    const qs = new URLSearchParams(opts.params || {}).toString()
    hash = qs ? `#/collection?${qs}` : '#/collection'
  } else if (PAGES.has(route)) {
    hash = `#/${route}`
  }
  if (window.location.hash !== hash) {
    history[replace ? 'replaceState' : 'pushState'](null, '', hash)
  }
}

export function currentShareUrl() {
  return window.location.href
}
