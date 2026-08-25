// 年度回顧卡：把一年的場次封面拼成一張可下載的牆。
//
// 排法用磚牆（每欄各自往下疊）而不是方格：收藏裡的封面多半是直式海報或橫式 banner，
// 硬切成正方形會把主視覺裁掉一大半，整面牆就變成一堆看不出是什麼的碎片。
import { yearSummary, yearTiles } from './review.js'
import { SANS, DISP, ensureFonts, roundRect, dotPattern, loadCover, drawCover, downloadCanvas } from './canvas.js'

const W = 1080
const PAD = 64
const GAP = 14
const PAPER = '#fffdfb'
const SUB = '#605882'
const FAINT = '#9c94be'

// 極端比例會排出一條細長的縫，夾在這個範圍內再裁
const MIN_RATIO = 0.62
const MAX_RATIO = 1.55

const columnsFor = (n) => (n <= 4 ? 2 : n <= 12 ? 3 : 4)

export async function downloadWrapped(events, year) {
  await ensureFonts()
  const tiles = yearTiles(events, year)
  const loaded = await Promise.all(tiles.map(t => loadCover(t.url)))
  // 載不到的（圖床不給 CORS、Instagram 那種會過期的簽名網址）直接不排進版，
  // 留一塊空白反而更難看
  const covers = loaded.filter(Boolean)
  downloadCanvas(renderWall(events, year, covers), `taiwan-bangdream-${year}-wall.png`)
}

// 貪心排版：每一張都放進目前最矮的那一欄
function layout(covers, cols, colW) {
  const heights = Array(cols).fill(0)
  const placed = covers.map(img => {
    const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, img.height / img.width))
    const h = Math.round(colW * ratio)
    const col = heights.indexOf(Math.min(...heights))
    const y = heights[col]
    heights[col] += h + GAP
    return { img, col, y, h }
  })
  return { placed, wallH: Math.max(0, Math.max(...heights, 0) - GAP) }
}

function renderWall(events, year, covers) {
  const s = yearSummary(events, year)
  const accent = s.topBands[0]?.color || '#8b5cf6'
  const cols = columnsFor(covers.length)
  const colW = Math.floor((W - PAD * 2 - GAP * (cols - 1)) / cols)
  const { placed, wallH } = layout(covers, cols, colW)

  const headH = 268
  const footH = 116
  const H = headH + wallH + footH

  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')

  // ---------- 紙 ----------
  x.fillStyle = PAPER
  x.fillRect(0, 0, W, H)
  x.fillStyle = x.createPattern(dotPattern('rgba(90,60,130,0.05)'), 'repeat')
  x.fillRect(0, 0, W, H)
  const wash = x.createLinearGradient(0, 0, 0, 300)
  wash.addColorStop(0, `${accent}22`)
  wash.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = wash
  x.fillRect(0, 0, W, 300)

  // ---------- 抬頭 ----------
  x.save()
  if ('letterSpacing' in x) x.letterSpacing = '6px'
  x.fillStyle = FAINT
  x.font = `700 19px ${DISP}`
  x.fillText('TAIWAN BANG DREAM! COLLECTION', PAD, 84)
  x.restore()

  x.fillStyle = accent
  x.font = `800 148px ${DISP}`
  x.fillText(String(year), PAD - 8, 206)

  // 右側對齊、與年份底線齊平的一行
  x.textAlign = 'right'
  x.fillStyle = SUB
  x.font = `600 26px ${SANS}`
  x.fillText(`${s.total} 場　·　${covers.length} 張封面`, W - PAD, 200)
  x.textAlign = 'left'

  // 細線 + 一行事實
  x.fillStyle = 'rgba(90,60,130,0.14)'
  x.fillRect(PAD, 232, W - PAD * 2, 1)

  const facts = [
    s.topBands[0] && `${s.topBands[0].name} ${s.topBands[0].n} 場`,
    s.topPeople[0] && `${s.topPeople[0].name} ${s.topPeople[0].n} 次`,
    s.topCity && `主場 ${s.topCity}`,
  ].filter(Boolean).join('　·　')
  x.fillStyle = SUB
  x.font = `500 22px ${SANS}`
  x.fillText(facts, PAD, 264)

  // ---------- 封面牆 ----------
  for (const { img, col, y, h } of placed) {
    const px = PAD + col * (colW + GAP)
    const py = headH + y

    x.save()
    roundRect(x, px, py, colW, h, 10)
    x.clip()
    drawCover(x, img, px, py, colW, h)
    x.restore()

    // 極細的內描邊，讓相鄰的照片分得開，又不會變成彩色格線
    x.save()
    roundRect(x, px + 0.5, py + 0.5, colW - 1, h - 1, 10)
    x.strokeStyle = 'rgba(60,40,90,0.10)'
    x.lineWidth = 1
    x.stroke()
    x.restore()
  }

  // ---------- 頁尾 ----------
  const footY = headH + wallH
  x.fillStyle = 'rgba(90,60,130,0.14)'
  x.fillRect(PAD, footY + 44, W - PAD * 2, 1)

  x.fillStyle = FAINT
  x.font = `500 20px ${SANS}`
  x.fillText(s.attendance > 0 ? `累計 ${s.attendance} 人次` : '', PAD, footY + 84)

  x.save()
  if ('letterSpacing' in x) x.letterSpacing = '4px'
  x.fillStyle = accent
  x.font = `700 19px ${DISP}`
  x.textAlign = 'right'
  x.fillText('BANGDREAM.TW', W - PAD, footY + 84)
  x.restore()

  return c
}
