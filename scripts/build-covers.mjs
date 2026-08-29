// 把外連的封面接管成自己的檔案：npm run covers
//
// 為什麼要做：封面原本直接連別人的圖床，有兩個問題 ——
//   1. 對方擋外連或刪圖，站上就破一個洞（目前 58 張已經死了 6 張）
//   2. 原圖平均 537 KB、最大 4.5 MB，手機滑完整份圖鑑要吃掉 27 MB
//
// 這支腳本把每張封面抓下來、縮成清單用與詳情用兩種尺寸、
// 輸出 AVIF / WebP / JPEG 三種格式，存進 public/covers/，
// 並把尺寸寫進 src/data/covers.json（畫面靠它預留位置，避免版面跳動）。
//
// 檔名綁「永久鍵」而不是編號 —— 編號可以重排，檔案不能跟著錯位。
//
// 原始圖快取在 .cache/covers/，重跑不會重抓。加 --force 可以強制重抓。
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'covers')
const CACHE = join(ROOT, '.cache', 'covers')
const MANIFEST = join(ROOT, 'src', 'data', 'covers.json')
const FORCE = process.argv.includes('--force')

// 清單縮圖與詳情頁大圖。清單那張的目標是 40 KB 以內。
const SIZES = [
  { key: 'sm', width: 420, quality: { avif: 46, webp: 62, jpeg: 68 } },
  { key: 'lg', width: 960, quality: { avif: 52, webp: 70, jpeg: 76 } },
]
const FORMATS = ['avif', 'webp', 'jpeg']
const EXT = { avif: 'avif', webp: 'webp', jpeg: 'jpg' }

mkdirSync(OUT, { recursive: true })
mkdirSync(CACHE, { recursive: true })

const events = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'events.json'), 'utf8'))
const keyOf = (e) => e.stableId ?? e.number

// 有些圖床擋沒有 UA 的請求，帶一個正常的
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; bangdream-tw-cover-fetch/1.0)',
  'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
}

async function download(url, cacheFile) {
  if (!FORCE && existsSync(cacheFile)) return readFileSync(cacheFile)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25000)
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: ctrl.signal })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 512) throw new Error('回應太小，可能不是圖片')
    writeFileSync(cacheFile, buf)
    return buf
  } finally {
    clearTimeout(timer)
  }
}

async function render(buf, id) {
  const meta = await sharp(buf).metadata()
  if (!meta.width || !meta.height) throw new Error('讀不出尺寸')

  const files = {}
  for (const size of SIZES) {
    // 本來就比目標小的不要放大
    const width = Math.min(size.width, meta.width)
    for (const fmt of FORMATS) {
      const name = `${id}-${size.key}.${EXT[fmt]}`
      const pipeline = sharp(buf).resize({ width, withoutEnlargement: true })
      const out = fmt === 'avif' ? pipeline.avif({ quality: size.quality.avif, effort: 4 })
        : fmt === 'webp' ? pipeline.webp({ quality: size.quality.webp })
          : pipeline.jpeg({ quality: size.quality.jpeg, mozjpeg: true })
      const data = await out.toBuffer()
      writeFileSync(join(OUT, name), data)
      files[`${size.key}.${fmt}`] = data.length
    }
  }
  return { width: meta.width, height: meta.height, files }
}

const manifest = {}
// 手動存的封面。
//
// 為什麼需要：抓不到的那幾張裡，大部分是 Instagram／Facebook 的網址。
// 那種網址帶簽章與到期時間（oh= / oe= 參數），本來就會失效 ——
// 換一個新網址只會再死一次。唯一穩的做法是把圖存下來。
//
// 用法：把圖片存成 covers-manual/<ID>.jpg（ID 是三位數的永久鍵，不是編號）。
// 有手動檔就優先用它，連原網址都不會去抓。
const MANUAL = join(ROOT, 'covers-manual')
const manualFile = (id) => {
  if (!existsSync(MANUAL)) return null
  const hit = readdirSync(MANUAL).find(f => f.replace(/\.[^.]+$/, '') === id)
  return hit ? join(MANUAL, hit) : null
}

const failed = []
let bytesSm = 0, bytesLg = 0, done = 0, manualUsed = 0

// 有網址的，或者沒網址但有手動檔的（例如原本就完全沒有封面那幾筆）
const withCover = events.filter(e =>
  /^https?:/.test(e.cover || '') || manualFile(String(keyOf(e)).padStart(3, '0')))
console.log(`封面 ${withCover.length} 張，開始處理…\n`)

for (const e of withCover) {
  const id = String(keyOf(e)).padStart(3, '0')
  const cacheFile = join(CACHE, `${id}.bin`)
  try {
    const manual = manualFile(id)
    let buf
    if (manual) { buf = readFileSync(manual); manualUsed++ }
    else buf = await download(e.cover, cacheFile)
    const info = await render(buf, id)
    manifest[id] = {
      w: info.width,
      h: info.height,
      ratio: Math.round((info.width / info.height) * 1000) / 1000,
      source: manual ? `covers-manual/${id}` : e.cover,
    }
    bytesSm += info.files['sm.avif']
    bytesLg += info.files['lg.avif']
    done++
    process.stdout.write(`  ✓ #${id} ${String(Math.round(info.files['sm.avif'] / 1024)).padStart(3)} KB  ${e.title.slice(0, 34)}\n`)
  } catch (err) {
    failed.push({ id, number: e.number, title: e.title, url: e.cover, why: err.message })
    process.stdout.write(`  ✗ #${id} ${err.message}  ${e.title.slice(0, 30)}\n`)
  }
}

// 一張都沒成功就不要覆蓋 manifest。
//
// 這條是踩到才加的：腳本被改壞（一個未定義的變數）之後，每一筆都進 catch，
// manifest 是空的，然後它就把 51 筆的檔案覆蓋成 {}，順便把 public/covers 底下
// 三百多個檔案清空 —— 而畫面上完全看不出來，只是所有封面同時消失。
//
// 網路整個斷掉也會是同一個情況。既有的產物比這次的結果值錢。
if (done === 0 && withCover.length > 0) {
  console.error(`\n✗ 一張都沒有成功（共 ${withCover.length} 張）。`)
  console.error('  不覆蓋 src/data/covers.json —— 既有的產物比這次的結果值錢。')
  console.error('  如果是真的想清空，手動刪掉那個檔再跑一次。')
  process.exit(1)
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')

const kb = (n) => (n / 1024).toFixed(0)
console.log(`\n成功 ${done} · 失敗 ${failed.length}` +
  (manualUsed ? ` · 其中 ${manualUsed} 張用手動存的檔` : ''))
console.log(`清單縮圖（AVIF）合計 ${kb(bytesSm)} KB，平均 ${kb(bytesSm / done)} KB`)
console.log(`詳情大圖（AVIF）合計 ${kb(bytesLg)} KB，平均 ${kb(bytesLg / done)} KB`)

if (failed.length) {
  console.log(`\n這些抓不到，需要在 Sheet 換掉封面網址：`)
  for (const f of failed) console.log(`  #${f.number} ${f.title}\n      ${f.why} · ${f.url}`)

  // Instagram 與 Facebook 的圖片網址帶簽章與到期時間，換新網址只會再死一次
  const expiring = failed.filter(f => /cdninstagram|fbcdn\.net/.test(f.url || ''))
  if (expiring.length) {
    console.log(`\n  ⚠ 其中 ${expiring.length} 張是 Instagram／Facebook 的網址 —— 那種網址本來就會過期。`)
    console.log('    換新網址沒有用。把圖存成下面的檔名再跑一次，就永遠都有了：')
    for (const f of expiring) {
      console.log(`      covers-manual/${f.id}.jpg   ← #${f.number} ${f.title.slice(0, 30)}`)
    }
  }
  writeFileSync(join(ROOT, 'docs', 'covers-failed.json'), JSON.stringify(failed, null, 2) + '\n')
  console.log(`\n（清單已寫進 docs/covers-failed.json）`)
}

// 清掉沒人用的舊檔，避免 public/ 一直長大
const live = new Set(Object.keys(manifest).flatMap(id =>
  SIZES.flatMap(s => FORMATS.map(f => `${id}-${s.key}.${EXT[f]}`))))
let removed = 0
for (const f of readdirSync(OUT)) {
  if (!live.has(f)) { writeFileSync(join(OUT, f), ''); removed++ }
}
if (removed) console.log(`（另有 ${removed} 個舊檔已清空，可手動刪除）`)
