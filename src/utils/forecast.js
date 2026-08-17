// 來台指數 —— 把「這個人現在來台的條件成不成熟」壓成一個 0–100 的分數。
//
// 老實話寫在前面：這不是統計意義上的機率。日本動態才累積幾個月，
// 樣本撐不起機率模型；這裡做的是把幾個看得見的因子加起來的「指數」，
// 每一分都攤開給你看是哪來的，你自己判斷要不要信。
// 等動態表累積滿一年，才有本錢談回測與校準。
import { todayStr, parseDate } from './datetime.js'

const monthsBetween = (fromYm, toYm) => {
  if (!fromYm || !toYm) return null
  const [fy, fm] = fromYm.split('-').map(Number)
  const [ty, tm] = toYm.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// 這個對象（個人或團名）有份的來台場次
export function twEventsOf(name, events, isBand) {
  return events.filter(e => {
    if (!e.startDate || e.startDate.includes('??')) return false
    if (isBand) return (e.relatedGroups || []).some(g => g.split('／')[0].trim() === name)
    return (e.people || []).includes(name)
  })
}

// 全站季節性：歷年各月的來台場次佔比（0–1），用來當「這個月本來就容易有活動」的加成
export function monthSeasonality(events) {
  const per = {}
  let total = 0
  for (const e of events) {
    if (!e.month) continue
    per[e.month] = (per[e.month] || 0) + 1
    total++
  }
  const out = {}
  for (let m = 1; m <= 12; m++) out[m] = total ? (per[m] || 0) / total : 0
  return out
}

// name：名冊上的對象名；targetYm：要算哪個月（YYYY-MM）
export function taiwanIndex(name, {
  events = [], pulse = [], roster = [], targetYm, today = todayStr(),
} = {}) {
  const entry = roster.find(r => r.name === name)
  const isBand = entry?.kind === 'band'
  const band = entry?.band || ''
  const ym = targetYm || today.slice(0, 7)
  const month = Number(ym.slice(5))

  const mine = twEventsOf(name, events, isBand)

  // ── 0. 已經公告了就不用猜 ──
  const scheduled = mine.filter(e => e.startDate.slice(0, 7) === ym)
  if (scheduled.length) {
    return { name, ym, scheduled: true, score: 100, level: 'confirmed', events: scheduled, factors: [] }
  }

  const factors = []
  const add = (label, pts, detail) => { if (pts > 0) factors.push({ label, pts: Math.round(pts), detail }) }

  // ── 1. 底分：有在名冊上、還在活動 ──
  add('基本分', 6, '在追蹤名單上')

  // ── 2. 空窗：上次來台隔多久（越久越到期，但封頂，不會無限累積）──
  const past = mine.filter(e => e.startDate.slice(0, 7) < ym).map(e => e.startDate.slice(0, 7)).sort()
  const lastYm = past[past.length - 1] || null
  const gap = lastYm ? monthsBetween(lastYm, ym) : null
  if (gap == null) {
    add('從沒來過', 8, '沒有來台紀錄，先給一點底')
  } else {
    add('距上次來台', clamp(gap * 2.2, 0, 30), `${gap} 個月前來過（${lastYm}）`)
  }

  // ── 3. 日本活躍度：最近 60 天有幾筆行程（有在動的人才有機會被排到海外）──
  const t = parseDate(today)
  const recent = pulse.filter(p => {
    if (p.name !== name || !p.date) return false
    const d = parseDate(p.date)
    if (!d || !t) return false
    const days = (t - d) / 86400000
    return days >= 0 && days <= 60
  })
  add('日本近況', clamp(recent.length * 4.5, 0, 24), `近 60 天 ${recent.length} 筆行程`)

  // ── 4. 檔期：全站歷史上這個月來台的密度 ──
  const season = monthSeasonality(events)[month] || 0
  add('月份檔期', clamp(season * 100 * 1.6, 0, 18), `歷年 ${month} 月佔全部場次 ${(season * 100).toFixed(0)}%`)

  // ── 5. 同團動能：同團近 12 個月來過幾次（團在跑，成員被帶來的機會就高）──
  if (band) {
    const cutoff = shiftYm(ym, -12)
    const bandTw = twEventsOf(band, events, true)
      .filter(e => { const m = e.startDate.slice(0, 7); return m >= cutoff && m < ym })
    add('同團動能', clamp(bandTw.length * 5, 0, 16), `${band} 近一年來台 ${bandTw.length} 場`)
  }

  const score = clamp(factors.reduce((s, f) => s + f.pts, 0), 0, 96)
  return {
    name, ym, scheduled: false, score,
    level: score >= 55 ? 'high' : score >= 35 ? 'mid' : score >= 18 ? 'low' : 'cold',
    events: [], factors: factors.sort((a, b) => b.pts - a.pts),
  }
}

export function shiftYm(ym, delta) {
  let [y, m] = ym.split('-').map(Number)
  m += delta
  y += Math.floor((m - 1) / 12)
  m = ((m - 1) % 12 + 12) % 12 + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

export const LEVEL_LABEL = {
  confirmed: '已公告',
  high: '條件成熟',
  mid: '值得留意',
  low: '暫時安靜',
  cold: '沒什麼跡象',
}

// 一次算整份名冊，分數高的排前面
export function rankIndex(roster, opts) {
  return roster
    .filter(r => r.tracked)
    .map(r => taiwanIndex(r.name, { ...opts, roster }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}
