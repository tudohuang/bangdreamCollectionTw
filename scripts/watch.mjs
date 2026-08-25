// 邦邦看盤 —— 盯 eventernote 上追蹤名單的新活動，台灣相關的直接拉警報。
//
//   npm run watch              一天跑一輪（預設 1440 分鐘）
//   npm run watch -- --interval 360      改成 6 小時
//   npm run watch -- --once              跑一輪就結束（適合丟排程）
//
// 盯三個地方：eventernote（行程）、イープラス藝人頁（售票狀態）、チケットぴあ、
// 外加官方／FC 的公開消息頁，以及台灣新聞站的關鍵字搜尋（華視等）。
//
// 鍵盤：q 離開 · r 立即更新 · t 只看台灣 · c 匯出「動態」分頁可貼的 CSV
//
// 禮貌：每個請求間隔 1.5 秒、預設一天一輪、只讀公開頁面。
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fetchActor, fetchEplusArtist, fetchPia, fetchNews, fetchNewsSearch, guessType, TW_RE } from './watch/sources.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONF = join(ROOT, 'watch.targets.json')
const STATE = join(ROOT, '.watch-state.json')
const EXPORT = join(ROOT, 'watch-export.csv')

const args = process.argv.slice(2)
const argVal = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const INTERVAL = Math.max(5, Number(argVal('--interval', 1440))) * 60 * 1000
const ONCE = args.includes('--once')

if (!existsSync(CONF)) {
  console.error('✗ 找不到 watch.targets.json，先跑一次：npm run watch:resolve')
  process.exit(1)
}
const conf = JSON.parse(readFileSync(CONF, 'utf8'))
const targets = conf.targets.filter(t => t.actorId || t.eplusId)
const piaKeywords = conf.piaKeywords || []

// ---- 狀態：記住看過哪些活動，才知道什麼是「新的」 ----
// 版本對不上就當第一次跑：來源結構改過時，用舊資料比對會產生大量假的「新增」
const STATE_VERSION = 2
const loadState = () => {
  try {
    const s = JSON.parse(readFileSync(STATE, 'utf8'))
    if (s.v !== STATE_VERSION) return { v: STATE_VERSION, seen: s.seen || {}, firstRun: false }
    return s
  } catch { return { v: STATE_VERSION, seen: {}, firstRun: true } }
}
const saveState = (s) => { try { writeFileSync(STATE, JSON.stringify(s), 'utf8') } catch {} }
let state = loadState()

// ---- 終端繪圖：不裝套件，直接 ANSI ----
const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', rev: '\x1b[7m',
  red: '\x1b[91m', grn: '\x1b[92m', yel: '\x1b[93m', blu: '\x1b[94m',
  mag: '\x1b[95m', cya: '\x1b[96m', gry: '\x1b[90m', wht: '\x1b[97m',
}
const W = () => process.stdout.columns || 100
const H = () => process.stdout.rows || 30
// 中日文是全形，用字元數排版會歪；粗略算寬度
const wcw = (s) => [...s].reduce((n, ch) => n + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/.test(ch) ? 2 : 1), 0)
const pad = (s, n) => { let out = String(s); while (wcw(out) < n) out += ' '; return out }
const cut = (s, n) => {
  let out = ''
  for (const ch of String(s)) { if (wcw(out + ch) > n) return out + '…'; out += ch }
  return out
}

let tape = []          // 異動流水：只有「這次開機之後」的變化
let rows = []          // 每個對象一列
let status = { last: null, next: null, errors: 0, running: false }
let view = 'tape'      // tape（異動流水）| tw（台灣清單）
let scroll = 0         // 目前這一頁從第幾筆開始
let pendingExport = []

// 台灣清單：從狀態檔掃出所有台灣相關的項目。
// 這跟流水帳不同 —— 基準線建好之後就不會再有「新的」異動，
// 但那些已經抓到的台灣場次還是要看得到，不然會以為根本沒抓到。
function twList() {
  const seen = state.seen || {}
  const byKey = new Map()
  for (const [source, items] of Object.entries(seen)) {
    const tag = source.split(':')[0]
    for (const item of Object.values(items)) {
      const text = `${item.title || ''} ${item.venue || ''}`
      if (!TW_RE.test(text)) continue
      // 同一場會同時出現在好幾個對象底下，用標題＋日期去重
      const key = `${item.title}|${item.date || ''}`
      if (!byKey.has(key)) byKey.set(key, { tag, date: item.date || '', title: item.title, venue: item.venue || '' })
    }
  }
  return [...byKey.values()].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

function render() {
  // --once 給排程／管線用，不畫 ANSI 全螢幕
  if (ONCE) return
  const w = W(), h = H()
  const line = C.gry + '─'.repeat(w) + C.reset
  const buf = []

  const twNew = tape.filter(t => t.tw && t.fresh).length
  buf.push(
    C.rev + C.bold + pad(' 邦邦看盤  BanG Dream! Watch', w - 26) +
    pad(new Date().toTimeString().slice(0, 8), 10) +
    pad(status.running ? '更新中…' : status.next ? `下次 ${Math.max(0, Math.round((status.next - Date.now()) / 1000))}s` : '', 16) + C.reset)

  // 雷達列同時講兩件事：這輪有沒有新的，以及總共盯到幾筆台灣相關
  const twTotal = twList().length
  buf.push(
    (twNew
      ? `${C.red}${C.bold} ● 台灣雷達：${twNew} 筆新的${C.reset}`
      : `${C.gry} ○ 台灣雷達：這輪沒有新的${C.reset}`) +
    `${C.gry}   已盯到 ${C.reset}${twTotal ? C.red + twTotal + C.reset : '0'}${C.gry} 筆台灣相關（按 t 看）` +
    `   ·   追蹤 ${targets.length} 位 · 錯誤 ${status.errors}${C.reset}`)
  buf.push(line)

  // 對象表：未來場次數 + 最新一筆
  buf.push(C.dim + ' ' + pad('對象', 16) + pad('未來', 6) + pad('新增', 6) + '最新一筆' + C.reset)
  const tableRows = Math.max(4, Math.min(rows.length, Math.floor((h - 12) * 0.45)))
  for (const r of rows.slice(0, tableRows)) {
    const nm = r.kind === 'band' ? C.bold + pad(cut(r.name, 15), 16) + C.reset : pad(cut(r.name, 15), 16)
    const nw = r.added ? C.grn + pad('+' + r.added, 6) + C.reset : pad('', 6)
    const nx = r.next ? `${C.cya}${r.next.date.slice(5)}${C.reset} ${cut(r.next.title, Math.max(10, w - 44))}` : C.gry + '—' + C.reset
    buf.push(' ' + nm + pad(String(r.future), 6) + nw + nx)
  }
  if (rows.length > tableRows) buf.push(C.gry + ` … 另外 ${rows.length - tableRows} 位${C.reset}`)
  buf.push(line)

  // 下半部：異動流水 或 台灣清單
  const list = view === 'tw' ? twList() : tape
  const perPage = Math.max(3, h - buf.length - 4)
  scroll = Math.max(0, Math.min(scroll, Math.max(0, list.length - perPage)))
  const shown = list.slice(scroll, scroll + perPage)

  buf.push(C.dim + (view === 'tw'
    ? ' 台灣相關（全部，含之前抓到的）'
    : ' 異動（新 → 舊，只有這次開機之後的）') + C.reset)

  if (!list.length) {
    buf.push(C.gry + (view === 'tw'
      ? '  （還沒抓到台灣相關的）'
      : '  （這一輪沒有新東西，按 t 看已經抓到的台灣場次）') + C.reset)
  }

  for (const item of shown) {
    if (view === 'tw') {
      const src = C.blu + pad(item.tag, 5) + C.reset
      const date = item.date ? item.date : '     —    '
      const body = cut(item.title + (item.venue ? ' @ ' + item.venue : ''), Math.max(12, w - 24))
      buf.push(` ${C.red}●${C.reset} ${src}${C.gry}${date}${C.reset} ${body}`)
    } else {
      const kind = item.kind === 'new' ? C.grn + '▲' : item.kind === 'chg' ? C.yel + '~' : C.gry + '×'
      const src = C.blu + pad(item.tag || '', 5) + C.reset
      const who = pad(cut(item.who, 11), 12)
      const date = item.date ? item.date.slice(5) : '  —  '
      const body = cut(item.text, Math.max(12, w - 40))
      buf.push(` ${kind}${C.reset} ${src}${C.gry}${date}${C.reset} ${who}${item.tw ? C.red + C.bold : ''}${body}${C.reset}` +
        (item.tw ? ` ${C.red}◀ 台灣${C.reset}` : ''))
    }
  }

  // 補到底部
  while (buf.length < h - 1) buf.push('')

  const pos = list.length > perPage
    ? `  ${scroll + 1}–${Math.min(scroll + perPage, list.length)} / ${list.length}`
    : (list.length ? `  ${list.length} 筆` : '')
  buf.push(C.rev + pad(
    ` q 離開   r 立即更新   t ${view === 'tw' ? '回異動流水' : '看台灣清單'}   c 匯出 CSV` +
    (pendingExport.length ? `（${pendingExport.length} 筆待匯）` : '') +
    '   ↑↓ PgUp/PgDn 捲動' + pos, w) + C.reset)

  process.stdout.write('\x1b[H\x1b[2J' + buf.join('\n'))
}

// ---- 抓一輪 ----
async function tick() {
  status.running = true
  status.errors = 0
  render()
  const seen = state.seen || {}
  const firstRun = state.firstRun !== false
  const fresh = []

  const today = new Date().toISOString().slice(0, 10)

  // 一個來源抓回來的清單 → 比對出「新增／異動／消失」
  const diff = (key, list, who, tag, target) => {
    const before = seen[key] || {}
    const after = {}
    let added = 0
    for (const ev of list) {
      after[ev.id] = { date: ev.date, title: ev.title, venue: ev.venue, status: ev.status || '' }
      const old = before[ev.id]
      const tw = TW_RE.test(`${ev.title} ${ev.venue}`)
      const label = ev.status ? `[${ev.status}] ` : ''
      if (!old) {
        if (!firstRun) {
          added++
          fresh.push({ kind: 'new', tag, who, date: ev.date, tw, ev, target, text: `${label}${ev.title}${ev.venue ? ' @ ' + ev.venue : ''}` })
        }
      } else if (old.date !== ev.date || old.venue !== ev.venue || old.status !== (ev.status || '')) {
        const what = old.date !== ev.date ? `${old.date} → ${ev.date}`
          : old.venue !== ev.venue ? `${old.venue} → ${ev.venue}`
          : `售票狀態 ${old.status || '—'} → ${ev.status}`   // 抽選 → 一般発売 就是開賣了
        fresh.push({ kind: 'chg', tag, who, date: ev.date, tw, ev, target, text: `${ev.title} · ${what}` })
      }
    }
    if (!firstRun) {
      for (const [id, old] of Object.entries(before)) {
        if (!after[id] && (old.date || '') >= today) {
          fresh.push({ kind: 'del', tag, who, date: old.date, tw: TW_RE.test(old.title + old.venue), text: `${old.title}（消失了，可能取消／延期）` })
        }
      }
    }
    seen[key] = after
    return added
  }

  const bump = (t, list, added) => {
    const future = list.filter(e => (e.date || '9999') >= today)
    const row = rows.find(r => r.name === t.name)
    const data = {
      name: t.name, kind: t.kind,
      future: (row?.future || 0) + future.length,
      added: (row?.added || 0) + added,
      next: [...(row?.next ? [row.next] : []), ...future].sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0] || null,
    }
    if (row) Object.assign(row, data); else rows.push(data)
  }

  for (const r of rows) { r.future = 0; r.added = 0; r.next = null }

  for (const t of targets) {
    if (t.actorId) {
      try {
        const list = await fetchActor(t.actorId, t.actorName || t.name)
        bump(t, list, diff(`en:${t.actorId}`, list, t.name, 'EN', t))
      } catch { status.errors++ }
      render()
    }
    if (t.eplusId) {
      try {
        const list = await fetchEplusArtist(t.eplusId)
        bump(t, list, diff(`ep:${t.eplusId}`, list, t.name, 'e+', t))
      } catch { status.errors++ }
      render()
    }
  }

  // チケットぴあ：只用團名這種夠獨特的關鍵字，並在 sources 那邊做過嚴格過濾
  for (const kw of piaKeywords) {
    try {
      const list = await fetchPia(kw)
      diff(`pia:${kw}`, list, kw, 'ぴあ', null)
    } catch { status.errors++ }
    render()
  }

  // 官方／FC 的公開消息頁，以及新聞站的關鍵字搜尋
  for (const n of (conf.news || [])) {
    try {
      // 有 search 的是新聞站：用關鍵字去搜，並要求標題真的含那個關鍵字
      const items = n.search ? await fetchNewsSearch(n) : await fetchNews(n.url)
      const key = 'news:' + (n.search || n.url)
      const before = seen[key] || {}
      const after = {}
      for (const it of items) {
        after[it.id] = { title: it.title, date: it.date || '' }
        if (!before[it.id] && !firstRun) {
          fresh.push({
            kind: 'new', tag: 'NEWS', who: n.label, date: it.date || '',
            text: it.title, url: it.url, tw: TW_RE.test(it.title),
          })
        }
      }
      seen[key] = after
    } catch { status.errors++ }
  }

  for (const f of fresh) f.fresh = true
  for (const t of tape) t.fresh = false
  tape = [...fresh, ...tape].slice(0, 200)
  pendingExport = tape.filter(t => t.kind === 'new' && t.ev).slice(0, 100)

  // 這一輪沒碰到的鍵值代表來源被移除／改名（或舊版留下的），清掉免得檔案一直長
  const live = new Set([
    ...targets.flatMap(t => [t.actorId && `en:${t.actorId}`, t.eplusId && `ep:${t.eplusId}`]).filter(Boolean),
    ...piaKeywords.map(k => `pia:${k}`),
    // 鍵值要跟上面存的時候一致（新聞站是用 search 當鍵），
    // 不然這裡會把它當成沒在追的來源清掉，每輪都重新報一次同樣的新聞
    ...(conf.news || []).map(n => 'news:' + (n.search || n.url)),
  ])
  for (const k of Object.keys(seen)) if (!live.has(k)) delete seen[k]

  state = { v: STATE_VERSION, seen, firstRun: false }
  saveState(state)
  status.last = Date.now()
  status.next = Date.now() + INTERVAL
  status.running = false

  // 台灣相關就叫一聲
  if (fresh.some(f => f.tw)) process.stdout.write('\x07')
  render()
  return fresh
}

// ---- 匯出成「動態」分頁可以直接貼的 CSV ----
function exportCsv() {
  const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`
  const lines = ['日期,對象,類型,標題,地點,狀態,連結']
  for (const t of pendingExport) {
    lines.push([t.ev.date, t.target?.name || t.who, guessType(t.ev.title), t.ev.title, t.ev.venue, '已公開', t.ev.url]
      .map(esc).join(','))
  }
  writeFileSync(EXPORT, lines.join('\n') + '\n', 'utf8')
  tape.unshift({ kind: 'chg', who: '匯出', date: '', text: `${pendingExport.length} 筆 → ${EXPORT.replace(ROOT, '.')}`, tw: false })
  render()
}

// ---- 主迴圈 ----
if (ONCE) {
  process.stdout.write(`盯 ${targets.length} 個對象（eventernote + e+ + ぴあ + 官方消息）…\n`)
  const fresh = await tick()
  if (args.includes('--export') && pendingExport.length) exportCsv()
  for (const f of fresh) {
    const kind = f.kind === 'new' ? 'NEW' : f.kind === 'chg' ? 'CHG' : 'DEL'
    console.log(`${f.tw ? '★台灣 ' : '     '}${kind} ${String(f.tag || '').padEnd(5)}${(f.date || '  —  ').slice(5)} ${f.who}　${f.text}`)
  }
  console.log(fresh.length
    ? `\n${fresh.length} 筆異動（其中 ${fresh.filter(f => f.tw).length} 筆台灣相關）`
    : '\n沒有異動')
  if (status.errors) console.log(`${status.errors} 個來源抓取失敗`)
  process.exit(0)
}

process.stdout.write('\x1b[?1049h')            // 切到 alternate screen
const cleanup = () => { process.stdout.write('\x1b[?1049l'); process.exit(0) }
process.on('SIGINT', cleanup)

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', (b) => {
    const k = b.toString()
    const page = Math.max(3, (H() - 14))
    if (k === 'q' || k === '\x03') cleanup()
    else if (k === 'r' && !status.running) tick()
    else if (k === 't') { view = view === 'tw' ? 'tape' : 'tw'; scroll = 0; render() }
    else if (k === 'c') exportCsv()
    // 方向鍵與翻頁鍵送的是跳脫序列；另外收 j/k 給習慣 vim 的手指
    else if (k === '\x1b[B' || k === 'j') { scroll++; render() }
    else if (k === '\x1b[A' || k === 'k') { scroll = Math.max(0, scroll - 1); render() }
    else if (k === '\x1b[6~' || k === ' ') { scroll += page; render() }
    else if (k === '\x1b[5~') { scroll = Math.max(0, scroll - page); render() }
    else if (k === '\x1b[H' || k === 'g') { scroll = 0; render() }
    else if (k === '\x1b[F' || k === 'G') { scroll = Number.MAX_SAFE_INTEGER; render() }
  })
}
process.stdout.on('resize', render)

render()
await tick()
setInterval(() => { if (!status.running) tick() }, INTERVAL)
setInterval(render, 1000)
