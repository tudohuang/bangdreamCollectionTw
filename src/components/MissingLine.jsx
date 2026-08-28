import { useState } from 'react'
import { REPORT_URL } from '../config.js'
import { setlistOf, pricesOf, goodsOf, keyVisualOf, salesOf } from '../utils/archive.js'
import Icon from './Icon.jsx'

// 「這一格還缺什麼」。
//
// 設定集不會因為某一頁資料不全就把那一頁抽掉 —— 它就是留著空欄，
// 空欄本身也是資訊。這裡照那個做法：一行，講清楚這場還缺哪幾樣。
//
// 刻意只有一行。之前把每個缺的欄位排成一列一列，讀起來是待辦清單不是圖鑑，
// 而且 59 場每一場都長一樣，整站都在喊「我沒資料」。
//
// 按下去不是打開表單，是把一段填好格式的文字複製起來 ——
// 沒有後端、不用登入，貼到哪裡都能用。
export default function MissingLine({ event, color }) {
  const [copied, setCopied] = useState(false)

  // 還沒開始的活動不算「缺」—— 曲目跟周邊本來就還不存在
  const past = event.startDate && event.startDate <= new Date().toISOString().slice(0, 10)
  if (!past) return null

  const missing = [
    !setlistOf(event).length && '曲目',
    !pricesOf(event) && '票價',
    !goodsOf(event).length && '周邊',
    !keyVisualOf(event) && '主視覺',
    !salesOf(event) && '售票狀況',
    !(event.sources || []).length && '來源',
  ].filter(Boolean)
  if (!missing.length) return null

  // 具體的問題比空白欄位好填。「寫點心得」沒有人寫得出來，
  // 「最後一首是什麼」有人記得。
  const asks = {
    曲目: '照順序寫，一行一首。想不齊也沒關係，記得幾首寫幾首。安可另起一行寫「安可」。',
    票價: '你買的是哪一區、多少錢？',
    周邊: '場販有賣什麼？台版限定的特別想知道。',
    主視覺: '主視覺是誰畫的？',
    售票狀況: '完售了嗎？開賣多久賣完的？',
    來源: '你是在哪裡看到這場的公告？貼網址就好。',
  }

  const block = [
    `#${String(event.number).padStart(3, '0')} ${event.title}`,
    event.startDate ? `日期：${event.startDate}` : '',
    '',
    ...missing.flatMap(k => [`【${k}】${asks[k]}`, '', '']),
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block)
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
      if (REPORT_URL) window.open(REPORT_URL, '_blank', 'noopener')
    } catch {
      // 剪貼簿被擋（http 或舊瀏覽器）時至少把回報頁打開
      if (REPORT_URL) window.open(REPORT_URL, '_blank', 'noopener')
    }
  }

  return (
    <p className="mt-6 pt-4 border-t border-dream-line dark:border-white/10 text-[14px] text-dream-faint flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>這一格還缺 {missing.join('、')}。</span>
      <button onClick={copy}
        className="inline-flex items-center gap-1.5 font-medium hover:underline"
        style={{ color }}>
        {copied
          ? <><Icon n="circle-check" className="text-[10px]" />已複製，貼上就好</>
          : <>我知道其中一項<Icon n="arrow-right" className="text-[9px]" /></>}
      </button>
    </p>
  )
}
