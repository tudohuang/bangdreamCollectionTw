import { useCallback, useEffect, useState } from 'react'
import { SHEET_ROSTER_CSV_URL, SHEET_PULSE_CSV_URL } from '../config.js'
import { parseRosterCsv, parsePulseCsv } from '../utils/parsePulse.js'

// 「名冊 + 動態」兩張分頁。跟 useEvents 同一套 stale-while-revalidate：
// 先用快取秒開，背景再更新；抓不到就靜默留空，動態頁自己會收起來。
const CACHE_KEY = 'bdtw-pulse-cache'
const CACHE_VERSION = 1
const CACHE_MAX_AGE = 3 * 24 * 60 * 60 * 1000   // 3 天（行程比活動更常變）

const ENABLED = !!(SHEET_ROSTER_CSV_URL && SHEET_PULSE_CSV_URL)

function readCache() {
  try {
    const { v, roster, pulse, ts } = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') || {}
    if (v !== CACHE_VERSION || !ts || Date.now() - ts > CACHE_MAX_AGE) return null
    if (Array.isArray(roster) && Array.isArray(pulse) && roster.length) return { roster, pulse, ts }
  } catch {}
  return null
}

export function usePulse() {
  const cached = ENABLED ? readCache() : null
  const [roster, setRoster] = useState(cached?.roster || [])
  const [pulse, setPulse] = useState(cached?.pulse || [])
  const [source, setSource] = useState(!ENABLED ? 'off' : cached ? 'cached' : 'loading')
  const [updatedAt, setUpdatedAt] = useState(cached?.ts || null)

  const load = useCallback(() => {
    if (!ENABLED) return () => {}
    let alive = true
    setSource(prev => (prev === 'error' ? 'loading' : prev))
    Promise.all([
      fetch(SHEET_ROSTER_CSV_URL, { cache: 'no-store' }).then(r => r.text()),
      fetch(SHEET_PULSE_CSV_URL, { cache: 'no-store' }).then(r => r.text()),
    ])
      .then(([rosterCsv, pulseCsv]) => {
        const r = parseRosterCsv(rosterCsv)
        const p = parsePulseCsv(pulseCsv)
        if (!r.length) throw new Error('empty roster')
        if (!alive) return
        const ts = Date.now()
        setRoster(r); setPulse(p); setSource('sheet'); setUpdatedAt(ts)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ v: CACHE_VERSION, roster: r, pulse: p, ts })) } catch {}
      })
      .catch((e) => {
        console.warn('[usePulse] 抓取失敗：', e.message)
        if (alive) setSource(prev => (prev === 'cached' ? 'cached' : 'error'))
      })
    return () => { alive = false }
  }, [])

  useEffect(() => load(), [load])

  return { roster, pulse, source, updatedAt, retry: load }
}
