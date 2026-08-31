import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { shareOrCopy, shareToast, canShareLink } from '../src/utils/share.js'

// node 22 的 globalThis.navigator 只有 getter，直接指派會爆，要用 defineProperty。
// 每個測完都要拆掉，不然會污染下一個。
const fake = (obj) =>
  Object.defineProperty(globalThis, 'navigator', { value: obj, configurable: true, writable: true })
const stub = (impl) => fake({ share: impl, clipboard: { writeText: async () => {} } })
afterEach(() => { delete globalThis.navigator })

describe('分享', () => {
  test('沒有系統分享單就退回複製', async () => {
    fake({ clipboard: { writeText: async () => {} } })
    assert.equal(canShareLink(), false)
    assert.equal(await shareOrCopy({ url: 'https://x.test/e/1' }), 'copied')
  })

  test('有系統分享單就用它，不要多複製一次', async () => {
    const seen = []
    stub(async (d) => { seen.push(d) })
    assert.equal(canShareLink(), true)
    assert.equal(await shareOrCopy({ title: 'T', text: 'S', url: 'https://x.test/e/1' }), 'shared')
    assert.deepEqual(seen, [{ title: 'T', text: 'S', url: 'https://x.test/e/1' }])
  })

  test('使用者按取消就當作沒發生，不要偷偷改成複製', async () => {
    // 偷偷複製會讓他以為分享成功了 —— 貼出去才發現什麼都沒有
    stub(async () => { const e = new Error('cancel'); e.name = 'AbortError'; throw e })
    assert.equal(await shareOrCopy({ url: 'https://x.test/e/1' }), 'cancel')
  })

  test('分享單自己壞掉才退回複製', async () => {
    stub(async () => { throw new Error('NotAllowedError') })
    assert.equal(await shareOrCopy({ url: 'https://x.test/e/1' }), 'copied')
  })

  test('複製也失敗要講', async () => {
    // copyText 在剪貼簿失敗時會退回舊的 textarea + execCommand 做法，
    // 那條路要有 document。node 沒有，所以擺一個最小的假 document。
    fake({ clipboard: { writeText: async () => { throw new Error('no') } } })
    globalThis.document = {
      createElement: () => ({ style: {}, select() {} }),
      body: { appendChild() {}, removeChild() {} },
      execCommand: () => { throw new Error('no') },
    }
    try {
      assert.equal(await shareOrCopy({ url: 'https://x.test/e/1' }), 'fail')
    } finally { delete globalThis.document }
  })
})

describe('分享完的提示', () => {
  test('系統分享單自己就是回饋，不用再彈一個', () => {
    assert.equal(shareToast('shared'), null)
    assert.equal(shareToast('cancel'), null)
  })

  test('複製沒有回饋，所以要講', () => {
    assert.equal(shareToast('copied'), '已複製連結')
    assert.equal(shareToast('fail'), '複製失敗')
  })
})
