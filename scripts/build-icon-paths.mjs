// npm run icons:data —— 從 FontAwesome 套件裡把「這站真的用到的」圖示
// 抽出來，寫成一支純資料檔（src/components/iconPaths.js）。
//
// 為什麼要這樣做：@fortawesome 打包後是 96 KB（gzip 30 KB），
// 但其中圖示路徑本身只有 17 KB —— 剩下的全是 runtime。
// 這站只需要「把一段 path 畫出來」，用不到那層 runtime。
//
// 抽完之後 Icon.jsx 直接 render <svg><path>，三個 @fortawesome 依賴可以整包移除。
// 要新增圖示：在 WANTED 加一行，重跑這支。原始套件留在 devDependencies 就好。
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as solid from '@fortawesome/free-solid-svg-icons'
import * as regular from '@fortawesome/free-regular-svg-icons'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// 站上的名字 → FontAwesome 的匯出名。順序就是寫進檔案的順序。
const WANTED = [
  ['music', 'faMusic'], ['star', 'faStar'], ['fire', 'faFire'], ['palette', 'faPalette'],
  ['crown', 'faCrown'], ['rainbow', 'faRainbow'], ['bolt', 'faBolt'], ['guitar', 'faGuitar'],
  ['masks-theater', 'faMasksTheater'], ['wand-magic-sparkles', 'faWandMagicSparkles'],
  ['compact-disc', 'faCompactDisc'], ['microphone', 'faMicrophone'],
  ['magnifying-glass', 'faMagnifyingGlass'], ['users', 'faUsers'], ['user-group', 'faUserGroup'],
  ['user', 'faUser'], ['location-dot', 'faLocationDot'], ['note-sticky', 'faNoteSticky'],
  ['link', 'faLink'], ['xmark', 'faXmark'], ['chevron-down', 'faChevronDown'],
  ['chevron-left', 'faChevronLeft'], ['chevron-right', 'faChevronRight'],
  ['arrow-rotate-left', 'faArrowRotateLeft'], ['arrow-up', 'faArrowUp'],
  ['arrow-right', 'faArrowRight'], ['grid', 'faTableCellsLarge'], ['images', 'faImages'],
  ['bars-staggered', 'faBarsStaggered'], ['layer-group', 'faLayerGroup'],
  ['calendar-days', 'faCalendarDays'], ['table', 'faTable'], ['heart', 'faHeart'],
  ['circle-check', 'faCircleCheck'], ['bullseye', 'faBullseye'], ['moon', 'faMoon'],
  ['sun', 'faSun'], ['clock', 'faClock'], ['house', 'faHouse'],
  ['chart-simple', 'faChartSimple'], ['sliders', 'faSliders'], ['tag', 'faTag'],
  ['triangle-exclamation', 'faTriangleExclamation'],
]
// 線框版（regular）在另一個套件裡
const WANTED_REGULAR = [['calendar', 'faCalendar'], ['clipboard', 'faClipboard']]

const rows = []
const missing = []
for (const [name, exp, pack] of [
  ...WANTED.map(([n, e]) => [n, e, solid]),
  ...WANTED_REGULAR.map(([n, e]) => [n, e, regular]),
]) {
  const def = pack[exp]
  if (!def) { missing.push(exp); continue }
  const [w, h, , , path] = def.icon
  // 少數圖示的 path 是陣列（多段），合起來當一條用
  const d = Array.isArray(path) ? path.join(' ') : path
  rows.push(`  '${name}': [${w}, ${h}, '${d}'],`)
}

if (missing.length) {
  console.error(`✗ 這些圖示在套件裡找不到：${missing.join(', ')}`)
  process.exit(1)
}

const out = `// 由 scripts/build-icons.mjs 產生，不要手改。
//
// 只收這個站真的用到的 ${rows.length} 個圖示。格式是 [寬, 高, path]，
// 寬高是原始 viewBox（FontAwesome 每個圖示的 viewBox 不一樣，寫死會變形）。
//
// 要加圖示：改 scripts/build-icons.mjs 的 WANTED，再跑 npm run icons:data。
export const ICONS = {
${rows.join('\n')}
}
`
writeFileSync(join(ROOT, 'src', 'components', 'iconPaths.js'), out, 'utf8')
console.log(`✓ ${rows.length} 個圖示 → src/components/iconPaths.js（${(out.length / 1024).toFixed(1)} KB）`)
