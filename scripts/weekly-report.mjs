// 一鍵週報：讀最新資料 → 抓封面圖 → 產生 LaTeX → 用 WSL xelatex 編譯成 PDF
//   npm run report                       本週（會先抓 Google Sheet 最新資料）
//   npm run report -- --date 2026-08-08  指定某週（測試/補發用）
//   npm run report -- --no-fetch         跳過抓 Sheet，直接用本地 events.json
//
// 內容：本週活動、本週新宣布（git 快照比對）、歷年的這一週、即將登場（海報格）。
// 封面圖來自 Sheet 的「封面」欄（或照片第一張），下載快取在 reports/.cache/。
// 輸出：reports/weekly-YYYY-Www.pdf

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'
import { SHEET_CSV_URL } from '../src/config.js'
import { normalizeImageUrl } from '../src/utils/media.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA = join(ROOT, 'src', 'data', 'events.json')
const SITE = 'bangdream-collection-tw.vercel.app'

// ── 參數 ─────────────────────────────────────────────
const argv = process.argv.slice(2)
const flag = (n) => argv.includes(n)
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const NO_FETCH = flag('--no-fetch')
const ANCHOR = opt('--date') || new Date().toISOString().slice(0, 10)

// ── 日期工具（全部用字串 YYYY-MM-DD 比大小） ──────────
const p2 = (n) => String(n).padStart(2, '0')
const toStr = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
const toDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return toStr(d) }
const shiftYears = (s, n) => { const [y, m, d] = s.split('-').map(Number); return toStr(new Date(y + n, m - 1, d)) }
const WD = ['日', '一', '二', '三', '四', '五', '六']
const wd = (s) => WD[toDate(s).getDay()]
const md = (s) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`

function isoWeek(s) {
  const d = toDate(s)
  const t = new Date(d); t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7)) // 該週的週四
  const jan4 = new Date(t.getFullYear(), 0, 4)
  const week = 1 + Math.round(((t - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
  return { year: t.getFullYear(), week }
}

// 本週＝含 anchor 的週一〜週日
const dow = (toDate(ANCHOR).getDay() + 6) % 7
const W0 = addDays(ANCHOR, -dow)
const W1 = addDays(W0, 6)
const { year: wy, week: ww } = isoWeek(ANCHOR)
const JOB = `weekly-${wy}-W${p2(ww)}`

// ── 先抓最新 Sheet（失敗就用本地資料） ────────────────
if (!NO_FETCH && SHEET_CSV_URL) {
  const r = spawnSync(process.execPath, [join(__dirname, 'import-csv.mjs'), SHEET_CSV_URL], { stdio: 'inherit' })
  if (r.status !== 0) console.warn('⚠ Sheet 抓取失敗，改用本地 events.json')
}

const events = JSON.parse(readFileSync(DATA, 'utf8'))

// ── 各區塊 ───────────────────────────────────────────
const start = (e) => e.startDate || ''
const end = (e) => e.endDate || e.startDate || ''
const dated = events.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(start(e)))
const bySt = (a, b) => start(a).localeCompare(start(b))

// 本週：活動期間與本週有交集
const thisWeek = dated.filter((e) => start(e) <= W1 && end(e) >= W0).sort(bySt)

// 新宣布：跟「本週開始前最後一次 commit」的 events.json 比對編號
function newlyAnnounced() {
  const rev = spawnSync('git', ['rev-list', '-1', `--before=${W0} 00:00`, 'HEAD', '--', 'src/data/events.json'],
    { cwd: ROOT, encoding: 'utf8' }).stdout.trim()
  if (!rev) return []
  const old = spawnSync('git', ['show', `${rev}:src/data/events.json`], { cwd: ROOT, encoding: 'utf8' }).stdout
  let oldNums
  try { oldNums = new Set(JSON.parse(old).map((e) => e.number)) } catch { return [] }
  // 只算「宣布」：排除回填的歷史活動（本週開始前就結束的不算新宣布）
  return events.filter((e) => !oldNums.has(e.number) && (!start(e) || end(e) >= W0)).sort(bySt)
}
const announced = newlyAnnounced()
const announcedNums = new Set(announced.map((e) => e.number))

// 歷年的這一週：同一週視窗往前逐年掃
const history = []
for (let k = 1; k <= wy - 2018; k++) {
  const a = shiftYears(W0, -k), b = shiftYears(W1, -k)
  const hits = dated.filter((e) => start(e) <= b && end(e) >= a).sort(bySt)
  for (const e of hits) history.push({ yearsAgo: k, e })
}

// 即將登場：本週之後 60 天內；無確切日期但有年月的也收（標「日期未定」）
const upcoming = dated
  .filter((e) => start(e) > W1 && start(e) <= addDays(W1, 60))
  .sort(bySt)
const tbd = events
  .filter((e) => !/^\d{4}-\d{2}-\d{2}$/.test(start(e)) && e.year && e.month)
  .filter((e) => new Date(e.year, e.month, 0) >= toDate(W1))
  .sort((a, b) => a.year - b.year || a.month - b.month)

// ── 封面圖下載（快取在 reports/.cache/） ──────────────
const OUT = join(ROOT, 'reports')
const CACHE = join(OUT, '.cache')
mkdirSync(CACHE, { recursive: true })

const imgOf = new Map() // number → 'reports 相對路徑' 或 null

async function fetchImage(e) {
  const src = e.cover || (e.photos || [])[0]
  if (!src) return null
  const base = `evt-${p2(e.number).padStart(3, '0')}`
  const hit = readdirSync(CACHE).find((f) => f.startsWith(base + '.'))
  if (hit) return `.cache/${hit}`
  // 本機檔（public/photos/）→ 複製進快取，路徑統一
  if (!/^https?:\/\//i.test(src)) {
    const p = join(ROOT, 'public', 'photos', src)
    if (!existsSync(p)) return null
    const name = `${base}${extname(src).toLowerCase() || '.jpg'}`
    copyFileSync(p, join(CACHE, name))
    return `.cache/${name}`
  }
  try {
    const r = await fetch(normalizeImageUrl(src), {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) { console.warn(`  ⚠ 圖 #${e.number} HTTP ${r.status}`); return null }
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length < 2048) return null
    // 用魔術數字判格式（有些主機 content-type 亂給）；webp 等 xelatex 吃不下的放棄
    const ext = buf[0] === 0xff && buf[1] === 0xd8 ? 'jpg'
      : buf[0] === 0x89 && buf[1] === 0x50 ? 'png' : null
    if (!ext) { console.warn(`  ⚠ 圖 #${e.number} 非 jpg/png，跳過`); return null }
    writeFileSync(join(CACHE, `${base}.${ext}`), buf)
    return `.cache/${base}.${ext}`
  } catch (err) { console.warn(`  ⚠ 圖 #${e.number} ${err.name}: ${String(err.message).slice(0, 60)}`); return null }
}

const needImg = [...new Map(
  [...thisWeek, ...announced, ...history.map((h) => h.e), ...upcoming, ...tbd].map((e) => [e.number, e])
).values()]
await Promise.all(needImg.map(async (e) => imgOf.set(e.number, await fetchImage(e))))
const gotImgs = [...imgOf.values()].filter(Boolean).length

// ── LaTeX ────────────────────────────────────────────
const esc = (s) => String(s ?? '')
  .replace(/\\/g, '\\textbackslash{}')
  .replace(/([#$%&_{}])/g, '\\$1')
  .replace(/~/g, '\\textasciitilde{}')
  .replace(/\^/g, '\\textasciicircum{}')

const accent = (e) => (e.category === '本體' ? 'rose' : 'violet')
const catLabel = (e) => (e.category === '本體' ? '本體' : '個人')

function dateLine(e, { year = false } = {}) {
  const s = start(e), en = end(e)
  if (!s) return `${e.month} 月・日期未定`
  const y = year ? `${s.slice(0, 4)}.` : ''
  return s === en ? `${y}${md(s)}（${wd(s)}）` : `${y}${md(s)}（${wd(s)}）– ${md(en)}（${wd(en)}）`
}

const chip = (text, color, fg = 'white') =>
  `\\tcbox[on line,arc=2.4pt,boxsep=1.4pt,left=3.4pt,right=3.4pt,top=0.7pt,bottom=0.7pt,boxrule=0pt,colback=${color},colframe=${color}]{\\color{${fg}}\\footnotesize\\bfseries ${esc(text)}}`

// 大卡片：文字＋右側封面圖
function card(e, { isNew = false } = {}) {
  const c = accent(e)
  const img = imgOf.get(e.number)
  const chips = [isNew ? chip('NEW', 'sky') : '', chip(catLabel(e), c), chip(e.type || '活動', 'slate')].filter(Boolean).join('\\,')
  const meta = [`{\\color{${c}}\\bfseries ${dateLine(e)}}`]
  if (e.venue) meta.push(esc(e.venue) + (e.city && !e.venue.includes(e.city) ? `（${esc(e.city)}）` : ''))
  const who = []
  if (e.people?.length) who.push(`{\\bfseries 出演}：${e.people.map(esc).join('、')}`)
  if (e.relatedGroups?.length) who.push(`{\\bfseries 關聯}：${e.relatedGroups.map(esc).join('・')}`)
  const body = [
    `{\\bfseries\\large ${esc(e.title)}}\\hspace{6pt}${chips}\\\\[3pt]`,
    `{\\small\\color{sub} ${meta.join('\\ ·\\ ')}}`,
    who.length ? `\\\\[1.5pt]{\\small\\color{sub} ${who.join('\\ ·\\ ')}}` : '',
    e.notes ? `\\\\[1.5pt]{\\footnotesize\\color{sub!75!white} ※ ${esc(e.notes)}}` : '',
  ].filter(Boolean).join('\n')
  const inner = img
    ? `\\begin{minipage}[c]{\\dimexpr\\linewidth-3.45cm\\relax}\\raggedright ${body}\\end{minipage}\\hfill\\begin{minipage}[c]{3.15cm}\\coverfill{${img}}{3.15cm}{2.2cm}\\end{minipage}`
    : `\\raggedright ${body}`
  return `\\begin{tcolorbox}[eventcard,borderline west={2.6pt}{0pt}{${c}}]
${inner}
\\end{tcolorbox}`
}

// 迷你卡：歷年的這一週（小圖＋一句話）
function miniCard({ yearsAgo, e }) {
  const c = accent(e)
  const img = imgOf.get(e.number)
  const tail = [e.venue, e.people?.slice(0, 5).join('、')].filter(Boolean).map(esc).join('\\ ·\\ ')
  const body = `${chip(`${yearsAgo} 年前`, 'violet')}\\;{\\bfseries ${esc(e.title)}}\\\\[2pt]{\\footnotesize\\color{sub} {\\color{${c}}\\bfseries ${dateLine(e, { year: true })}}${tail ? `\\ ·\\ ${tail}` : ''}}`
  const inner = img
    ? `\\begin{minipage}[c]{\\dimexpr\\linewidth-2.5cm\\relax}\\raggedright ${body}\\end{minipage}\\hfill\\begin{minipage}[c]{2.25cm}\\coverfill{${img}}{2.25cm}{1.5cm}\\end{minipage}`
    : `\\raggedright ${body}`
  return `\\begin{tcolorbox}[minicard]\n${inner}\n\\end{tcolorbox}`
}

// 海報卡：即將登場（圖在上、字在下）
function posterCard(e) {
  const c = accent(e)
  const img = imgOf.get(e.number)
  const isNew = announcedNums.has(e.number)
  const visual = img
    ? `\\coverfill{${img}}{\\linewidth}{3.05cm}`
    : `\\begin{tcolorbox}[enhanced,frame hidden,arc=5pt,boxrule=0pt,height=3.05cm,valign=center,halign=center,interior style={left color=${c}!14!white,right color=${c}!30!white}]{\\color{${c}!60!white}\\cjkblack\\Large 邦}\\end{tcolorbox}`
  const ppl = e.people?.length ? e.people.slice(0, 3).join('、') + (e.people.length > 3 ? ' 等' : '') : ''
  const tail = [e.venue, ppl].filter(Boolean).map(esc).join('\\ ·\\ ')
  return `\\begin{tcolorbox}[postercard]
${visual}\\par\\vspace{4pt}
{\\color{${c}}\\bfseries ${dateLine(e)}}${isNew ? `\\hfill ${chip('NEW', 'sky')}` : ''}\\\\[2pt]
{\\bfseries\\small ${esc(e.title)}}
${tail ? `\\\\[2pt]{\\footnotesize\\color{sub} ${tail}}` : ''}
\\end{tcolorbox}`
}

const sect = (title, en, color) => `\\Needspace*{4cm}\\vspace{11pt}
\\noindent{\\color{${color}}\\rule[-2pt]{3.4pt}{14pt}}\\hspace{7pt}{\\cjkblack\\fontsize{15}{18}\\selectfont ${title}}\\hspace{8pt}{\\footnotesize\\color{sub}\\heros ${en}}\\\\[-7pt]
\\noindent{\\color{${color}!22!white}\\rule{\\linewidth}{0.8pt}}\\par\\vspace{2pt}`

const emptyLine = (t) => `\\begin{tcolorbox}[minicard]{\\small\\color{sub} ${t}}\\end{tcolorbox}`

const statBox = (n, label, color) =>
  `\\begin{tcolorbox}[statbox,colback=${color}!7!white]{\\color{${color}}\\heros\\bfseries\\fontsize{21}{21}\\selectfont ${n}}\\hspace{5pt}{\\footnotesize\\color{sub}${label}}\\end{tcolorbox}`

const tex = `\\documentclass[a4paper,10pt]{article}
\\usepackage[margin=1.35cm,top=1.15cm,bottom=1.35cm]{geometry}
\\usepackage{fontspec,xcolor,graphicx,calc,needspace}
\\usepackage[most]{tcolorbox}
\\usepackage{xeCJK}
\\setmainfont{TeX Gyre Heros}
\\newfontfamily\\heros{TeX Gyre Heros}[LetterSpace=6]
\\setCJKmainfont[BoldFont={Noto Sans CJK TC Bold}]{Noto Sans CJK TC}
\\setCJKsansfont[BoldFont={Noto Sans CJK TC Bold}]{Noto Sans CJK TC}
\\newCJKfontfamily\\cjkblack{Noto Sans CJK TC Black}
\\definecolor{rose}{HTML}{EC4899}
\\definecolor{violet}{HTML}{A855F7}
\\definecolor{sky}{HTML}{0EA5C9}
\\definecolor{ink}{HTML}{23262F}
\\definecolor{sub}{HTML}{5D6470}
\\definecolor{page}{HTML}{FBFAFE}
\\colorlet{slate}{ink!60}
\\pagecolor{page}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
% 依比例裁切填滿（cover-fill）＋圓角
\\newsavebox\\cfbox
\\newcommand{\\coverfill}[3]{%
  \\sbox\\cfbox{\\includegraphics[height=#3]{#1}}%
  \\ifdim\\wd\\cfbox<#2\\sbox\\cfbox{\\includegraphics[width=#2]{#1}}\\fi
  \\begin{tikzpicture}
    \\clip[rounded corners=5pt] (0,0) rectangle (#2,#3);
    \\node[anchor=center,inner sep=0pt] at ({0.5*#2},{0.5*#3}) {\\usebox\\cfbox};
  \\end{tikzpicture}}
\\tcbset{
  eventcard/.style={enhanced,frame hidden,colback=white,boxrule=0pt,arc=2.2mm,
    left=9pt,right=9pt,top=7pt,bottom=7pt,before skip=6pt,after skip=0pt,
    fuzzy shadow={0mm}{-0.5mm}{0mm}{0.12mm}{black!22}},
  minicard/.style={enhanced,frame hidden,colback=white,boxrule=0pt,arc=2mm,
    left=8pt,right=8pt,top=5.5pt,bottom=5.5pt,before skip=5pt,after skip=0pt,
    fuzzy shadow={0mm}{-0.45mm}{0mm}{0.1mm}{black!18}},
  postercard/.style={enhanced,frame hidden,colback=white,boxrule=0pt,arc=2.2mm,
    left=6pt,right=6pt,top=6pt,bottom=7pt,
    fuzzy shadow={0mm}{-0.5mm}{0mm}{0.12mm}{black!22}},
  statbox/.style={enhanced,frame hidden,boxrule=0pt,arc=2mm,
    left=9pt,right=7pt,top=6pt,bottom=6pt,valign=center},
}
\\color{ink}
\\begin{document}

%% ── 報頭 ──
\\begin{tcolorbox}[enhanced,frame hidden,arc=3.5mm,boxrule=0pt,left=16pt,right=16pt,top=13pt,bottom=12pt,
  interior style={left color=rose,right color=violet},
  underlay={\\begin{tcbclipinterior}
    \\fill[white,opacity=0.10] ([xshift=-1.1cm,yshift=-2.4cm]interior.north east) circle (2.7cm);
    \\fill[white,opacity=0.08] ([xshift=2.4cm,yshift=0.2cm]interior.south west) circle (1.7cm);
    \\fill[white,opacity=0.12] ([xshift=6.4cm,yshift=0.9cm]interior.south west) circle (0.5cm);
  \\end{tcbclipinterior}}]
  \\color{white}%
  \\begin{minipage}[c]{0.66\\linewidth}
    {\\cjkblack\\fontsize{27}{30}\\selectfont 邦邦來台週報}\\\\[4pt]
    {\\footnotesize\\heros\\bfseries TAIWAN BANG DREAM! WEEKLY}
  \\end{minipage}\\hfill
  \\begin{minipage}[c]{0.30\\linewidth}\\raggedleft
    {\\bfseries\\large ${wy} 年 第 ${ww} 週}\\\\[2pt]
    {\\small ${md(W0)}（${wd(W0)}）– ${md(W1)}（${wd(W1)}）}
  \\end{minipage}
\\end{tcolorbox}

\\vspace{7pt}
%% ── 本週速覽 ──
\\begin{tcbraster}[raster columns=4,raster column skip=7pt,raster equal height]
${statBox(thisWeek.length, '本週活動', 'rose')}
${statBox(announced.length, '本週新宣布', 'sky')}
${statBox(upcoming.length + tbd.length, '即將登場', 'violet')}
${statBox(dated.length + tbd.length, '歷年收錄', 'slate')}
\\end{tcbraster}

${sect('本週活動', 'THIS WEEK', 'rose')}
${thisWeek.length ? thisWeek.map((e) => card(e)).join('\n') : emptyLine('本週台灣沒有邦邦相關活動——充電週，準備迎接下一場。')}

${sect('本週新宣布', 'JUST ANNOUNCED', 'sky')}
${announced.length ? announced.map((e) => card(e, { isNew: true })).join('\n') : emptyLine('本週沒有新宣布的活動。')}

${sect('歷年的這一週', 'ON THIS WEEK', 'violet')}
${history.length ? history.map(miniCard).join('\n') : emptyLine('歷年的這一週都很安靜。')}

${sect('即將登場', 'UPCOMING', 'rose!55!violet')}
${(upcoming.length || tbd.length)
    ? `\\begin{tcbraster}[raster columns=3,raster column skip=7pt,raster row skip=7pt,raster equal height]\n${[...upcoming, ...tbd].map(posterCard).join('\n')}\n\\end{tcbraster}`
    : emptyLine('接下來 60 天暫無已公布的活動。')}

\\vfill
\\noindent{\\color{black!14}\\rule{\\linewidth}{0.5pt}}\\\\[3.5pt]
{\\footnotesize\\color{sub} 邦邦來台圖鑑 · 收錄 ${dated.length + tbd.length} 場（2018–${wy}）· 產生於 ${ANCHOR}\\hfill\\heros ${SITE}}
\\end{document}
`

// ── 產出並編譯 ───────────────────────────────────────
writeFileSync(join(OUT, `${JOB}.tex`), tex, 'utf8')

const wslOut = spawnSync('wsl.exe', ['-e', 'bash', '-lc', 'wslpath "$(cat)"'], { input: OUT, encoding: 'utf8' }).stdout.trim()
const r = spawnSync('wsl.exe', ['-e', 'bash', '-lc',
  `cd "${wslOut}" && xelatex -interaction=nonstopmode -halt-on-error ${JOB}.tex`],
  { encoding: 'utf8' })
if (r.status !== 0 || !existsSync(join(OUT, `${JOB}.pdf`))) {
  console.error(r.stdout?.split('\n').filter((l) => l.startsWith('!') || l.includes('Error')).join('\n') || r.stderr)
  console.error(`✗ 編譯失敗，.tex 與 .log 留在 reports/ 供檢查`)
  process.exit(1)
}
for (const ext of ['aux', 'log', 'out']) rmSync(join(OUT, `${JOB}.${ext}`), { force: true })
console.log(`✓ 週報完成 → reports/${JOB}.pdf`)
console.log(`  本週 ${thisWeek.length} 場 · 新宣布 ${announced.length} 場 · 歷年同週 ${history.length} 場 · 即將 ${upcoming.length + tbd.length} 場 · 圖 ${gotImgs}/${needImg.length}`)
