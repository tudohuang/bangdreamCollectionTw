// npm run dead —— 找出「export 了但沒有任何人 import」的東西。
//
// 為什麼要一支腳本：這個專案已經有 61 個元件、44 支 util，
// 靠印象判斷「這個還有沒有人用」一定會錯。我上次就用眼睛判斷過一次，錯了。
//
// 做法是看 import 語句，不是全文字串比對 —— 全文比對會把
// 「這個名字剛好出現在註解裡」也算成有用到，結果什麼都不是死碼。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// functions/ 與 api/ 要掃（它們會 import src/ 的東西），但不從裡面挑死碼 ——
// 那裡的 onRequestGet 是平台呼叫的進入點，本來就沒有人 import。
const ROOTS = ['src', 'scripts', 'tests', 'db', 'functions', 'api']
const NO_REPORT = /^(functions|api)\//
const files = []
for (const r of ROOTS) {
  try { statSync(r) } catch { continue }
  ;(function walk(d) {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, f.name)
      if (f.isDirectory()) { if (f.name !== 'node_modules') walk(p) }
      else if (/\.(jsx?|mjs)$/.test(f.name)) files.push(p)
    }
  })(r)
}

const src = files.map(f => ({ f: relative('.', f).replace(/\\/g, '/'), s: readFileSync(f, 'utf8') }))

// 每個檔案 import 進來的名字
const imported = new Set()
for (const { s } of src) {
  // import { a, b as c } from '...'
  // 兩種寫法都要吃：import { a } from …  以及  import X, { a } from …
  for (const m of s.matchAll(/import\s+(?:[A-Za-z0-9_$]+\s*,\s*)?\{([^}]*)\}\s*from/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim()
      if (name) imported.add(name)
    }
  }
  // import X from '...'  / import X, { … } from '...'
  for (const m of s.matchAll(/import\s+([A-Za-z0-9_$]+)\s*(?:,|from)/g)) imported.add(m[1])
  // 動態 import 之後解構：const { a } = await import(...)
  for (const m of s.matchAll(/(?:const|let)\s*\{([^}]*)\}\s*=\s*await\s+import/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(':')[0].trim()
      if (name) imported.add(name)
    }
  }
}

const dead = []
for (const { f, s } of src) {
  // 腳本的進入點沒有人 import，它們的 export 是給人手動用的
  if (NO_REPORT.test(f)) continue
  const isEntry = /^scripts\//.test(f) || /^db\//.test(f)

  for (const m of s.matchAll(/^export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z0-9_$]+)/gm)) {
    const name = m[1]
    if (imported.has(name)) continue
    // 同一個檔案裡自己用（例如只 export 給測試看的）也不算死
    const selfUses = (s.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length
    if (selfUses > 1) continue
    dead.push({ f, name, entry: isEntry })
  }
  for (const m of s.matchAll(/^export\s+default\s+function\s+([A-Za-z0-9_$]+)/gm)) {
    // default export 的名字不重要，看的是有沒有人 import 這個檔案
    const modName = f.replace(/^.*\//, '').replace(/\.[^.]+$/, '')
    // from '…/X.jsx' 與 lazy(() => import('…/X.jsx')) 都算有人用
    const re = new RegExp(`(?:from|import\\()\\s*['"][^'"]*${modName}(\\.jsx?)?['"]`)
    const usedAsModule = src.some(o => o.f !== f && re.test(o.s))
    if (!usedAsModule && !isEntry) dead.push({ f, name: m[1] + '（整個檔案沒人 import）', entry: false })
  }
}

const real = dead.filter(d => !d.entry)
const entry = dead.filter(d => d.entry)

console.log(`掃了 ${src.length} 個檔\n`)
if (real.length) {
  console.log(`沒有人 import（${real.length}）：`)
  for (const d of real) console.log(`  ${d.f.padEnd(40)} ${d.name}`)
} else {
  console.log('沒有找到死碼。')
}
if (entry.length) {
  console.log(`\n（另有 ${entry.length} 個在 scripts/ 與 db/，那些是進入點，export 是給人手動用的）`)
}
