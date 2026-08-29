import { useMemo } from 'react'
import { relationBreakdown, TIERS, CONTEXTS } from '../utils/relation.js'
import Icon from './Icon.jsx'

// 關聯程度的分布。
//
// 這套三層分級（官方本體／強關聯／弱關聯）連同標籤、情境分類、
// 「有幾筆是猜的」都早就寫好了 —— 但站上一個地方都沒顯示，
// 所以「上坂菫來台六次會不會讓 Pastel＊Palettes 虛胖」這個當初做它的理由，
// 到現在還是只能自己在腦裡算。
//
// 「有幾筆是人工確認的」放在最前面，因為那決定下面的數字能不能信。
const TIER_COLOR = {
  official: '#a855f7',
  strong: '#ec4899',
  weak: '#94a3b8',
}

export default function RelationBars({ events }) {
  const b = useMemo(() => relationBreakdown(events), [events])
  if (!b.total) return null

  const tiers = ['official', 'strong', 'weak']
  const max = Math.max(...tiers.map(k => b.counts[k]), 1)
  const ctx = Object.entries(b.contexts).sort((a, c) => c[1] - a[1])
  const ctxMax = Math.max(...ctx.map(([, n]) => n), 1)

  return (
    <div className="glass p-6">
      <h3 className="font-display font-bold text-[16px] text-dream-ink">關聯程度</h3>
      <p className="mt-1 text-[14px] text-dream-sub">
        「本體／擦邊」兩分法不夠用 —— 同一位聲優來台六次，可能一次是邦邦的場、
        一次是別的作品、一次是自己的見面會。全算成擦邊的話，樂團的出現次數會虛胖。
      </p>

      <div className="mt-4 space-y-2.5">
        {tiers.map(k => (
          <div key={k} className="flex items-center gap-3 text-[14px]">
            <span className="w-16 shrink-0 text-dream-sub">{TIERS[k].label}</span>
            <span className="flex-1 h-2.5 rounded-full bg-dream-line dark:bg-white/10 overflow-hidden">
              <span className="block h-full rounded-full"
                style={{ width: `${(b.counts[k] / max) * 100}%`, background: TIER_COLOR[k] }} />
            </span>
            <span className="w-7 text-right font-round font-bold text-dream-ink tabular-nums">
              {b.counts[k]}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-dream-line dark:border-white/10">
        <div className="text-[14px] font-bold text-dream-faint mb-2">是什麼場合</div>
        <div className="space-y-2">
          {ctx.map(([k, n]) => (
            <div key={k} className="flex items-center gap-3 text-[14px]">
              <span className="w-20 shrink-0 text-dream-sub">{CONTEXTS[k] || k}</span>
              <span className="flex-1 h-2 rounded-full bg-dream-line dark:bg-white/10 overflow-hidden">
                <span className="block h-full rounded-full bg-gradient-to-r from-bloom-sky to-bloom-indigo"
                  style={{ width: `${(n / ctxMax) * 100}%` }} />
              </span>
              <span className="w-7 text-right font-round font-bold text-dream-sub tabular-nums">{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 這一行決定上面的數字能不能信，所以不能藏在小字裡 */}
      <p className="mt-5 pt-4 border-t border-dream-line dark:border-white/10 text-[14px]"
        style={{ color: b.confirmed === 0 ? 'rgb(var(--c-urgent))' : undefined }}>
        <Icon n={b.confirmed === 0 ? 'triangle-exclamation' : 'circle-check'} className="text-[10px] mr-1.5" />
        {b.confirmed === 0
          ? `${b.total} 筆全部是程式依規則推的，沒有一筆人工確認過。`
          : `${b.confirmed} / ${b.total} 筆是人工確認的，其餘由規則推。`}
      </p>
    </div>
  )
}
