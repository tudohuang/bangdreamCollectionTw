import { useMemo, useState } from 'react'
import { songProfile, songIndex } from '../utils/songs.js'
import { primaryMeta, bandMeta, bandKey, rootGroup } from '../utils/bands.js'
import { hasSongMeta } from '../utils/parseSongs.js'
import Icon from './Icon.jsx'
import EventRow from './EventRow.jsx'
import OfficialLinks from './OfficialLinks.jsx'
import { isLyricSite } from '../utils/links.js'

// 一首歌在台灣的履歷。
//
// 這是這個站唯一別的地方查不到的東西：Setlist.fm 沒有台灣的邦邦場次，
// 官方也不會整理「這首在台灣唱過幾次」。所以這一頁的存在理由很清楚 ——
// 它回答一個只有這裡答得出來的問題。
export default function SongPage({ value, events, songMeta, onSelect, onClose }) {
  const s = useMemo(() => songProfile(events, value), [events, value])
  // 「歌曲」分頁是選填的。沒有它 info 就是 undefined，上半部整塊不出現。
  const info = songMeta?.get?.(s?.key)
  const others = useMemo(
    () => songIndex(events).filter(x => x.key !== s?.key && x.count > 1).slice(0, 10),
    [events, s])

  if (!s) {
    return (
      <section className="glass px-6 py-20 text-center">
        <div className="font-display font-bold text-xl text-dream-ink">找不到這首歌</div>
        <p className="mt-2 text-[14px] text-dream-sub">
          可能是還沒有人補這場的曲目，或歌名寫法不一樣。
        </p>
        <button onClick={onClose} className="btn-primary mt-6">回上一頁</button>
      </section>
    )
  }

  const years = [...new Set(s.events.map(e => e.year).filter(Boolean))].sort()
  const bands = [...new Set(s.events.flatMap(e => (e.relatedGroups || []).map(rootGroup)))]
  const m = primaryMeta(s.first)

  const stats = [
    ['唱過', `${s.count} 場`],
    ['第一次', s.first.year ?? '—'],
    ['開場', s.openers > 0 ? `${s.openers} 次` : '—'],
    ['安可', s.encores > 0 ? `${s.encores} 次` : '—'],
  ]

  return (
    <section>
      <button onClick={onClose}
        className="hidden sm:inline-flex items-center gap-1.5 text-[14px] text-dream-sub hover:text-dream-ink transition-colors">
        <Icon n="chevron-left" className="text-[11px]" /> 回上一頁
      </button>

      <div className="mt-4 flex items-start gap-5">
        {/* 有歌本身的資料時才給封面 —— 沒有的話那只是一塊裝飾 */}
        {hasSongMeta(info) && <SongCover info={info} meta={m} />}
        <div className="min-w-0 flex-1">
          <div className="eyebrow"><Icon n="music" className="text-[10px]" /> Song</div>
          <h2 className="section-h mt-1.5" style={{ color: m.color }}>{s.title}</h2>
          {info?.band && <SongBand name={info.band} />}
          <p className="mt-2 text-[14px] text-dream-sub">
            在台灣唱過 {s.count} 場
            {years.length > 1 && `，橫跨 ${years[0]}–${years[years.length - 1]}`}。
          </p>
          {s.aliases.length > 0 && (
            <p className="mt-1.5 text-[14px] text-dream-faint">
              資料裡也寫作：{s.aliases.join('、')}
            </p>
          )}
        </div>
      </div>

      {/* 這首歌本身是什麼 —— 專輯、發行、詞曲、去哪裡聽。
          全部來自 Sheet 的「歌曲」分頁，沒建那張表整塊就不存在。 */}
      {hasSongMeta(info) && <SongFacts info={info} />}

      <dl className="mt-6 grid grid-cols-4 gap-px rounded-xl overflow-hidden bg-dream-line dark:bg-white/10">
        {stats.map(([k, v]) => (
          <div key={k} className="bg-white px-3 py-3.5 text-center dark:bg-white/[.04]">
            <dd className="font-display font-bold text-[20px] text-dream-ink tabular-nums leading-none">{v}</dd>
            <dt className="text-[14px] text-dream-faint mt-1.5">{k}</dt>
          </div>
        ))}
      </dl>

      {/* 哪幾團唱過這首。雙團場標了團的話這裡才分得出來 —— 
          「春日影 MyGO 唱過 3 次、Ave Mujica 唱過 1 次」是別的地方沒有的。 */}
      {s.bandList.length > 1 && (
        <div className="mt-5 glass p-5">
          <div className="text-[14px] font-bold text-dream-faint mb-2">誰唱的</div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {s.bandList.map(([g, n]) => {
              const bm = bandMeta(g)
              return (
                <a key={g} href={`#/band/${encodeURIComponent(g)}`}
                  className="inline-flex items-baseline gap-1.5 text-[15px] font-medium hover:opacity-75"
                  style={{ color: bm.color }}>
                  <Icon n={bm.icon} className="text-[10px]" />{g}
                  <span className="text-dream-faint text-[14px] tabular-nums">{n} 次</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {bands.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {bands.map(g => {
            const bm = bandMeta(g)
            return (
              <a key={g} href={`#/band/${encodeURIComponent(g)}`}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium hover:opacity-75 transition-opacity"
                style={{ color: bm.color }}>
                <Icon n={bm.icon} className="text-[10px]" />{g}
              </a>
            )
          })}
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-display font-bold text-[16px] text-dream-ink mb-4">唱過的場次</h3>
        <ul className="space-y-2.5">
          {s.events.slice().reverse().map((e, i) => (
            <li key={e.id}>
              <EventRow event={e} onSelect={onSelect}
                right={<span className="font-round font-bold text-[14px] tabular-nums text-dream-faint">
                  第 {s.count - i} 次
                </span>} />
            </li>
          ))}
        </ul>
      </div>

      {s.people.length > 0 && (
        <div className="mt-8 glass p-6">
          <h3 className="font-display font-bold text-[16px] text-dream-ink mb-3">唱過這首的人</h3>
          <div className="flex flex-wrap gap-2">
            {s.people.map(([name, n]) => (
              <a key={name} href={`#/person/${encodeURIComponent(name)}`} className="pill">
                {name}{n > 1 && <span className="text-dream-faint ml-1">×{n}</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-8">
          <h3 className="font-display font-bold text-[16px] text-dream-ink mb-3">唱過不只一次的其他歌</h3>
          <div className="flex flex-wrap gap-2">
            {others.map(o => (
              <a key={o.key} href={`#/song/${encodeURIComponent(o.key)}`} className="pill">
                {o.title} <span className="text-dream-faint">×{o.count}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// 專輯封面。載不出來就退回樂團色的唱片 —— 破圖會讓整頁看起來壞掉，
// 有顏色的唱片至少還是有意的畫面（跟活動封面同一套想法）。
export function SongCover({ info, meta }) {
  const [failed, setFailed] = useState(false)
  const src = info?.cover

  if (!src || failed) {
    return (
      <span aria-hidden
        className="shrink-0 grid place-items-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden"
        style={{ background: `linear-gradient(150deg, rgba(${meta.glow},0.34), rgba(${meta.glow},0.12))` }}>
        <Icon n="compact-disc" className="text-[38px] opacity-70" style={{ color: meta.color }} />
      </span>
    )
  }
  return (
    <img src={src} alt="" loading="lazy" decoding="async"
      onError={() => setFailed(true)}
      className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover"
      style={{ background: `rgba(${meta.glow},0.10)` }} />
  )
}

// 歌本身的資料。一列一項，沒填的不出現 —— 空欄位比沒有那一列還難讀。
export function SongFacts({ info }) {
  const rows = [
    ['專輯', info.album],
    ['發行', info.released],
    ['作詞', info.lyricist],
    ['作曲', info.composer],
    ['編曲', info.arranger],
  ].filter(([, v]) => v)

  if (!rows.length && !info.links.length && !info.note) return null

  return (
    <div className="mt-5 glass p-5">
      {rows.length > 0 && (
        <dl className="flex flex-col divide-y divide-dream-line dark:divide-white/10">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-4 py-2 first:pt-0 last:pb-0">
              <dt className="shrink-0 w-14 text-[14px] font-bold text-dream-faint">{k}</dt>
              <dd className="min-w-0 text-[15px] text-dream-ink">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {info.note && (
        <p className={`text-[15px] leading-7 text-dream-sub whitespace-pre-line ${rows.length ? 'mt-4 pt-4 border-t border-dashed border-dream-line dark:border-white/10' : ''}`}>
          {info.note}
        </p>
      )}

      {/* 兩排分開：歌詞連結混在「去哪裡聽」裡的話，那個標題就在說一件不是真的事。
          站上不放歌詞本文（版權在 Bushiroad 與 JASRAC 底下），只連出去。 */}
      <OfficialLinks links={info.links.filter(u => !isLyricSite(u))} title="去哪裡聽" />
      <OfficialLinks links={info.links.filter(isLyricSite)} title="歌詞" />
    </div>
  )
}

// 原唱團那一行。
//
// 連結用的是「正規化後的團名」不是 Sheet 上原本那串：實際資料裡有
// 「RAISE A SUILEN,Morfonica」這種兩團擠在一格的寫法（歌單的 ▍區塊本來就
// 那樣標），照原樣連出去就是一個「找不到這個團的場次」的死頁。
//
// bandKey 認不出來的（自製曲、外部歌手）就不連，只顯示文字 ——
// 連到「其他」那一頁對使用者沒有任何意義。
export function SongBand({ name }) {
  const meta = bandMeta(name)
  const known = bandKey(name) !== 'other'
  const inner = (
    <>
      <Icon n={meta.icon} className="text-[11px]" />
      {known ? meta.name : name}
    </>
  )
  const cls = 'mt-1 inline-flex items-center gap-1.5 text-[16px] font-medium'

  if (!known) return <span className={`${cls} text-dream-sub`}>{inner}</span>
  return (
    <a href={`#/band/${encodeURIComponent(meta.name)}`}
      className={`${cls} hover:opacity-75`} style={{ color: meta.color }}>
      {inner}
    </a>
  )
}
