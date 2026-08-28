import { useCallback, useEffect, useState } from 'react'
import bundled from '../data/events.json' with { type: 'json' }
import { SHEET_CSV_URL } from '../config.js'
import { parseCsvToEvents, mergeWithBundled } from '../utils/parseEvents.js'

const CACHE_KEY = 'bdtw-events-cache'
const CACHE_VERSION = 3          // 解析邏輯改了就 +1（Sheet 加欄免動：extras 走背景更新自動補上）
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000  // 7 天，超過視為過期

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { v, events, ts } = JSON.parse(raw)
    if (v !== CACHE_VERSION) return null
    if (!ts || Date.now() - ts > CACHE_MAX_AGE) return null
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

  // 回傳 Promise，下拉重新整理才知道什麼時候轉完。
  // alive 由呼叫端傳進來，元件卸載後就不要再 setState。
  const fetchSheet = useCallback((isAlive = () => true) => {
    if (!SHEET_CSV_URL) return Promise.resolve()
    setSource(prev => (prev === 'bundled' || prev === 'error' ? 'loading' : prev))
    return fetch(SHEET_CSV_URL, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() })
      .then(text => {
        const parsed = parseCsvToEvents(text)
        if (!parsed.length) throw new Error('empty sheet')
        const merged = mergeWithBundled(parsed, bundled)
        const ts = Date.now()
        if (!isAlive()) return
        setEvents(merged); setSource('sheet'); setUpdatedAt(ts)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ v: CACHE_VERSION, events: merged, ts })) } catch {}
      })
      .catch((e) => {
        console.warn('[useEvents] 即時抓取失敗：', e.message)
        if (isAlive()) setSource(prev => (prev === 'cached' ? 'cached' : 'error'))
      })
  }, [])

  useEffect(() => {
    let alive = true
    fetchSheet(() => alive)
    return () => { alive = false }
  }, [fetchSheet])

  return { events, source, updatedAt, retry: () => fetchSheet() }
}
