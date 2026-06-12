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

export function writeHash(route, opts = {}) {
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
    history.pushState(null, '', hash)
  }
}

export function currentShareUrl() {
  return window.location.href
}
