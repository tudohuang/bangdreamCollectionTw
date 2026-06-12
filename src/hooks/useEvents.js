import { useCallback, useEffect, useState } from 'react'
import bundled from '../data/events.json'
import { SHEET_CSV_URL } from '../config.js'
import { parseCsvToEvents, mergeWithBundled } from '../utils/parseEvents.js'

const CACHE_KEY = 'bdtw-events-cache'

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { events, ts } = JSON.parse(raw)
    if (Array.isArray(events) && events.length) return { events, ts }
  } catch {}
  return null
}

// 即時抓 Google Sheet（若有設定）：先用快取/內建秒開，背景再更新（stale-while-revalidate）。
export function useEvents() {
  const cached = SHEET_CSV_URL ? readCache() : null
  const [events, setEvents] = useState(cached?.events || bundled)
  // bundled | loading | sheet | cached | error
  const [source, setSource] = useState(
    !SHEET_CSV_URL ? 'bundled' : cached ? 'cached' : 'loading')
  const [updatedAt, setUpdatedAt] = useState(cached?.ts || null)

  const load = useCallback(() => {
    if (!SHEET_CSV_URL) return () => {}
    let alive = true
    setSource(prev => (prev === 'bundled' || prev === 'error' ? 'loading' : prev))
    fetch(SHEET_CSV_URL, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() })
      .then(text => {
        const parsed = parseCsvToEvents(text)
        if (!parsed.length) throw new Error('empty sheet')
        const merged = mergeWithBundled(parsed, bundled)
        const ts = Date.now()
        if (!alive) return
        setEvents(merged); setSource('sheet'); setUpdatedAt(ts)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ events: merged, ts })) } catch {}
      })
      .catch((e) => {
        console.warn('[useEvents] 即時抓取失敗：', e.message)
        if (alive) setSource(prev => (prev === 'cached' ? 'cached' : 'error'))
      })
    return () => { alive = false }
  }, [])

  useEffect(() => load(), [load])

  return { events, source, updatedAt, retry: load }
}
