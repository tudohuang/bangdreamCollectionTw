import { useMemo, useState } from 'react'
import { firsts } from '../utils/chronology.js'
import { primaryMeta } from '../utils/bands.js'
import Icon from './Icon.jsx'

// 初來台與最近一次。按初來台排序，所以整張表讀起來是一條隊伍：
// 2018 年那批最早的人在最上面，去年才第一次來的在最下面。
//
// 「只來過一次」不是要標成缺點 —— 那是這張表最有資訊量的一格，
// 因為它同時告訴你「他來過」跟「之後就沒有了」。
export default function FirstsTable({ events, roster, onSelect }) {
  const rows = useMemo(() => firsts(events), [events])
  const [onlyOnce, setOnlyOnce] = useState(false)
  const list = onlyOnce ? rows.filter(r => r.onlyOnce) : rows
  const once = rows.filter(r => r.onlyOnce).length

  return (
    <div className="glass p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-[15px] text-dream-ink">第一次，與最近一次</h3>
          <p className="mt-1 text-[13px] text-dream-sub">
            {rows.length} 位聲優，其中 {once} 位只來過一次。依初來台的順序排。
          </p>
        </div>
        <button onClick={() => setOnlyOnce(v => !v)}
          className={`pill shrink-0 ${onlyOnce ? 'ring-1 ring-bloom-violet text-bloom-violet' : ''}`}>
          只看來過一次的
        </button>
      </div>

      <div className="mt-4 -mx-2 overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead>
            <tr className="text-[11px] text-dream-faint text-left">
              <th className="font-medium px-2 pb-2">聲優</th>
              <th className="font-medium px-2 pb-2">第一次</th>
              <th className="font-medium px-2 pb-2">最近一次</th>
              <th className="font-medium px-2 pb-2 text-right">次數</th>
            </tr>
          </thead>
          <tbody>
            {list.map(r => {
              const m = primaryMeta(r.first)
              return (
                <tr key={r.name} className="border-t border-dream-line dark:border-white/10">
                  <td className="px-2 py-2.5">
                    <a href={`#/person/${encodeURIComponent(r.name)}`}
                      className="font-display font-semibold text-dream-ink hover:text-bloom-violet transition-colors">
                      {r.name}
                    </a>
                    {roster?.get?.(r.name)?.band && (
                      <span className="block text-[11px] text-dream-faint">{roster.get(r.name).band}</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 align-top">
                    <button onClick={() => onSelect(r.first.id)} className="text-left group">
                      <span className="block font-round font-bold tabular-nums" style={{ color: m.color }}>
                        {r.first.startDate}
                      </span>
                      <span className="block text-[11px] text-dream-faint truncate max-w-[190px] group-hover:text-dream-sub">
                        {r.first.title}
                      </span>
                    </button>
                  </td>
                  <td className="px-2 py-2.5 align-top">
                    {r.onlyOnce ? (
                      <span className="text-dream-faint">—　<span className="text-[11px]">就這一次</span></span>
                    ) : (
                      <button onClick={() => onSelect(r.last.id)} className="text-left group">
                        <span className="block font-round font-bold tabular-nums text-dream-ink">
                          {r.last.startDate}
                        </span>
                        <span className="block text-[11px] text-dream-faint truncate max-w-[190px] group-hover:text-dream-sub">
                          {r.last.title}
                        </span>
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right align-top">
                    <span className="font-round font-bold tabular-nums text-dream-ink">{r.count}</span>
                    {!r.onlyOnce && (
                      <span className="block text-[11px] text-dream-faint tabular-nums">
                        跨 {Math.round(r.spanDays / 365 * 10) / 10} 年
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!list.length && (
        <p className="mt-6 text-center text-[13px] text-dream-faint">
          <Icon n="user" className="mr-1.5" />沒有符合的人
        </p>
      )}
    </div>
  )
}
