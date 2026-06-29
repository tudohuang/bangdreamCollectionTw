// URL hash state — 不需要 react-router 就能分享網址
// 範例：#/year/2026 ｜ #/event/evt-034 ｜ #/filter?type=FMT
//       #/person/愛美 ｜ #/band/Roselia

export function readHash() {
  const raw = (window.location.hash || '').replace(/^#\/?/, '')
  if (!raw) return { route: 'home', params: {} }
  const [path, query = ''] = raw.split('?')
  const segments = path.split('/').filter(Boolean)
  const params = Object.fromEntries(new URLSearchParams(query))

  if (segments[0] === 'event' && segments[1]) {
    return { route: 'event', id: decodeURIComponent(segments[1]), params }
  }
  if (segments[0] === 'year' && segments[1]) {
    return { route: 'year', year: Number(segments[1]), params }
  }
  if (segments[0] === 'person' && segments[1]) {
    return { route: 'person', value: decodeURIComponent(segments[1]), params }
  }
  if (segments[0] === 'band' && segments[1]) {
    return { route: 'band', value: decodeURIComponent(segments[1]), params }
  }
  if (segments[0] === 'filter') {
    return { route: 'filter', params }
  }
  return { route: 'home', params }
}

// replace=true 用 replaceState（給即時輸入類，例如搜尋邊打字邊更新網址，
// 不該每個按鍵都塞一筆瀏覽器歷史）。
export function writeHash(route, opts = {}, { replace = false } = {}) {
  let hash = '#/'
  if (route === 'event') hash = `#/event/${opts.id}`
  else if (route === 'year') hash = `#/year/${opts.year}`
  else if (route === 'person') hash = `#/person/${encodeURIComponent(opts.value)}`
  else if (route === 'band') hash = `#/band/${encodeURIComponent(opts.value)}`
  else if (route === 'filter') {
    const qs = new URLSearchParams(opts.params || {}).toString()
    hash = qs ? `#/filter?${qs}` : '#/'
  }
  if (window.location.hash !== hash) {
    history[replace ? 'replaceState' : 'pushState'](null, '', hash)
  }
}

export function currentShareUrl() {
  return window.location.href
}
