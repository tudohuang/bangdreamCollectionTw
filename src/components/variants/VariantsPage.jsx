import { useState } from 'react'
import { loadNotes, saveNotes } from '../../utils/notes.js'
import DexGrid from './DexGrid.jsx'
import EventNotes from './EventNotes.jsx'
import PrepBoard from './PrepBoard.jsx'
import Icon from '../Icon.jsx'

// 三個版本並排比較，選定之後這整個資料夾會拆掉、只留選中的那一版。
//
// 三版的差別不是外觀，是「這個站到底在整理什麼」：
//   A 整理「圖鑑還缺什麼」   —— 補史料
//   B 整理「我在現場看到什麼」 —— 留下只有你寫得出來的東西
//   C 整理「接下來要做什麼」  —— 搶票與行程
//
// 三個都用同一份筆記資料（utils/notes.js），所以可以互相切換不會弄丟東西。

const TABS = [
  ['dex', '圖鑑完成度', '參照 Discogs 的 Collection', 'grid'],
  ['notes', '參戰筆記', '參照 Eventernote 的ノート', 'note-sticky'],
  ['prep', '活動整理', '參照 Eventernote 的チケット手配', 'calendar'],
]

export default function VariantsPage({ events, attended, onSelect }) {
  const [tab, setTab] = useState('dex')
  const [notes, setNotes] = useState(loadNotes)
  const [filter, setFilter] = useState(null)

  const update = (next) => { setNotes(next); saveNotes(next) }
  const current = TABS.find(t => t[0] === tab)

  return (
    <section>
      <div className="mb-5">
        <div className="eyebrow"><Icon n="sliders" className="text-[10px]" /> Variants</div>
        <h2 className="section-h mt-1.5">三個版本</h2>
        <p className="mt-2 text-[14px] text-dream-sub max-w-2xl leading-relaxed">
          同一份資料，三種「這個站在整理什麼」的答案。三個都能直接操作，
          筆記共用同一份儲存，切換不會弄丟東西。選定之後另外兩版會拆掉。
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
        {TABS.map(([key, label, , icon]) => (
          <button key={key} onClick={() => { setTab(key); setFilter(null) }}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
              tab === key ? 'bg-bloom-indigo text-white' : 'border border-dream-line text-dream-sub dark:border-white/15'}`}>
            <Icon n={icon} className="text-[11px]" />{label}
          </button>
        ))}
      </div>

      <p className="text-[12px] text-dream-faint mb-4">{current[2]}</p>

      {tab === 'dex' && (
        <DexGrid events={events} attended={attended} notes={notes}
          filter={filter} onFilter={setFilter} onSelect={onSelect} />
      )}
      {tab === 'notes' && (
        <EventNotes events={events} notes={notes} onChange={update} onSelect={onSelect} />
      )}
      {tab === 'prep' && (
        <PrepBoard events={events} notes={notes} onChange={update} onSelect={onSelect} />
      )}
    </section>
  )
}
