import { useCallback, useEffect, useMemo, useState } from 'react'
import { SHEET_SONGS_CSV_URL } from '../config.js'
import { parseSongsCsv, songMetaIndex } from '../utils/parseSongs.js'

// 「歌曲」分頁。跟 useEvents / usePulse 同一套 stale-while-revalidate：
// 先用快取秒開，背景再更新。
//
// 這張表是選填的，所以任何一步失敗都必須是靜默的 —— 沒有它，歌曲頁
// 少掉上半部而已，台灣履歷（這站真正獨有的東西）照常。
// 為了一張補充資料表在畫面上跳錯誤，是本末倒置。
const CACHE_KEY = 'bdtw-songmeta-cache'
const CACHE_VERSION = 1
const CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000   // 30 天（歌的資料幾乎不會變）

function readCache() {
  try {
    const { v, list, ts } = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') || {}
    if (v !== CACHE_VERSION || !ts || Date.now() - ts > CACHE_MAX_AGE) return null
    if (Array.isArray(list) && list.length) return { list, ts }
  } catch {}
  return null
}

export function useSongMeta() {
  const cached = SHEET_SONGS_CSV_URL ? readCache() : null
  const [list, setList] = useState(cached?.list || [])

  const load = useCallback(() => {
    if (!SHEET_SONGS_CSV_URL) return
    let alive = true
    fetch(SHEET_SONGS_CSV_URL, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() })
      .then(text => {
        const parsed = parseSongsCsv(text)
        // 空表不要覆蓋掉快取 —— 使用者可能只是正在編輯那張分頁
        if (!parsed.length || !alive) return
        setList(parsed)
        try {
          localStorage.setItem(CACHE_KEY,
            JSON.stringify({ v: CACHE_VERSION, list: parsed, ts: Date.now() }))
        } catch {}
      })
      .catch(() => {})    // 分頁不存在是正常情況，不是錯誤
    return () => { alive = false }
  }, [])

  useEffect(() => load(), [load])

  // 元件要的是 key → 資料，不是一個要自己找的陣列。
  // 用 useMemo：每 render 重建一次 Map 會讓下游的 useMemo 全部失效。
  return useMemo(() => songMetaIndex(list), [list])
}
