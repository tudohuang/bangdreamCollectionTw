// package.json 與 package-lock.json 要一致。
//
// 為什麼值得一條測試：Vercel 用 `npm ci` 安裝，而 `npm ci` 遇到兩者不一致
// 會直接失敗 —— 但那個失敗發生在雲端的建置紀錄裡，本機一切正常、
// 測試全綠、git push 也成功。**網站只是安靜地停在上一個成功的版本。**
//
// 這件事真的發生過：我用腳本改了 package.json 的 dependencies
// （把 FontAwesome 移到 devDependencies）卻沒跑 npm install，
// 之後每一次部署都掛掉，而站上看起來只是「新功能怎麼沒出現」。
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
const root = lock.packages?.['']

describe('package.json 與 lockfile', () => {
  test('lockfile 有根套件的紀錄', () => {
    assert.ok(root, 'package-lock.json 的格式變了，這條測試要跟著改')
  })

  for (const field of ['dependencies', 'devDependencies']) {
    test(`${field} 兩邊列的套件一樣`, () => {
      const a = Object.keys(pkg[field] || {}).sort()
      const b = Object.keys(root[field] || {}).sort()
      assert.deepEqual(b, a,
        `package.json 改過但沒跑 npm install。\n` +
        `Vercel 用 npm ci，兩邊不一致會讓每一次部署都失敗，` +
        `而本機完全看不出來 —— 站上只會停在上一個成功的版本。\n` +
        `修法：npm install`)
    })

    test(`${field} 的版本範圍也一樣`, () => {
      for (const [name, range] of Object.entries(pkg[field] || {})) {
        assert.equal(root[field]?.[name], range, `${name} 的版本範圍對不起來`)
      }
    })
  }

  test('沒有套件同時出現在 dependencies 與 devDependencies', () => {
    const both = Object.keys(pkg.dependencies || {})
      .filter(k => k in (pkg.devDependencies || {}))
    assert.deepEqual(both, [])
  })

  test('每個 npm script 指到的檔案真的存在', async () => {
    // 這個也發生過：db:export 指向一個不存在的檔案，跑了才知道
    const { existsSync } = await import('node:fs')
    const missing = []
    for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
      for (const m of String(cmd).matchAll(/(?:^|\s)((?:scripts|db|tests)\/[\w./-]+\.(?:mjs|js))/g)) {
        if (!existsSync(m[1])) missing.push(`${name} → ${m[1]}`)
      }
    }
    assert.deepEqual(missing, [])
  })
})
