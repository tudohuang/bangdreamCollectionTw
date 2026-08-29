import { useMemo, useState } from 'react'
import { songIndex } from '../utils/songs.js'
import { primaryMeta } from '../utils/bands.js'
import Icon from './Icon.jsx'

// 曲目總表：在台灣被唱過的每一首歌。
//
// 完全沒有曲目資料的時候，這一頁不會空著唬人 —— 它直說「還沒有人補」，
// 並且講清楚為什麼值得補。那比一張空表格誠實，也比不做這頁有用。
export default function SongsPage({ events, onSelect, onClose }) {
  const songs = useMemo(() => songIndex(events), [events])
  const [q, setQ] = useState('')

  const withSetlist = events.filter(e => (e.setlist || '').trim()).length
  const shown = q
    ? songs.filter(s => s.title.toLowerCase().includes(q.toLowerCase()))
    : songs

  return (
    <section>
      <button onClick={onClose}
        className="hidden sm:inline-flex items-center gap-1.5 text-[14px] text-dream-sub hover:text-dream-ink transition-colors">
        <Icon n="chevron-left" className="text-[11px]" /> 回上一頁
      </button>

      <div className="mt-4">
        <div className="eyebrow"><Icon n="music" className="text-[10px]" /> Setlist</div>
        <h2 className="section-h mt-1.5">在台灣唱過的歌</h2>
      </div>

      {songs.length === 0 ? (
        <div className="mt-6 glass p-7">
          <p className="text-[15px] text-dream-ink leading-relaxed">
            還沒有人補任何一場的曲目。
          </p>
          <p className="mt-3 text-[14px] text-dream-sub leading-relaxed">
            這是這個站唯一別的地方查不到的東西 —— Setlist.fm 沒有台灣的邦邦場次，
            官方也不會整理「這首在台灣唱過幾次」。<br />
            補一場就會開始有東西：哪幾首常唱、哪一首只在某一年唱過、
            安可通常是哪一首。
          </p>
          <p className="mt-4 text-[14px] text-dream-faint">
            記得幾首寫幾首就好，不用湊齊。在 Sheet 的「曲目」欄一行一首。
          </p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-[14px] text-dream-sub">
            {songs.length} 首，來自 {withSetlist} 場有曲目紀錄的場次。
            其中 {songs.filter(s => s.count > 1).length} 首唱過不只一次。
          </p>

          <div className="mt-4 relative">
            <Icon n="magnifying-glass"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] text-dream-faint" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="找一首歌"
              className="w-full rounded-xl border border-dream-line dark:border-white/15 bg-white/70 dark:bg-white/[.04] pl-10 pr-4 py-2.5 text-[15px] text-dream-ink" />
          </div>

          <ol className="mt-5 border-t border-dream-line dark:border-white/10">
            {shown.map((s, i) => {
              const m = primaryMeta(s.events[0])
              return (
                <li key={s.key}
                  className="border-b border-dream-line dark:border-white/10">
                  <a href={`#/song/${encodeURIComponent(s.key)}`}
                    className="group grid grid-cols-[32px_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2.5">
                    <span className="text-right font-round font-bold text-[14px] tabular-nums text-dream-faint">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display font-semibold text-[15px] text-dream-ink group-hover:text-bloom-violet transition-colors">
                        {s.title}
                      </span>
                      <span className="block truncate text-[14px] text-dream-faint">
                        {s.events[0].year}
                        {s.count > 1 && s.events[s.count - 1].year !== s.events[0].year &&
                          `–${s.events[s.count - 1].year}`}
                      </span>
                    </span>
                    <span className="shrink-0 font-round font-bold text-[14px] tabular-nums"
                      style={{ color: s.count > 1 ? m.color : undefined }}>
                      {s.count} 次
                    </span>
                  </a>
                </li>
              )
            })}
          </ol>

          {shown.length === 0 && (
            <p className="mt-6 text-center text-[14px] text-dream-faint">找不到「{q}」</p>
          )}
        </>
      )}
    </section>
  )
}
