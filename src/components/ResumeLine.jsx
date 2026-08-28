import { useEffect, useState } from 'react'
import { getLastSeen, clearLastSeen, agoLabel } from '../utils/lastSeen.js'
import { primaryMeta } from '../utils/bands.js'
import Icon from './Icon.jsx'

// 「接著看」。回訪的人不用從頭滾 59 張卡。
//
// 刻意只有一行、而且可以關掉。這種東西一旦做成卡片就會變成
// 首頁上永遠佔一塊的雜訊 —— 它一年只對某個人有用幾次。
//
// localStorage 只有瀏覽器有，所以要等 mount 之後才讀，
// 直接在 render 裡讀會讓伺服器端渲染跟客戶端對不起來。
export default function ResumeLine({ events, onSelect }) {
  const [seen, setSeen] = useState(null)

  useEffect(() => { setSeen(getLastSeen(events)) }, [events])

  if (!seen) return null
  const m = primaryMeta(seen.event)

  return (
    <p className="mt-4 flex items-center gap-2 text-[14px] text-dream-faint">
      <Icon n="clock" className="text-[10px] shrink-0" />
      <span className="shrink-0">{agoLabel(seen.days)}看到</span>
      <button onClick={() => onSelect(seen.event.id)}
        className="min-w-0 truncate text-left hover:text-dream-ink transition-colors">
        <span className="font-round font-bold mr-1.5" style={{ color: m.color }}>
          #{String(seen.event.number).padStart(3, '0')}
        </span>
        {seen.event.title}
      </button>
      <button onClick={() => { clearLastSeen(); setSeen(null) }}
        aria-label="不用再提醒" title="不用再提醒"
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
        <Icon n="xmark" className="text-[10px]" />
      </button>
    </p>
  )
}
