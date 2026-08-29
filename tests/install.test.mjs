// 「加到主畫面」的時機。
//
// 這站不上架商店，所以這一步就是全部：一個人會不會把它當 App 用，
// 完全取決於有沒有加到主畫面。而這段邏輯壞掉的方式很安靜 ——
// 邀請卡不出現，或者出現得太早被按掉，都不會有任何錯誤訊息。
import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

let store
beforeEach(() => {
  store = {}
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
  }
})

const fresh = () => import(`../src/utils/install.js?${Math.random()}`)

describe('造訪次數', () => {
  test('同一天重整很多次只算一次 —— 那不叫回訪', async () => {
    const { countVisit, visitCount } = await fresh()
    countVisit('2026-01-01')
    countVisit('2026-01-01')
    countVisit('2026-01-01')
    assert.equal(visitCount(), 1)
  })

  test('不同天各算一次', async () => {
    const { countVisit, visitCount } = await fresh()
    countVisit('2026-01-01')
    countVisit('2026-01-02')
    countVisit('2026-01-03')
    assert.equal(visitCount(), 3)
  })

  test('沒有紀錄時是 0，不是 NaN', async () => {
    const { visitCount } = await fresh()
    assert.equal(visitCount(), 0)
  })

  test('存了壞掉的東西也不能爆', async () => {
    const { countVisit, visitCount } = await fresh()
    store['bdtw-visits'] = '{壞掉的'
    assert.doesNotThrow(() => countVisit('2026-01-01'))
    assert.equal(typeof visitCount(), 'number')
  })
})

describe('要不要邀請', () => {
  test('第一次來不邀請 —— 那時候他還在決定要不要看下去', async () => {
    const { countVisit, shouldInvite } = await fresh()
    countVisit('2026-01-01')
    assert.equal(shouldInvite(), false)
  })

  test('回訪三次才邀請', async () => {
    const { countVisit, shouldInvite } = await fresh()
    countVisit('2026-01-01'); assert.equal(shouldInvite(), false)
    countVisit('2026-01-02'); assert.equal(shouldInvite(), false)
    countVisit('2026-01-03'); assert.equal(shouldInvite(), true)
  })

  test('標過「我去過」就直接邀請，不用等回訪', async () => {
    // 標記是最強的訊號：他在把這站當成自己的紀錄
    const { countVisit, shouldInvite } = await fresh()
    countVisit('2026-01-01')
    assert.equal(shouldInvite({ attendedCount: 1 }), true)
  })
})

describe('按掉之後', () => {
  test('是收起來 30 天，不是永久', async () => {
    const { countVisit, shouldInvite, snooze } = await fresh()
    for (const d of ['2026-01-01', '2026-01-02', '2026-01-03']) countVisit(d)
    assert.equal(shouldInvite(), true)

    const now = Date.UTC(2026, 0, 3)
    snooze(now)
    assert.equal(shouldInvite({ now: now + 29 * 86400000 }), false, '29 天後還在收起來')
    assert.equal(shouldInvite({ now: now + 31 * 86400000 }), true, '31 天後要再問一次')
  })

  test('收起來期間，標了「我去過」也不會硬跳出來', async () => {
    // 剛按掉就因為他標了一場又跳出來，那比一開始就跳更煩
    const { countVisit, shouldInvite, snooze } = await fresh()
    countVisit('2026-01-01')
    const now = Date.UTC(2026, 0, 1)
    snooze(now)
    assert.equal(shouldInvite({ attendedCount: 5, now: now + 86400000 }), false)
  })

  test('無痕模式（localStorage 會丟例外）不能讓整站掛掉', async () => {
    const { countVisit, shouldInvite, snooze } = await fresh()
    globalThis.localStorage = {
      getItem() { throw new Error('denied') },
      setItem() { throw new Error('denied') },
      removeItem() { throw new Error('denied') },
    }
    assert.doesNotThrow(() => countVisit('2026-01-01'))
    assert.doesNotThrow(() => snooze())
    assert.doesNotThrow(() => shouldInvite())
  })
})

describe('上次來之後新增了什麼', () => {
  const ev = (number) => ({ id: `evt-${number}`, number, title: `場次 ${number}`, startDate: '2026-01-01' })
  const fresh2 = () => import(`../src/utils/lastSeen.js?${Math.random()}`)

  test('第一次來看不到 —— 沒有基準時 59 場全是新的，講了是廢話', async () => {
    const { newSinceLastVisit } = await fresh2()
    assert.deepEqual(newSinceLastVisit([ev(1), ev(2), ev(3)]), [])
  })

  test('記下基準之後，只算比它大的編號', async () => {
    const { markSeenUpTo, newSinceLastVisit } = await fresh2()
    markSeenUpTo([ev(1), ev(2), ev(3)])
    const after = newSinceLastVisit([ev(1), ev(2), ev(3), ev(4), ev(5)])
    assert.deepEqual(after.map(e => e.number), [5, 4], '新的排前面')
  })

  test('沒有新增就是空的', async () => {
    const { markSeenUpTo, newSinceLastVisit } = await fresh2()
    markSeenUpTo([ev(1), ev(2), ev(3)])
    assert.deepEqual(newSinceLastVisit([ev(1), ev(2), ev(3)]), [])
  })

  test('編號中間被抽掉不會讓基準倒退', async () => {
    // 刪掉一筆之後最大編號可能變小，但那不代表使用者「沒看過」原本那些
    const { markSeenUpTo, seenUpTo } = await fresh2()
    markSeenUpTo([ev(1), ev(5)])
    assert.equal(seenUpTo(), 5)
    markSeenUpTo([])              // 空資料（抓 Sheet 失敗）不能把基準洗掉
    assert.equal(seenUpTo(), 5)
  })

  test('無痕模式不能爆', async () => {
    const { markSeenUpTo, newSinceLastVisit } = await fresh2()
    globalThis.localStorage = {
      getItem() { throw new Error('denied') },
      setItem() { throw new Error('denied') },
      removeItem() { throw new Error('denied') },
    }
    assert.doesNotThrow(() => markSeenUpTo([ev(1)]))
    assert.doesNotThrow(() => newSinceLastVisit([ev(1)]))
  })
})

describe('基準只增不減', () => {
  const ev = (number) => ({ id: `evt-${number}`, number, title: `場次 ${number}` })
  const fresh3 = () => import(`../src/utils/lastSeen.js?${Math.random()}`)

  test('抓 Sheet 失敗退回較少的內建資料，不會把基準寫小', async () => {
    const { markSeenUpTo, seenUpTo, newSinceLastVisit } = await fresh3()
    markSeenUpTo([ev(1), ev(60)])          // 從 Sheet 看到 60
    markSeenUpTo([ev(1), ev(59)])          // 下次失敗，退回內建的 59
    assert.equal(seenUpTo(), 60, '基準不能退回 59')
    assert.deepEqual(newSinceLastVisit([ev(59), ev(60)]), [], '60 不能又被當成新的')
  })
})
