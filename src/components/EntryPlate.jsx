import { bandMeta, rootGroup } from '../utils/bands.js'
import Icon from './Icon.jsx'

// 條目銘牌：一場活動的基本資料，用排版呈現，不用表單零件。
//
// 原本這裡是一個有邊框的方塊，每一列是「圖示 + 標籤 + 值」。
// 那是後台系統的長相 —— 一看就知道是拿來查東西的工具。
// 設定集不是那樣寫的：它把資料排成有節奏的欄位，用細線分隔、
// 標籤縮小拉開字距、數字對齊，讓資料本身變成版面。
//
// 右欄是「這一格在整段歷史裡的位置」——「這裡的第 2 場」「辦過的第 12 場」。
// 那是這站唯一別的地方查不到的東西，所以給它固定的位置，不是附註。

export default function EntryPlate({ rows, color }) {
  const shown = rows.filter(r => r && r.value)
  if (!shown.length) return null

  return (
    <dl className="border-t" style={{ borderColor: `rgba(${color.glow},0.35)` }}>
      {shown.map(r => (
        // 側欄只有 286px，硬排三欄會讓值只剩不到 120px，
        // 「台北大佳河濱公園」就被斷成兩行。兩欄 + 附註換行才讀得順。
        <div key={r.label}
          className="grid grid-cols-[46px_minmax(0,1fr)] gap-x-3 gap-y-0.5 py-2.5 border-b"
          style={{ borderColor: `rgba(${color.glow},0.18)` }}>
          <dt className="pt-[3px] text-[14px] font-bold tracking-[0.14em] text-dream-faint self-start">
            {r.label}
          </dt>
          <dd className="min-w-0 font-display font-semibold text-[16px] leading-snug text-dream-ink">
            {r.value}
          </dd>
          {/* 這一格在歷史裡的位置。手機沒有第三欄，改排到值的下面 */}
          {r.note && (
            <dd className="col-start-2 text-[14px] text-dream-faint tabular-nums">
              {r.note}
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}

// 陣容：像設定集的角色表 —— 聲優、飾演的角色、這是第幾次來。
// 原本是一排圓角標籤，那讀起來像篩選器不像名單。
export function CastList({ people, roster, color, onSelect }) {
  if (!people.length) return null

  return (
    <ul className="border-t" style={{ borderColor: `rgba(${color.glow},0.35)` }}>
      {people.map(p => {
        const info = roster?.get(p.name)
        const band = info?.band ? rootGroup(info.band) : ''
        const m = band ? bandMeta(band) : null
        return (
          <li key={p.name} className="border-b" style={{ borderColor: `rgba(${color.glow},0.18)` }}>
            <a href={`#/person/${encodeURIComponent(p.name)}`}
              onClick={onSelect}
              className="group grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2.5">
              <span className="font-display font-semibold text-[16px] text-dream-ink group-hover:text-bloom-violet transition-colors truncate">
                {p.name}
              </span>

              {/* 飾演的角色。沒有名冊資料的人就留白，不要編 */}
              <span className="hidden sm:block min-w-0 truncate text-[14px]"
                style={{ color: m ? m.color : undefined }}>
                {info?.char ? (
                  <>飾 {info.char}{band && <span className="text-dream-faint"> · {band}</span>}</>
                ) : band ? (
                  <span className="text-dream-faint">{band}</span>
                ) : null}
              </span>

              <span className="shrink-0 text-[14px] font-medium tabular-nums"
                style={{ color: p.isFirst ? color.color : undefined }}>
                {p.isFirst
                  ? '首次'
                  : <span className="text-dream-faint">第 {p.nth} 次</span>}
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

// 樂團列：跟陣容分開，因為「這場關聯到哪些團」與「誰出演」是兩件事
export function BandRow({ groups, onSelect }) {
  if (!groups.length) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3">
      {groups.map(g => {
        const m = bandMeta(g)
        return (
          <a key={g} href={`#/band/${encodeURIComponent(rootGroup(g))}`} onClick={onSelect}
            className="inline-flex items-center gap-1.5 text-[14px] font-medium hover:opacity-75 transition-opacity"
            style={{ color: m.color }}>
            <Icon n={m.icon} className="text-[10px]" />{g}
          </a>
        )
      })}
    </div>
  )
}
